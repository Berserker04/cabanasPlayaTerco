import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models.dart';
import '../../core/providers.dart';
import '../../shared/formatters.dart';
import '../../shared/widgets.dart';

class AvailabilityPage extends ConsumerStatefulWidget {
  const AvailabilityPage({super.key});

  @override
  ConsumerState<AvailabilityPage> createState() => _AvailabilityPageState();
}

class _AvailabilityPageState extends ConsumerState<AvailabilityPage> {
  late DateTime _checkIn;
  late DateTime _checkOut;
  late Future<PlannerResult> _future;
  PlannerResult? _planner;
  final _guests = TextEditingController(text: '6');
  final Set<int> _selectedCabins = {};

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _checkIn = DateTime(now.year, now.month, now.day);
    _checkOut = _checkIn.add(const Duration(days: 14));
    _future = _load();
  }

  @override
  void dispose() {
    _guests.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Disponibilidad',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Consulta el rango, revisa cada cabana y registra lo acordado por WhatsApp.',
                      ),
                    ],
                  ),
                ),
                IconButton.filledTonal(
                  tooltip: 'Crear bloqueo',
                  onPressed: _planner == null ? null : () => _showBlockSheet(),
                  icon: const Icon(Icons.lock_outline),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _DateSearchCard(
              checkIn: _checkIn,
              checkOut: _checkOut,
              guestsController: _guests,
              onPickCheckIn: () => _pickDate(isCheckIn: true),
              onPickCheckOut: () => _pickDate(isCheckIn: false),
              onSearch: _consult,
            ),
            const SizedBox(height: 12),
            FutureBuilder<PlannerResult>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(36),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }
                if (snapshot.hasError) {
                  return EmptyState(
                    icon: Icons.cloud_off,
                    title: 'No se pudo consultar',
                    message: errorMessage(snapshot.error!),
                  );
                }
                final planner = snapshot.requireData;
                if (planner.cabins.isEmpty) {
                  return const EmptyState(
                    icon: Icons.cabin_outlined,
                    title: 'Sin cabanas',
                    message: 'No hay cabanas configuradas para mostrar.',
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _SummaryRow(summary: planner.summary),
                    const SizedBox(height: 12),
                    if (planner.suggestions.isNotEmpty) ...[
                      _SuggestionsCard(
                        suggestions: planner.suggestions,
                        onUse: _useSuggestion,
                      ),
                      const SizedBox(height: 12),
                    ],
                    _AvailabilityMatrix(
                      planner: planner,
                      selectedCabins: _selectedCabins,
                      onToggleCabin: _toggleCabin,
                      onCellTap: _showDetails,
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
      bottomNavigationBar: _selectedCabins.isEmpty
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: FilledButton.icon(
                onPressed: _showRecordSheet,
                icon: const Icon(Icons.add_task),
                label: Text(
                  'Registrar · ${_selectedCabins.length} ${_selectedCabins.length == 1 ? 'cabana' : 'cabanas'}',
                ),
              ),
            ),
    );
  }

  Future<PlannerResult> _load() async {
    final result = await ref
        .read(apiRepositoryProvider)
        .planner(
          checkIn: isoDate(_checkIn),
          checkOut: isoDate(_checkOut),
          guests: int.tryParse(_guests.text) ?? 1,
        );
    if (mounted) {
      setState(() => _planner = result);
    } else {
      _planner = result;
    }
    return result;
  }

  void _consult() {
    final nights = _checkOut.difference(_checkIn).inDays;
    if (nights < 1) {
      _showMessage('La salida debe ser posterior a la llegada.');
      return;
    }
    if (nights > 31) {
      _showMessage('El rango maximo es de 31 dias.');
      return;
    }
    if ((int.tryParse(_guests.text) ?? 0) < 1) {
      _showMessage('Indica al menos una persona.');
      return;
    }
    _refresh();
  }

  void _refresh({String? announcement}) {
    if (!mounted) return;
    setState(() {
      _selectedCabins.clear();
      _planner = null;
      _future = _load();
    });
    if (announcement != null) _showMessage(announcement);
  }

  Future<void> _pickDate({required bool isCheckIn}) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isCheckIn ? _checkIn : _checkOut,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime(DateTime.now().year + 5),
      helpText: isCheckIn ? 'Seleccionar llegada' : 'Seleccionar salida',
    );
    if (picked == null) return;
    setState(() {
      if (isCheckIn) {
        _checkIn = picked;
        if (!_checkOut.isAfter(_checkIn)) {
          _checkOut = _checkIn.add(const Duration(days: 1));
        }
      } else {
        _checkOut = picked.isAfter(_checkIn)
            ? picked
            : _checkIn.add(const Duration(days: 1));
      }
    });
  }

  void _toggleCabin(PlannerCabin cabin) {
    if (!cabin.availableForRange) {
      _showMessage('${cabin.name} no esta libre durante todo el rango.');
      return;
    }
    final hasQuotes = cabin.segments.any(
      (segment) => segment.quotes.isNotEmpty,
    );
    setState(() {
      if (_selectedCabins.contains(cabin.id)) {
        _selectedCabins.remove(cabin.id);
      } else {
        _selectedCabins.add(cabin.id);
      }
    });
    if (hasQuotes && _selectedCabins.contains(cabin.id)) {
      _showMessage(
        '${cabin.name} tiene cotizaciones, pero continua disponible.',
      );
    }
  }

  void _useSuggestion(PlannerSuggestion suggestion) {
    setState(() {
      _selectedCabins
        ..clear()
        ..addAll(suggestion.cabinIds);
    });
  }

  Future<void> _showDetails(PlannerCabin cabin, PlannerSegment segment) async {
    if (segment.isAvailable && segment.quotes.isEmpty) {
      _toggleCabin(cabin);
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => _DetailsSheet(
        cabin: cabin,
        segment: segment,
        onEditReservation: (reservation) async {
          Navigator.pop(sheetContext);
          await _showRecordSheet(existing: reservation);
        },
        onConfirmQuote: (reservation) => _updateFromDetails(
          sheetContext,
          reservation,
          {'status': 'confirmed'},
          'Ocupacion confirmada.',
        ),
        onRenewQuote: (reservation) =>
            _updateFromDetails(sheetContext, reservation, {
              'status': 'pending',
              'expires_at': DateTime.now()
                  .add(const Duration(hours: 48))
                  .toUtc()
                  .toIso8601String(),
            }, 'Cotizacion renovada por 48 horas.'),
        onCancelReservation: (reservation) async {
          final confirmed = await _confirm(
            title: 'Cancelar registro',
            message:
                'La cabana volvera a quedar disponible si era una ocupacion activa.',
          );
          if (!confirmed) return;
          if (!sheetContext.mounted) return;
          await _updateFromDetails(sheetContext, reservation, {
            'status': 'cancelled',
          }, 'Registro cancelado.');
        },
        onEditBlock: (block) async {
          Navigator.pop(sheetContext);
          await _showBlockSheet(existing: block);
        },
        onDeleteBlock: (block) async {
          final confirmed = await _confirm(
            title: 'Eliminar bloqueo',
            message: 'Las fechas quedaran disponibles de inmediato.',
          );
          if (!confirmed) return;
          try {
            await ref.read(apiRepositoryProvider).deleteBlock(block.id);
            _refresh(announcement: 'Bloqueo eliminado.');
            if (sheetContext.mounted) Navigator.pop(sheetContext);
          } catch (error) {
            _showMessage(errorMessage(error));
          }
        },
      ),
    );
  }

  Future<void> _updateFromDetails(
    BuildContext sheetContext,
    PlannerReservation reservation,
    JsonMap payload,
    String successMessage,
  ) async {
    final error = await _saveReservation(
      reservation,
      payload,
      successMessage: successMessage,
    );
    if (error == null && sheetContext.mounted) Navigator.pop(sheetContext);
    if (error != null) _showMessage(error);
  }

  Future<void> _showRecordSheet({PlannerReservation? existing}) async {
    final planner = _planner;
    if (planner == null) return;
    await showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) => _RecordSheet(
        cabins: planner.cabins,
        initialCabinIds: existing?.cabinIds.isNotEmpty == true
            ? existing!.cabinIds.toSet()
            : _selectedCabins,
        initialCheckIn: existing?.checkIn.isNotEmpty == true
            ? DateTime.parse(existing!.checkIn)
            : _checkIn,
        initialCheckOut: existing?.checkOut.isNotEmpty == true
            ? DateTime.parse(existing!.checkOut)
            : _checkOut,
        initialGuests:
            existing?.guestsCount ?? (int.tryParse(_guests.text) ?? 1),
        existing: existing,
        onSave: (payload) => _saveReservation(
          existing,
          payload,
          successMessage: existing == null
              ? 'Registro guardado.'
              : 'Registro actualizado.',
        ),
      ),
    );
  }

  Future<String?> _saveReservation(
    PlannerReservation? existing,
    JsonMap payload, {
    required String successMessage,
  }) async {
    try {
      final repository = ref.read(apiRepositoryProvider);
      if (existing == null) {
        await repository.createReservation(payload);
      } else {
        await repository.updateReservation(existing.id, payload);
      }
      _refresh(announcement: successMessage);
      return null;
    } catch (error) {
      return errorMessage(error);
    }
  }

  Future<void> _showBlockSheet({PlannerBlock? existing}) async {
    final planner = _planner;
    if (planner == null) return;
    await showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) => _BlockSheet(
        cabins: planner.cabins,
        initialCabinIds: existing?.cabinIds.isNotEmpty == true
            ? existing!.cabinIds.toSet()
            : _selectedCabins,
        initialCheckIn: existing?.checkIn.isNotEmpty == true
            ? DateTime.parse(existing!.checkIn)
            : _checkIn,
        initialCheckOut: existing?.checkOut.isNotEmpty == true
            ? DateTime.parse(existing!.checkOut)
            : _checkOut,
        existing: existing,
        onSave: (payload) async {
          try {
            final repository = ref.read(apiRepositoryProvider);
            if (existing == null) {
              await repository.createBlock(payload);
            } else {
              await repository.updateBlock(existing.id, payload);
            }
            _refresh(
              announcement: existing == null
                  ? 'Bloqueo creado.'
                  : 'Bloqueo actualizado.',
            );
            return null;
          } catch (error) {
            return errorMessage(error);
          }
        },
      ),
    );
  }

  Future<bool> _confirm({
    required String title,
    required String message,
  }) async {
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(title),
            content: Text(message),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Volver'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Continuar'),
              ),
            ],
          ),
        ) ??
        false;
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
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
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Consultar rango',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _DateButton(
                  label: 'Llegada',
                  value: isoDate(checkIn),
                  onTap: onPickCheckIn,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _DateButton(
                  label: 'Salida',
                  value: isoDate(checkOut),
                  onTap: onPickCheckOut,
                ),
              ),
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
              FilledButton.icon(
                onPressed: onSearch,
                icon: const Icon(Icons.search),
                label: const Text('Consultar'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${checkOut.difference(checkIn).inDays} noches · maximo 31 dias',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _DateButton extends StatelessWidget {
  const _DateButton({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          children: [
            Text(label, style: Theme.of(context).textTheme.labelSmall),
            Text(value),
          ],
        ),
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
      (
        'Libres',
        asInt(summary['available_count']),
        const Color(0xFF047857),
        Icons.check_circle_outline,
      ),
      (
        'Cotizadas',
        asInt(summary['quoted_count']),
        const Color(0xFF7C3AED),
        Icons.chat_bubble_outline,
      ),
      (
        'Ocupadas',
        asInt(summary['reserved_count']),
        const Color(0xFFB91C1C),
        Icons.bed_outlined,
      ),
      (
        'Bloq.',
        asInt(summary['blocked_count']) + asInt(summary['maintenance_count']),
        const Color(0xFFC2410C),
        Icons.lock_outline,
      ),
      (
        'Cap.',
        asInt(summary['available_capacity']),
        const Color(0xFF1D4ED8),
        Icons.groups_outlined,
      ),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: items
          .map(
            (item) => Chip(
              avatar: Icon(item.$4, size: 18, color: item.$3),
              label: Text('${item.$1} ${item.$2}'),
              side: BorderSide(color: item.$3.withValues(alpha: 0.25)),
            ),
          )
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
          Text(
            'Combinaciones sugeridas',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: suggestions
                .take(3)
                .map(
                  (suggestion) => ActionChip(
                    avatar: const Icon(Icons.auto_awesome, size: 18),
                    label: Text(
                      '${suggestion.names.join(', ')} · ${suggestion.capacity} cupos',
                    ),
                    onPressed: () => onUse(suggestion),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _AvailabilityMatrix extends StatelessWidget {
  const _AvailabilityMatrix({
    required this.planner,
    required this.selectedCabins,
    required this.onToggleCabin,
    required this.onCellTap,
  });

  final PlannerResult planner;
  final Set<int> selectedCabins;
  final ValueChanged<PlannerCabin> onToggleCabin;
  final void Function(PlannerCabin cabin, PlannerSegment segment) onCellTap;

  static const _labelWidth = 126.0;
  static const _dayWidth = 78.0;
  static const _rowHeight = 68.0;

  @override
  Widget build(BuildContext context) {
    final start = DateTime.parse(planner.checkIn);
    final end = DateTime.parse(planner.checkOut);
    final days = List.generate(
      end.difference(start).inDays,
      (index) => start.add(Duration(days: index)),
    );
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Matriz por dias',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 3),
                const Text(
                  'Desliza los dias; la columna de cabanas permanece fija.',
                ),
                const SizedBox(height: 10),
                const Wrap(
                  spacing: 12,
                  runSpacing: 6,
                  children: [
                    _Legend(
                      color: Color(0xFF059669),
                      icon: Icons.check,
                      label: 'Libre',
                    ),
                    _Legend(
                      color: Color(0xFF7C3AED),
                      icon: Icons.chat_bubble_outline,
                      label: 'Cotizada',
                    ),
                    _Legend(
                      color: Color(0xFFDC2626),
                      icon: Icons.bed_outlined,
                      label: 'Ocupada',
                    ),
                    _Legend(
                      color: Color(0xFFD97706),
                      icon: Icons.lock_outline,
                      label: 'Bloqueo',
                    ),
                    _Legend(
                      color: Color(0xFF6B7280),
                      icon: Icons.remove_circle_outline,
                      label: 'Inactiva',
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: _labelWidth,
                child: Column(
                  children: [
                    const _MatrixCorner(height: _rowHeight),
                    ...planner.cabins.map(
                      (cabin) => _CabinLabel(
                        cabin: cabin,
                        height: _rowHeight,
                        selected: selectedCabins.contains(cabin.id),
                        onTap: () => onToggleCabin(cabin),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SizedBox(
                    width: days.length * _dayWidth,
                    child: Column(
                      children: [
                        SizedBox(
                          height: _rowHeight,
                          child: Row(
                            children: days
                                .map(
                                  (day) =>
                                      _DayHeader(day: day, width: _dayWidth),
                                )
                                .toList(),
                          ),
                        ),
                        ...planner.cabins.map(
                          (cabin) => SizedBox(
                            height: _rowHeight,
                            child: Row(
                              children: days.map((day) {
                                final segment = _segmentForDay(
                                  cabin.segments,
                                  day,
                                );
                                return _DayCell(
                                  width: _dayWidth,
                                  cabin: cabin,
                                  day: day,
                                  segment: segment,
                                  onTap: segment == null
                                      ? null
                                      : () => onCellTap(cabin, segment),
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  PlannerSegment? _segmentForDay(List<PlannerSegment> segments, DateTime day) {
    for (final segment in segments) {
      final start = DateTime.parse(segment.checkIn);
      final end = DateTime.parse(segment.checkOut);
      if (!day.isBefore(start) && day.isBefore(end)) return segment;
    }
    return null;
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.icon, required this.label});

  final Color color;
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 3),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}

class _MatrixCorner extends StatelessWidget {
  const _MatrixCorner({required this.height});
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: const Text(
        'Cabana',
        style: TextStyle(fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _CabinLabel extends StatelessWidget {
  const _CabinLabel({
    required this.cabin,
    required this.height,
    required this.selected,
    required this.onTap,
  });
  final PlannerCabin cabin;
  final double height;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      enabled: cabin.availableForRange,
      label:
          '${cabin.name}, ${cabin.availableForRange ? 'libre en todo el rango' : 'no disponible en todo el rango'}',
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: selected
                ? Theme.of(context).colorScheme.primaryContainer
                : Theme.of(context).colorScheme.surface,
            border: Border(
              bottom: BorderSide(color: Theme.of(context).dividerColor),
            ),
          ),
          child: Row(
            children: [
              Icon(
                selected
                    ? Icons.check_box
                    : cabin.availableForRange
                    ? Icons.check_box_outline_blank
                    : Icons.indeterminate_check_box_outlined,
                size: 20,
                color: cabin.availableForRange
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).disabledColor,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      cabin.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      'Max. ${cabin.maxGuests}',
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DayHeader extends StatelessWidget {
  const _DayHeader({required this.day, required this.width});
  final DateTime day;
  final double width;

  @override
  Widget build(BuildContext context) {
    const weekdays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    return Container(
      width: width,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        border: Border(
          left: BorderSide(color: Theme.of(context).dividerColor),
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            weekdays[day.weekday - 1],
            style: Theme.of(context).textTheme.labelSmall,
          ),
          Text(
            '${day.day}/${day.month}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.width,
    required this.cabin,
    required this.day,
    required this.segment,
    required this.onTap,
  });
  final double width;
  final PlannerCabin cabin;
  final DateTime day;
  final PlannerSegment? segment;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final state = segment?.state ?? 'inactive';
    final quotes = segment?.quotes.length ?? 0;
    final color = toneColor(segment?.tone ?? 'gray');
    final (icon, shortLabel) = switch (state) {
      'reserved' => (Icons.bed_outlined, 'Ocup.'),
      'blocked' => (Icons.lock_outline, 'Bloq.'),
      'maintenance' => (Icons.build_outlined, 'Mant.'),
      'inactive' => (Icons.remove_circle_outline, 'Inact.'),
      _ => (Icons.check, 'Libre'),
    };
    return Semantics(
      button: true,
      label:
          '${cabin.name}, ${isoDate(day)}, ${segment?.label ?? 'Sin datos'}${quotes > 0 ? ', $quotes cotizaciones' : ''}',
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: width,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.10),
            border: Border(
              left: BorderSide(color: Theme.of(context).dividerColor),
              bottom: BorderSide(color: Theme.of(context).dividerColor),
            ),
          ),
          child: Stack(
            children: [
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 18, color: color),
                    Text(
                      shortLabel,
                      style: TextStyle(
                        fontSize: 11,
                        color: color,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              if (quotes > 0)
                Positioned(
                  right: 4,
                  top: 4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 5,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF7C3AED),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$quotes',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailsSheet extends StatelessWidget {
  const _DetailsSheet({
    required this.cabin,
    required this.segment,
    required this.onEditReservation,
    required this.onConfirmQuote,
    required this.onRenewQuote,
    required this.onCancelReservation,
    required this.onEditBlock,
    required this.onDeleteBlock,
  });

  final PlannerCabin cabin;
  final PlannerSegment segment;
  final Future<void> Function(PlannerReservation) onEditReservation;
  final Future<void> Function(PlannerReservation) onConfirmQuote;
  final Future<void> Function(PlannerReservation) onRenewQuote;
  final Future<void> Function(PlannerReservation) onCancelReservation;
  final Future<void> Function(PlannerBlock) onEditBlock;
  final Future<void> Function(PlannerBlock) onDeleteBlock;

  @override
  Widget build(BuildContext context) {
    final reservation = segment.reservation;
    final block = segment.block;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.72,
      maxChildSize: 0.94,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        children: [
          Text(cabin.name, style: Theme.of(context).textTheme.headlineSmall),
          Text('${segment.checkIn} a ${segment.checkOut} · ${segment.label}'),
          if (reservation != null) ...[
            const SizedBox(height: 16),
            _DetailCard(
              icon: Icons.bed_outlined,
              title: reservation.leaderName ?? 'Ocupacion confirmada',
              subtitle:
                  '${reservation.guestsCount} personas · ${reservation.statusLabel}',
              notes: reservation.notes,
              actions: [
                TextButton.icon(
                  onPressed: () => onEditReservation(reservation),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Editar'),
                ),
                TextButton.icon(
                  onPressed: () => onCancelReservation(reservation),
                  icon: const Icon(Icons.cancel_outlined),
                  label: const Text('Cancelar'),
                ),
              ],
            ),
          ],
          if (segment.quotes.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'Cotizaciones vigentes (${segment.quotes.length})',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            ...segment.quotes.map(
              (quote) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _DetailCard(
                  icon: Icons.chat_bubble_outline,
                  title: quote.leaderName ?? 'Cotizacion sin nombre',
                  subtitle:
                      '${quote.guestsCount} personas${quote.expiresAt == null ? '' : ' · vigente por 48 h'}',
                  notes: quote.notes,
                  actions: [
                    TextButton(
                      onPressed: () => onEditReservation(quote),
                      child: const Text('Editar'),
                    ),
                    TextButton(
                      onPressed: () => onRenewQuote(quote),
                      child: const Text('Renovar'),
                    ),
                    TextButton(
                      onPressed: () => onCancelReservation(quote),
                      child: const Text('Cancelar'),
                    ),
                    FilledButton.tonal(
                      onPressed: () => onConfirmQuote(quote),
                      child: const Text('Confirmar'),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (block != null) ...[
            const SizedBox(height: 16),
            _DetailCard(
              icon: Icons.lock_outline,
              title: block.reason,
              subtitle: block.appliesToAll
                  ? 'Todas las cabanas'
                  : block.cabinNames.join(', '),
              notes: block.notes,
              actions: [
                TextButton.icon(
                  onPressed: () => onEditBlock(block),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Editar'),
                ),
                TextButton.icon(
                  onPressed: () => onDeleteBlock(block),
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Eliminar'),
                ),
              ],
            ),
          ],
          if (reservation == null &&
              segment.quotes.isEmpty &&
              block == null) ...[
            const SizedBox(height: 24),
            EmptyState(
              icon: Icons.info_outline,
              title: segment.label,
              message: 'No hay acciones disponibles para este estado.',
            ),
          ],
        ],
      ),
    );
  }
}

class _DetailCard extends StatelessWidget {
  const _DetailCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.notes,
    required this.actions,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final String? notes;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          Text(subtitle),
          if (notes?.isNotEmpty == true) ...[
            const SizedBox(height: 5),
            Text(notes!, style: Theme.of(context).textTheme.bodySmall),
          ],
          const SizedBox(height: 8),
          Wrap(spacing: 4, runSpacing: 4, children: actions),
        ],
      ),
    );
  }
}

class _RecordSheet extends StatefulWidget {
  const _RecordSheet({
    required this.cabins,
    required this.initialCabinIds,
    required this.initialCheckIn,
    required this.initialCheckOut,
    required this.initialGuests,
    required this.existing,
    required this.onSave,
  });
  final List<PlannerCabin> cabins;
  final Set<int> initialCabinIds;
  final DateTime initialCheckIn;
  final DateTime initialCheckOut;
  final int initialGuests;
  final PlannerReservation? existing;
  final Future<String?> Function(JsonMap) onSave;

  @override
  State<_RecordSheet> createState() => _RecordSheetState();
}

class _RecordSheetState extends State<_RecordSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _leader;
  late final TextEditingController _guests;
  late final TextEditingController _notes;
  late Set<int> _cabinIds;
  late DateTime _checkIn;
  late DateTime _checkOut;
  late String _status;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _leader = TextEditingController(text: widget.existing?.leaderName ?? '');
    _guests = TextEditingController(text: widget.initialGuests.toString());
    _notes = TextEditingController(text: widget.existing?.notes ?? '');
    _cabinIds = {...widget.initialCabinIds};
    _checkIn = widget.initialCheckIn;
    _checkOut = widget.initialCheckOut;
    _status =
        widget.existing?.status == 'confirmed' ||
            widget.existing?.status == 'checked_in'
        ? 'confirmed'
        : 'pending';
  }

  @override
  void dispose() {
    _leader.dispose();
    _guests.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.existing == null
                    ? 'Registrar en disponibilidad'
                    : 'Editar registro',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 4),
              const Text(
                'Guarda aqui lo acordado con el turista por WhatsApp.',
              ),
              const SizedBox(height: 16),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                    value: 'pending',
                    icon: Icon(Icons.chat_bubble_outline),
                    label: Text('Cotizacion'),
                  ),
                  ButtonSegment(
                    value: 'confirmed',
                    icon: Icon(Icons.bed_outlined),
                    label: Text('Ocupacion'),
                  ),
                ],
                selected: {_status},
                onSelectionChanged: (value) =>
                    setState(() => _status = value.first),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _leader,
                decoration: const InputDecoration(
                  labelText: 'Turista o grupo *',
                ),
                textInputAction: TextInputAction.next,
                validator: (value) =>
                    value?.trim().isEmpty == true ? 'Escribe un nombre.' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _guests,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Numero de personas *',
                ),
                validator: (value) => (int.tryParse(value ?? '') ?? 0) < 1
                    ? 'Indica al menos una persona.'
                    : null,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _DateButton(
                      label: 'Llegada',
                      value: isoDate(_checkIn),
                      onTap: () => _pickDate(true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _DateButton(
                      label: 'Salida',
                      value: isoDate(_checkOut),
                      onTap: () => _pickDate(false),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text('Cabanas *', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 6),
              ...widget.cabins.map(
                (cabin) => CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  value: _cabinIds.contains(cabin.id),
                  title: Text(cabin.name),
                  subtitle: Text(
                    cabin.availableForRange
                        ? 'Libre en el rango consultado'
                        : 'No libre en todo el rango',
                  ),
                  onChanged:
                      cabin.availableForRange || _cabinIds.contains(cabin.id)
                      ? (checked) => setState(() {
                          if (checked == true) {
                            _cabinIds.add(cabin.id);
                          } else {
                            _cabinIds.remove(cabin.id);
                          }
                        })
                      : null,
                ),
              ),
              if (_status == 'pending')
                const ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.schedule),
                  title: Text('Vigencia: 48 horas'),
                  subtitle: Text(
                    'No bloquea la cabana y se ocultara al vencer.',
                  ),
                ),
              TextFormField(
                controller: _notes,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Notas opcionales',
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_outlined),
                label: Text(_saving ? 'Guardando...' : 'Guardar registro'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickDate(bool isCheckIn) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isCheckIn ? _checkIn : _checkOut,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime(DateTime.now().year + 5),
    );
    if (picked == null) return;
    setState(() {
      if (isCheckIn) {
        _checkIn = picked;
        if (!_checkOut.isAfter(picked)) {
          _checkOut = picked.add(const Duration(days: 1));
        }
      } else {
        _checkOut = picked.isAfter(_checkIn)
            ? picked
            : _checkIn.add(const Duration(days: 1));
      }
    });
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_formKey.currentState!.validate()) return;
    if (_cabinIds.isEmpty) {
      setState(() => _error = 'Selecciona al menos una cabana.');
      return;
    }
    if (!_checkOut.isAfter(_checkIn)) {
      setState(() => _error = 'La salida debe ser posterior a la llegada.');
      return;
    }
    setState(() => _saving = true);
    final error = await widget.onSave({
      'cabin_ids': _cabinIds.toList(),
      'check_in': isoDate(_checkIn),
      'check_out': isoDate(_checkOut),
      'guests_count': int.parse(_guests.text),
      'leader_name': _leader.text.trim(),
      'status': _status,
      'source': 'whatsapp',
      'expires_at': _status == 'pending'
          ? DateTime.now()
                .add(const Duration(hours: 48))
                .toUtc()
                .toIso8601String()
          : null,
      if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
    });
    if (!mounted) return;
    setState(() {
      _saving = false;
      _error = error;
    });
    if (error == null) Navigator.pop(context);
  }
}

class _BlockSheet extends StatefulWidget {
  const _BlockSheet({
    required this.cabins,
    required this.initialCabinIds,
    required this.initialCheckIn,
    required this.initialCheckOut,
    required this.existing,
    required this.onSave,
  });
  final List<PlannerCabin> cabins;
  final Set<int> initialCabinIds;
  final DateTime initialCheckIn;
  final DateTime initialCheckOut;
  final PlannerBlock? existing;
  final Future<String?> Function(JsonMap) onSave;

  @override
  State<_BlockSheet> createState() => _BlockSheetState();
}

class _BlockSheetState extends State<_BlockSheet> {
  late final TextEditingController _reason;
  late final TextEditingController _notes;
  late Set<int> _cabinIds;
  late DateTime _checkIn;
  late DateTime _checkOut;
  late bool _all;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _reason = TextEditingController(text: widget.existing?.reason ?? '');
    _notes = TextEditingController(text: widget.existing?.notes ?? '');
    _cabinIds = {...widget.initialCabinIds};
    _checkIn = widget.initialCheckIn;
    _checkOut = widget.initialCheckOut;
    _all = widget.existing?.appliesToAll ?? false;
  }

  @override
  void dispose() {
    _reason.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.existing == null ? 'Crear bloqueo' : 'Editar bloqueo',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 4),
            const Text(
              'Para mantenimiento, eventos privados o cierres generales.',
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _reason,
              decoration: const InputDecoration(labelText: 'Motivo *'),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _DateButton(
                    label: 'Desde',
                    value: isoDate(_checkIn),
                    onTap: () => _pickDate(true),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _DateButton(
                    label: 'Hasta',
                    value: isoDate(_checkOut),
                    onTap: () => _pickDate(false),
                  ),
                ),
              ],
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _all,
              onChanged: (value) => setState(() => _all = value),
              title: const Text('Aplicar a todas las cabanas'),
            ),
            if (!_all) ...[
              Text('Cabanas', style: Theme.of(context).textTheme.titleSmall),
              ...widget.cabins.map(
                (cabin) => CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  value: _cabinIds.contains(cabin.id),
                  title: Text(cabin.name),
                  onChanged: (checked) => setState(() {
                    if (checked == true) {
                      _cabinIds.add(cabin.id);
                    } else {
                      _cabinIds.remove(cabin.id);
                    }
                  }),
                ),
              ),
            ],
            TextField(
              controller: _notes,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Notas opcionales'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _saving ? null : _submit,
              icon: _saving
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.lock_outline),
              label: Text(_saving ? 'Guardando...' : 'Guardar bloqueo'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickDate(bool isCheckIn) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isCheckIn ? _checkIn : _checkOut,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime(DateTime.now().year + 5),
    );
    if (picked == null) return;
    setState(() {
      if (isCheckIn) {
        _checkIn = picked;
        if (!_checkOut.isAfter(picked)) {
          _checkOut = picked.add(const Duration(days: 1));
        }
      } else {
        _checkOut = picked.isAfter(_checkIn)
            ? picked
            : _checkIn.add(const Duration(days: 1));
      }
    });
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (_reason.text.trim().isEmpty) {
      setState(() => _error = 'Indica el motivo del bloqueo.');
      return;
    }
    if (!_all && _cabinIds.isEmpty) {
      setState(
        () => _error = 'Selecciona cabanas o activa el bloqueo general.',
      );
      return;
    }
    setState(() => _saving = true);
    final error = await widget.onSave({
      'check_in': isoDate(_checkIn),
      'check_out': isoDate(_checkOut),
      'reason': _reason.text.trim(),
      'applies_to_all': _all,
      'cabin_ids': _all ? <int>[] : _cabinIds.toList(),
      if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
    });
    if (!mounted) return;
    setState(() {
      _saving = false;
      _error = error;
    });
    if (error == null) Navigator.pop(context);
  }
}
