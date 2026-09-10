import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/data_events.dart';
import '../../core/models.dart';
import '../../core/management_models.dart';
import '../../core/providers.dart';
import '../../shared/formatters.dart';
import '../../shared/management_widgets.dart';
import '../../shared/widgets.dart';
import 'editor_fields.dart';
import 'booking_editor.dart';
import 'booking_detail.dart';
import 'block_editor.dart';

class AvailabilityPage extends ConsumerStatefulWidget {
  const AvailabilityPage({super.key});
  @override
  ConsumerState<AvailabilityPage> createState() => _AvailabilityPageState();
}

class _AvailabilityPageState extends ConsumerState<AvailabilityPage> {
  late DateTime _day, _month, _arrival, _departure;
  late Future<AvailabilityMonth> _calendar;
  late Future<(PlannerResult, AgendaResult)> _daily;
  Future<PlannerResult>? _stay;
  final _guests = TextEditingController(text: '4');
  bool _searchMode = false;
  String _filter = '';
  final Set<int> _selected = {};
  @override
  void initState() {
    super.initState();
    _day = todayInBogota();
    _month = DateTime(_day.year, _day.month);
    _arrival = _day;
    _departure = _day.add(const Duration(days: 1));
    _calendar = _loadMonth();
    _daily = _loadDay();
  }

  @override
  void dispose() {
    _guests.dispose();
    super.dispose();
  }

  Future<AvailabilityMonth> _loadMonth() =>
      ref.read(apiRepositoryProvider).calendar(monthKey(_month));
  Future<(PlannerResult, AgendaResult)> _loadDay() async {
    final api = ref.read(apiRepositoryProvider);
    final start = isoDate(_day),
        end = isoDate(_day.add(const Duration(days: 1)));
    final planner = api.planner(checkIn: start, checkOut: end, guests: 1);
    final agenda = api.agenda(start, end);
    final results = await Future.wait<Object>([planner, agenda]);
    return (results[0] as PlannerResult, results[1] as AgendaResult);
  }

  Future<void> _refresh() async {
    setState(() {
      _selected.clear();
      _calendar = _loadMonth();
      _daily = _loadDay();
      if (_stay != null) _stay = _loadStay();
    });
    await Future.wait<Object>([_calendar, _daily, ?_stay]);
  }

  Future<PlannerResult> _loadStay() => ref
      .read(apiRepositoryProvider)
      .planner(
        checkIn: isoDate(_arrival),
        checkOut: isoDate(_departure),
        guests: int.tryParse(_guests.text) ?? 1,
      );
  void _consult() {
    if (_departure.difference(_arrival).inDays < 1 ||
        _departure.difference(_arrival).inDays > 31) {
      showMessage(context, 'Selecciona una estadía de 1 a 31 noches.');
      return;
    }
    if ((int.tryParse(_guests.text) ?? 0) < 1) {
      showMessage(context, 'Indica al menos una persona.');
      return;
    }
    setState(() {
      _selected.clear();
      _stay = _loadStay();
    });
  }

