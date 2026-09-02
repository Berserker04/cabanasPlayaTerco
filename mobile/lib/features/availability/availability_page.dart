import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models.dart';
import '../../core/providers.dart';
import '../../shared/formatters.dart';
import '../../shared/widgets.dart';

final staffOptionsProvider = FutureProvider.autoDispose((ref) {
  return ref.watch(apiRepositoryProvider).staffOptions();
});

class AvailabilityPage extends ConsumerStatefulWidget {
  const AvailabilityPage({super.key});

  @override
  ConsumerState<AvailabilityPage> createState() => _AvailabilityPageState();
}

class _AvailabilityPageState extends ConsumerState<AvailabilityPage> {
  late DateTime _checkIn;
  late DateTime _checkOut;
  late Future<PlannerResult> _future;
  final _guests = TextEditingController(text: '6');
  final _leaderName = TextEditingController();
  final _totalPrice = TextEditingController();
  final _notes = TextEditingController();
  final _blockReason = TextEditingController();
  final Set<int> _selectedCabins = {};
  String _status = 'pending';
  int? _assignedTo;
  bool _blockAll = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _checkIn = DateTime(now.year, now.month, now.day);
    _checkOut = _checkIn.add(const Duration(days: 1));
    _future = _load();
  }

  @override
  void dispose() {
    _guests.dispose();
    _leaderName.dispose();
    _totalPrice.dispose();
    _notes.dispose();
    _blockReason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final staff = ref.watch(staffOptionsProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Disponibilidad avanzada', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        _DateSearchCard(
          checkIn: _checkIn,
          checkOut: _checkOut,
          guestsController: _guests,
          onPickCheckIn: () => _pickDate(isCheckIn: true),
          onPickCheckOut: () => _pickDate(isCheckIn: false),
          onSearch: _refresh,
        ),
        const SizedBox(height: 12),
        FutureBuilder<PlannerResult>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
            }
            if (snapshot.hasError) {
              return EmptyState(icon: Icons.cloud_off, title: 'No se pudo consultar', message: errorMessage(snapshot.error!));
            }

            final planner = snapshot.requireData;
            if (planner.cabins.isEmpty) {
              return const EmptyState(icon: Icons.cabin_outlined, title: 'Sin cabanas', message: 'No hay cabanas configuradas para el mapa.');
            }

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _SummaryRow(summary: planner.summary),
                const SizedBox(height: 12),
                if (planner.suggestions.isNotEmpty) _SuggestionsCard(suggestions: planner.suggestions, onUse: _useSuggestion),
                const SizedBox(height: 12),
                ...planner.cabins.map(
                  (cabin) => _CabinPlannerCard(
                    cabin: cabin,
                    selected: _selectedCabins.contains(cabin.id),
                    onToggle: _toggleCabin,
                  ),
                ),
                const SizedBox(height: 12),
                _ReservationForm(
                  selectedCount: _selectedCabins.length,
                  leaderName: _leaderName,
                  totalPrice: _totalPrice,
                  notes: _notes,
                  status: _status,
                  onStatusChanged: (value) => setState(() => _status = value),
                  assignedTo: _assignedTo,
                  staff: staff.value ?? const [],
                  onAssignedChanged: (value) => setState(() => _assignedTo = value),
                  onSubmit: _createReservation,
                ),
                const SizedBox(height: 12),
                _BlockForm(
                  selectedCount: _selectedCabins.length,
                  reason: _blockReason,
                  blockAll: _blockAll,
                  onBlockAllChanged: (value) => setState(() => _blockAll = value),
                  onSubmit: _createBlock,
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  Future<PlannerResult> _load() {
    return ref.read(apiRepositoryProvider).planner(
          checkIn: isoDate(_checkIn),
          checkOut: isoDate(_checkOut),
          guests: int.tryParse(_guests.text) ?? 1,
        );
  }

  void _refresh() {
    setState(() {
      _selectedCabins.clear();
      _future = _load();
    });
  }

  Future<void> _pickDate({required bool isCheckIn}) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isCheckIn ? _checkIn : _checkOut,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime(DateTime.now().year + 5),
    );
    if (picked == null) return;
    setState(() {
      if (isCheckIn) {
        _checkIn = picked;
        if (!_checkOut.isAfter(_checkIn)) {
          _checkOut = _checkIn.add(const Duration(days: 1));
        }
      } else {
        _checkOut = picked.isAfter(_checkIn) ? picked : _checkIn.add(const Duration(days: 1));
      }
      _future = _load();
    });
  }

  void _toggleCabin(PlannerCabin cabin) {
    if (!cabin.availableForRange) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${cabin.name} no esta disponible para todo el rango.')));
      return;
    }
    setState(() {
      if (_selectedCabins.contains(cabin.id)) {
        _selectedCabins.remove(cabin.id);
      } else {
        _selectedCabins.add(cabin.id);
      }
    });
  }

  void _useSuggestion(PlannerSuggestion suggestion) {
    setState(() {
      _selectedCabins
        ..clear()
        ..addAll(suggestion.cabinIds);
    });
  }

  Future<void> _createReservation() async {
    if (_selectedCabins.isEmpty) {
      _showMessage('Selecciona al menos una cabana disponible.');
      return;
    }

    try {
      await ref.read(apiRepositoryProvider).createReservation({
        'cabin_ids': _selectedCabins.toList(),
        'check_in': isoDate(_checkIn),
        'check_out': isoDate(_checkOut),
        'guests_count': int.tryParse(_guests.text) ?? 1,
        'leader_name': _leaderName.text.trim(),
        'status': _status,
        'source': 'mobile',
        if (_assignedTo != null) 'assigned_to': _assignedTo,
        if (_totalPrice.text.trim().isNotEmpty) 'total_price': double.tryParse(_totalPrice.text.trim()) ?? 0,
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
      });
      _leaderName.clear();
      _totalPrice.clear();
      _notes.clear();
      _showMessage('Cotizacion/reserva guardada.');
      _refresh();
    } catch (error) {
      _showMessage(errorMessage(error));
    }
  }

  Future<void> _createBlock() async {
    if (!_blockAll && _selectedCabins.isEmpty) {
      _showMessage('Selecciona cabanas o activa bloqueo general.');
      return;
    }
    if (_blockReason.text.trim().isEmpty) {
      _showMessage('Indica la razon del bloqueo.');
      return;
    }

    try {
      await ref.read(apiRepositoryProvider).createBlock({
        'check_in': isoDate(_checkIn),
        'check_out': isoDate(_checkOut),
        'reason': _blockReason.text.trim(),
        'applies_to_all': _blockAll,
        if (!_blockAll) 'cabin_ids': _selectedCabins.toList(),
      });
      _blockReason.clear();
      _showMessage('Bloqueo creado.');
      _refresh();
    } catch (error) {
      _showMessage(errorMessage(error));
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _DateSearchCard extends StatelessWidget {
  const _DateSearchCard({
    required this.checkIn,
    required this.checkOut,
    required this.guestsController,
    required this.onPickCheckIn,
    required this.onPickCheckOut,
    required this.onSearch,
  });

  final DateTime checkIn;
  final DateTime checkOut;
  final TextEditingController guestsController;
  final VoidCallback onPickCheckIn;
  final VoidCallback onPickCheckOut;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _DateButton(label: 'Llegada', value: isoDate(checkIn), onTap: onPickCheckIn)),
              const SizedBox(width: 8),
              Expanded(child: _DateButton(label: 'Salida', value: isoDate(checkOut), onTap: onPickCheckOut)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: guestsController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Personas'),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.icon(onPressed: onSearch, icon: const Icon(Icons.search), label: const Text('Buscar')),
            ],
          ),
        ],
      ),
    );
  }
}

class _DateButton extends StatelessWidget {
  const _DateButton({required this.label, required this.value, required this.onTap});

  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      child: Column(
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          Text(value),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.summary});

  final JsonMap summary;

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Libres', asInt(summary['available_count']), const Color(0xFF059669)),
      ('Cotizadas', asInt(summary['quoted_count']), const Color(0xFFDC2626)),
      ('Reservadas', asInt(summary['reserved_count']), const Color(0xFFB91C1C)),
      ('Bloq.', asInt(summary['blocked_count']), const Color(0xFFD97706)),
      ('Cap.', asInt(summary['available_capacity']), const Color(0xFF2563EB)),
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: items
          .map((item) => Chip(
                avatar: CircleAvatar(backgroundColor: item.$3, child: Text('${item.$2}', style: const TextStyle(fontSize: 11, color: Colors.white))),
                label: Text(item.$1),
              ))
          .toList(),
    );
  }
}

class _SuggestionsCard extends StatelessWidget {
  const _SuggestionsCard({required this.suggestions, required this.onUse});

  final List<PlannerSuggestion> suggestions;
  final ValueChanged<PlannerSuggestion> onUse;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sugerencias', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ...suggestions.take(3).map(
                (suggestion) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(suggestion.names.join(', ')),
                  subtitle: Text('Capacidad ${suggestion.capacity}, sobra ${suggestion.capacityExtra}'),
                  trailing: IconButton(
                    tooltip: 'Usar sugerencia',
                    onPressed: () => onUse(suggestion),
                    icon: const Icon(Icons.check_circle_outline),
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _CabinPlannerCard extends StatelessWidget {
  const _CabinPlannerCard({required this.cabin, required this.selected, required this.onToggle});

  final PlannerCabin cabin;
  final bool selected;
  final ValueChanged<PlannerCabin> onToggle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: SectionCard(
        child: InkWell(
          onTap: () => onToggle(cabin),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(cabin.availableForRange ? Icons.check_circle : Icons.block, color: cabin.availableForRange ? const Color(0xFF059669) : const Color(0xFFDC2626)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(cabin.name, style: Theme.of(context).textTheme.titleMedium)),
                  Text('Max ${cabin.maxGuests}'),
                  Checkbox(value: selected, onChanged: cabin.availableForRange ? (_) => onToggle(cabin) : null),
                ],
              ),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: cabin.segments.map((segment) => _SegmentChip(segment: segment)).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SegmentChip extends StatelessWidget {
  const _SegmentChip({required this.segment});

  final PlannerSegment segment;

  @override
  Widget build(BuildContext context) {
    final color = toneColor(segment.tone);
    final owner = segment.reservation?.leaderName;
    return Container(
      constraints: const BoxConstraints(minHeight: 34),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        '${segment.checkIn} -> ${segment.checkOut} · ${owner ?? segment.label}',
        style: TextStyle(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _ReservationForm extends StatelessWidget {
  const _ReservationForm({
    required this.selectedCount,
    required this.leaderName,
    required this.totalPrice,
    required this.notes,
    required this.status,
    required this.onStatusChanged,
    required this.assignedTo,
    required this.staff,
    required this.onAssignedChanged,
    required this.onSubmit,
  });

  final int selectedCount;
  final TextEditingController leaderName;
  final TextEditingController totalPrice;
  final TextEditingController notes;
  final String status;
  final ValueChanged<String> onStatusChanged;
  final int? assignedTo;
  final List<StaffOption> staff;
  final ValueChanged<int?> onAssignedChanged;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Nueva cotizacion/reserva ($selectedCount seleccionadas)', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 10),
          TextField(controller: leaderName, decoration: const InputDecoration(labelText: 'Lider del grupo')),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: status,
                  decoration: const InputDecoration(labelText: 'Estado'),
                  items: const [
                    DropdownMenuItem(value: 'pending', child: Text('Cotizada')),
                    DropdownMenuItem(value: 'confirmed', child: Text('Confirmada')),
                  ],
                  onChanged: (value) => onStatusChanged(value ?? 'pending'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: totalPrice,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Valor'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<int?>(
            initialValue: assignedTo,
            decoration: const InputDecoration(labelText: 'Encargado'),
            items: [
              const DropdownMenuItem<int?>(value: null, child: Text('Sin asignar')),
              ...staff.map((item) => DropdownMenuItem<int?>(value: item.id, child: Text(item.fullName))),
            ],
            onChanged: onAssignedChanged,
          ),
          const SizedBox(height: 10),
          TextField(controller: notes, minLines: 2, maxLines: 3, decoration: const InputDecoration(labelText: 'Notas')),
          const SizedBox(height: 12),
          FilledButton.icon(onPressed: onSubmit, icon: const Icon(Icons.save_outlined), label: const Text('Guardar')),
        ],
      ),
    );
  }
}

class _BlockForm extends StatelessWidget {
  const _BlockForm({
    required this.selectedCount,
    required this.reason,
    required this.blockAll,
    required this.onBlockAllChanged,
    required this.onSubmit,
  });

  final int selectedCount;
  final TextEditingController reason;
  final bool blockAll;
  final ValueChanged<bool> onBlockAllChanged;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Bloquear fechas', style: Theme.of(context).textTheme.titleMedium),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: blockAll,
            onChanged: onBlockAllChanged,
            title: const Text('Aplicar a todas las cabanas'),
            subtitle: Text(blockAll ? 'Bloqueo general' : '$selectedCount cabanas seleccionadas'),
          ),
          TextField(controller: reason, decoration: const InputDecoration(labelText: 'Razon')),
          const SizedBox(height: 12),
          OutlinedButton.icon(onPressed: onSubmit, icon: const Icon(Icons.lock_outline), label: const Text('Crear bloqueo')),
        ],
      ),
    );
  }
}