  void _newBooking({List<int> ids = const []}) {
    Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute<void>(
        builder: (_) => BookingEditor(
          arrival: _searchMode ? _arrival : _day,
          departure: _searchMode
              ? _departure
              : _day.add(const Duration(days: 1)),
          cabinIds: ids,
          guests: int.tryParse(_guests.text) ?? 1,
        ),
      ),
    );
  }

  void _block(List<PlannerCabin> cabins, {PlannerBlock? existing}) {
    Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute<void>(
        builder: (_) => BlockEditor(
          arrival: _searchMode ? _arrival : _day,
          departure: _searchMode
              ? _departure
              : _day.add(const Duration(days: 1)),
          cabins: cabins,
          existing: existing,
          selected: _selected.toList(),
        ),
      ),
    );
  }

  void _record(int id) => Navigator.of(
    context,
    rootNavigator: true,
  ).push(MaterialPageRoute<void>(builder: (_) => BookingDetail(id)));

  Widget _cabinCard(PlannerCabin cabin, List<PlannerCabin> cabins, bool write) {
    final quotes = cabin.segments
        .expand((s) => s.quotes)
        .map((q) => q.id)
        .toSet();
    final states = cabin.segments.map((s) => s.label).toSet().join(' · ');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  cabin.availableForRange
                      ? Icons.check_circle_outline
                      : Icons.event_busy,
                  color: cabin.availableForRange
                      ? const Color(0xFF047857)
                      : const Color(0xFFB45309),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cabin.name,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text('Hasta ${cabin.maxGuests} personas'),
                    ],
                  ),
                ),
                if (_searchMode && write)
                  Checkbox(
                    value: _selected.contains(cabin.id),
                    onChanged: !cabin.availableForRange
                        ? null
                        : (v) => setState(() {
                            if (v == true) {
                              _selected.add(cabin.id);
                            } else {
                              _selected.remove(cabin.id);
                            }
                          }),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              cabin.availableForRange
                  ? 'Libre durante toda la estadía'
                  : states,
            ),
            if (quotes.isNotEmpty)
              Text(
                '${quotes.length} cotizaciones · no bloquean las fechas',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            Wrap(
              spacing: 8,
              children: [
                TextButton(
                  onPressed: () => _cabinDetails(cabin, cabins, write),
                  child: const Text('Ver detalle'),
                ),
                if (!_searchMode && write && cabin.availableForRange)
                  TextButton(
                    onPressed: () => _newBooking(ids: [cabin.id]),
                    child: const Text('Registrar'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _cabinDetails(
    PlannerCabin cabin,
    List<PlannerCabin> cabins,
    bool write,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheet) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: .6,
        minChildSize: .3,
        maxChildSize: .9,
        builder: (context, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            Text(cabin.name, style: Theme.of(context).textTheme.titleLarge),
            ...cabin.segments.map(
              (segment) => Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${segment.checkIn} → ${segment.checkOut}',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    Text(segment.label),
                    if (segment.reservation != null)
                      ListTile(
                        title: Text(
                          segment.reservation!.leaderName ?? 'Ocupación',
                        ),
                        subtitle: Text(segment.reservation!.statusLabel),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          Navigator.pop(sheet);
                          _record(segment.reservation!.id);
                        },
                      ),
                    ...segment.quotes.map(
                      (quote) => ListTile(
                        title: Text(quote.leaderName ?? 'Cotización'),
                        subtitle: const Text('Cotización vigente'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          Navigator.pop(sheet);
                          _record(quote.id);
                        },
                      ),
                    ),
                    if (segment.block != null)
                      ListTile(
                        title: Text(segment.block!.reason),
                        subtitle: Text(
                          segment.block!.notes ?? 'Bloqueo de disponibilidad',
                        ),
                        trailing: write
                            ? const Icon(Icons.edit_outlined)
                            : null,
                        onTap: !write
                            ? null
                            : () {
                                Navigator.pop(sheet);
                                _block(cabins, existing: segment.block);
                              },
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _monthCalendar(AvailabilityMonth calendar) {
    final offset = DateTime(_month.year, _month.month).weekday - 1;
    return SectionCard(
      padding: const EdgeInsets.all(10),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Mes anterior',
                onPressed: () => _moveMonth(-1),
                icon: const Icon(Icons.chevron_left),
              ),
              Expanded(
                child: Text(
                  DateFormat('MMMM yyyy', 'es_CO').format(_month),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              IconButton(
                tooltip: 'Mes siguiente',
                onPressed: () => _moveMonth(1),
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
          Row(
            children: [
              'L',
              'M',
              'X',
              'J',
              'V',
              'S',
              'D',
            ].map((d) => Expanded(child: Center(child: Text(d)))).toList(),
          ),
          const SizedBox(height: 6),
          LayoutBuilder(
            builder: (context, constraints) => GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: offset + calendar.days.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                mainAxisExtent:
                    (8 +
                            1.2 *
                                (MediaQuery.textScalerOf(context).scale(14) +
                                    MediaQuery.textScalerOf(context).scale(10)))
                        .clamp(52, 240)
                        .toDouble(),
              ),
              itemBuilder: (context, index) {
                if (index < offset) return const SizedBox.shrink();
                final day = calendar.days[index - offset];
                final selected = DateUtils.isSameDay(day.date, _day);
                final color = day.available == 0
                    ? const Color(0xFFB91C1C)
                    : day.available <= 2
                    ? const Color(0xFFB45309)
                    : const Color(0xFF047857);
                return Semantics(
                  button: true,
                  selected: selected,
                  label:
                      '${isoDate(day.date)}, ${day.available} de ${day.total} cabañas libres',
                  child: InkWell(
                    onTap: () => setState(() {
                      _day = day.date;
                      _daily = _loadDay();
                    }),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      margin: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        color: selected
                            ? Theme.of(context).colorScheme.primary
                            : color.withValues(alpha: .06),
                      ),
                      child: ExcludeSemantics(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                '${day.date.day}',
                                maxLines: 1,
                                style: TextStyle(
                                  fontSize: 14,
                                  height: 1.2,
                                  fontWeight: FontWeight.w600,
                                  color: selected ? Colors.white : null,
                                ),
                              ),
                            ),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                '${day.available}',
                                maxLines: 1,
                                style: TextStyle(
                                  fontSize: 10,
                                  height: 1.2,
                                  color: selected ? Colors.white : color,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'El número pequeño indica las cabañas libres.',
            style: TextStyle(fontSize: 12),
          ),
        ],
      ),
    );
  }

  void _moveMonth(int delta) => setState(() {
    _month = DateTime(_month.year, _month.month + delta);
    _day = _month;
    _calendar = _loadMonth();
    _daily = _loadDay();
  });
  String _eventLabel(BookingRecord record) {
    final day = isoDate(_day);
    if (record.status == 'pending') return 'Cotización';
    if (record.checkIn == day) return 'Llegada';
    if (record.checkOut == day) return 'Salida';
    return 'Estadía';
  }

  Widget _dailyContent(PlannerResult planner, AgendaResult agenda, bool write) {
    final day = isoDate(_day);
    final records = agenda.reservations
        .where(
          (r) =>
              r.checkIn.compareTo(day) <= 0 &&
              r.checkOut.compareTo(day) >= 0 &&
              (r.status != 'pending' || r.checkOut != day),
        )
        .where(
          (r) => switch (_filter) {
            'arrivals' => r.status != 'pending' && r.checkIn == day,
            'departures' => r.status != 'pending' && r.checkOut == day,
            'quotes' => r.status == 'pending',
            'blocks' || 'free' => false,
            _ => true,
          },
        )
        .toList();
    final blocks = agenda.blocks.where(
      (b) => b.checkIn.compareTo(day) <= 0 && b.checkOut.compareTo(day) > 0,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children:
              {
                    '': 'Todo',
                    'free': 'Libres',
                    'arrivals': 'Llegadas',
                    'departures': 'Salidas',
                    'quotes': 'Cotizaciones',
                    'blocks': 'Bloqueos',
                  }.entries
                  .map(
                    (e) => ChoiceChip(
                      label: Text(e.value),
                      selected: _filter == e.key,
                      onSelected: (_) => setState(() => _filter = e.key),
                    ),
                  )
                  .toList(),
        ),
        const SizedBox(height: 12),
        if (_filter == '' || _filter == 'free') ...[
          Text(
            'Cabañas · ${planner.summary['available_count'] ?? 0} libres',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          ...planner.cabins
              .where((c) => _filter != 'free' || c.availableForRange)
              .map((c) => _cabinCard(c, planner.cabins, write)),
          const SizedBox(height: 16),
        ],
        if (_filter != 'free') ...[
          Text(
            'Agenda del día',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          ...records.map(
            (r) => Card(
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                leading: Icon(
                  r.status == 'pending'
                      ? Icons.chat_bubble_outline
                      : r.checkOut == day
                      ? Icons.logout
                      : Icons.cabin_outlined,
                ),
                title: Text(r.name),
                subtitle: Text(
                  '${_eventLabel(r)} · ${r.guests} personas\n${r.cabinNames.join(', ')}',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _record(r.id),
              ),
            ),
          ),
          if (_filter == '' || _filter == 'blocks')
            ...blocks.map(
              (b) => Card(
                child: ListTile(
                  leading: const Icon(Icons.lock_outline),
                  title: Text(b.reason),
                  subtitle: Text(
                    b.appliesToAll
                        ? 'Todas las cabañas'
                        : b.cabinNames.join(', '),
                  ),
                  trailing: write ? const Icon(Icons.edit_outlined) : null,
                  onTap: !write
                      ? null
                      : () => _block(planner.cabins, existing: b),
                ),
              ),
            ),
          if (records.isEmpty &&
              !((_filter == '' || _filter == 'blocks') && blocks.isNotEmpty))
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Text('No hay movimientos para este filtro.'),
            ),
        ],
        if (write)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Wrap(
              spacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: _newBooking,
                  icon: const Icon(Icons.add),
                  label: const Text('Nuevo registro'),
                ),
                OutlinedButton.icon(
                  onPressed: () => _block(planner.cabins),
                  icon: const Icon(Icons.lock_outline),
                  label: const Text('Bloquear fechas'),
                ),
              ],
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(dataRevisionProvider, (_, next) {
      _refresh().catchError((Object _) {});
    });
    final write =
        ref.watch(authControllerProvider).value?.user.isStaff ?? false;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: () async {
          try {
            await _refresh();
          } catch (_) {}
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Disponibilidad',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ),
                IconButton(
                  tooltip: 'Buscar registros',
                  icon: const Icon(Icons.manage_search),
                  onPressed: () => context.push('/availability/records'),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text('Las fechas y movimientos, a un toque.'),
            const SizedBox(height: 14),
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(
                  value: false,
                  icon: Icon(Icons.calendar_month),
                  label: Text('Agenda'),
                ),
                ButtonSegment(
                  value: true,
                  icon: Icon(Icons.search),
                  label: Text('Consultar'),
                ),
              ],
              selected: {_searchMode},
              onSelectionChanged: (v) => setState(() => _searchMode = v.first),
            ),
            const SizedBox(height: 14),
            if (!_searchMode) ...[
              FutureBuilder<AvailabilityMonth>(
                future: _calendar,
                builder: (context, s) {
                  if (s.connectionState != ConnectionState.done) {
                    return const LinearProgressIndicator();
                  }
                  if (s.hasError) {
                    return LoadingError(
                      s.error!,
                      () => setState(() {
                        _calendar = _loadMonth();
                      }),
                    );
                  }
                  return _monthCalendar(s.requireData);
                },
              ),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      DateFormat('EEEE d MMM', 'es_CO').format(_day),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  TextButton(
                    onPressed: () => setState(() {
                      _day = todayInBogota();
                      _month = DateTime(_day.year, _day.month);
                      _calendar = _loadMonth();
                      _daily = _loadDay();
                    }),
                    child: const Text('Hoy'),
                  ),
                ],
              ),
              FutureBuilder<(PlannerResult, AgendaResult)>(
                future: _daily,
                builder: (context, s) {
                  if (s.connectionState != ConnectionState.done) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(),
                      ),
                    );
                  }
                  if (s.hasError) {
                    return LoadingError(
                      s.error!,
                      () => setState(() {
                        _daily = _loadDay();
                      }),
                    );
                  }
                  return _dailyContent(
                    s.requireData.$1,
                    s.requireData.$2,
                    write,
                  );
                },
              ),
            ] else ...[
              SectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    StayDates(
                      arrival: _arrival,
                      departure: _departure,
                      onChanged: (a, d) => setState(() {
                        _arrival = a;
                        _departure = d;
                        _stay = null;
                        _selected.clear();
                      }),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _guests,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Personas'),
                      onChanged: (_) => setState(() {
                        _stay = null;
                        _selected.clear();
                      }),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: _consult,
                      icon: const Icon(Icons.search),
                      label: const Text('Consultar estadía'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (_stay == null)
                const Padding(
                  padding: EdgeInsets.all(12),
                  child: Text(
                    'Elige llegada, salida y personas para ver las opciones.',
                  ),
                )
              else
                FutureBuilder<PlannerResult>(
                  future: _stay,
                  builder: (context, s) {
                    if (s.connectionState != ConnectionState.done) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (s.hasError) return LoadingError(s.error!, _consult);
                    final planner = s.requireData;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          '${planner.summary['available_count'] ?? 0} cabañas libres · ${planner.summary['available_capacity'] ?? 0} personas',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (planner.suggestions.isNotEmpty)
                          ExpansionTile(
                            tilePadding: EdgeInsets.zero,
                            title: const Text('Opciones para tu grupo'),
                            children: planner.suggestions
                                .map(
                                  (s) => ListTile(
                                    title: Text(s.names.join(' + ')),
                                    subtitle: Text(
                                      'Capacidad: ${s.capacity} personas',
                                    ),
                                    trailing: write
                                        ? const Icon(Icons.add_task)
                                        : null,
                                    onTap: !write
                                        ? null
                                        : () => setState(() {
                                            _selected
                                              ..clear()
                                              ..addAll(s.cabinIds);
                                          }),
                                  ),
                                )
                                .toList(),
                          ),
                        ...planner.cabins.map(
                          (c) => _cabinCard(c, planner.cabins, write),
                        ),
                        if (write)
                          OutlinedButton.icon(
                            onPressed: () => _block(planner.cabins),
                            icon: const Icon(Icons.lock_outline),
                            label: const Text('Bloquear fechas'),
                          ),
                      ],
                    );
                  },
                ),
            ],
          ],
        ),
      ),
      bottomNavigationBar: !write || !_searchMode || _selected.isEmpty
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: FilledButton.icon(
                onPressed: () => _newBooking(ids: _selected.toList()),
                icon: const Icon(Icons.add_task),
                label: Text('Registrar · ${_selected.length} cabañas'),
              ),
            ),
    );
  }
}
