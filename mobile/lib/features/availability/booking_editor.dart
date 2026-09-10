import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/data_events.dart';
import '../../core/models.dart';
import '../../core/management_models.dart';
import '../../core/providers.dart';
import '../../shared/formatters.dart';
import '../../shared/management_widgets.dart';
import '../../shared/widgets.dart';
import 'editor_fields.dart';

/// Only edited fields are sent for an existing booking. In particular, opening
/// and saving a quote must never implicitly renew it or change its lifecycle.
JsonMap bookingChanges(JsonMap original, JsonMap edited) => {
  for (final entry in edited.entries)
    if ((original[entry.key] ?? '') != (entry.value ?? ''))
      entry.key: entry.value,
};

class BookingEditor extends ConsumerStatefulWidget {
  const BookingEditor({
    super.key,
    required this.arrival,
    required this.departure,
    this.cabinIds = const [],
    this.guests = 1,
    this.id,
  });
  final DateTime arrival, departure;
  final List<int> cabinIds;
  final int guests;
  final int? id;
  @override
  ConsumerState<BookingEditor> createState() => _BookingEditorState();
}

class _BookingEditorState extends ConsumerState<BookingEditor> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController(),
      _phone = TextEditingController(),
      _whatsapp = TextEditingController();
  final _guests = TextEditingController(),
      _notes = TextEditingController(),
      _price = TextEditingController();
  late DateTime _arrival, _departure;
  late Set<int> _selected;
  JsonMap _original = {};
  PlannerResult? _planner;
  String _status = 'pending', _source = 'whatsapp';
  bool _loading = true, _checking = false, _saving = false, _checked = false;
  String? _error;
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    _arrival = widget.arrival;
    _departure = widget.departure;
    _selected = widget.cabinIds.toSet();
    _guests.text = widget.guests.toString();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _whatsapp, _guests, _notes, _price]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      if (widget.id != null) {
        _original = await ref
            .read(apiRepositoryProvider)
            .detail('/admin/reservations/${widget.id}');
        if (!mounted) return;
        final record = BookingRecord.fromJson(_original);
        _arrival = DateTime.parse(record.checkIn);
        _departure = DateTime.parse(record.checkOut);
        _selected = record.cabinIds.toSet();
        _status = record.status;
        _name.text = record.name;
        _guests.text = record.guests.toString();
        _phone.text = _original['leader_phone']?.toString() ?? '';
        _whatsapp.text = _original['leader_whatsapp']?.toString() ?? '';
        _notes.text = _original['notes']?.toString() ?? '';
        _price.text = _original['total_price']?.toString() ?? '';
        _source = _original['source']?.toString() ?? 'other';
      }
      if (mounted) setState(() => _loading = false);
      await _check();
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = errorMessage(e);
        });
      }
    }
  }

  Future<void> _check() async {
    final generation = ++_generation;
    if (_departure.difference(_arrival).inDays < 1 ||
        _departure.difference(_arrival).inDays > 31) {
      setState(() {
        _checked = false;
        _checking = false;
        _error = 'Selecciona entre 1 y 31 noches.';
      });
      return;
    }
    setState(() {
      _checking = true;
      _checked = false;
    });
    try {
      final planner = await ref
          .read(apiRepositoryProvider)
          .planner(
            checkIn: isoDate(_arrival),
            checkOut: isoDate(_departure),
            guests: int.tryParse(_guests.text) ?? 1,
            excludeReservationId: widget.id,
          );
      if (mounted && generation == _generation) {
        setState(() {
          _planner = planner;
          _checked = true;
        });
      }
    } catch (error) {
      if (mounted && generation == _generation) {
        setState(() => _error = errorMessage(error));
      }
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _checking = false);
      }
    }
  }

  Future<void> _save() async {
    if (_saving || !_form.currentState!.validate()) return;
    if (_selected.isEmpty) {
      setState(() => _error = 'Selecciona al menos una cabaña.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    await _check();
    if (!mounted) return;
    if (!_checked) {
      setState(() => _saving = false);
      return;
    }
    final conflicts = _planner!.cabins
        .where((c) => _selected.contains(c.id) && !c.availableForRange)
        .toList();
    if (conflicts.isNotEmpty &&
        const ['confirmed', 'checked_in'].contains(_status)) {
      setState(() {
        _saving = false;
        _error =
            '${conflicts.map((c) => c.name).join(', ')} ya no está disponible para estas fechas.';
      });
      return;
    }
    String? textValue(String key, TextEditingController controller) {
      if (widget.id != null &&
          controller.text == (_original[key]?.toString() ?? '')) {
        return _original[key]?.toString();
      }
      return controller.text.trim().isEmpty ? null : controller.text.trim();
    }

    final edited = <String, dynamic>{
      'leader_name': textValue('leader_name', _name),
      'leader_phone': textValue('leader_phone', _phone),
      'leader_whatsapp': textValue('leader_whatsapp', _whatsapp),
      'guests_count': int.parse(_guests.text),
      'check_in': isoDate(_arrival),
      'check_out': isoDate(_departure),
      'notes': textValue('notes', _notes),
      'status': _status,
      'source':
          widget.id != null &&
              _source == (_original['source']?.toString() ?? 'whatsapp')
          ? _original['source']
          : _source,
    };
    // An untouched formatted amount stays untouched, preserving server precision.
    if (_price.text != (_original['total_price']?.toString() ?? '')) {
      edited['total_price'] = _price.text.trim().isEmpty
          ? null
          : double.parse(_price.text.replaceAll(',', '.'));
    }
    final payload = widget.id == null
        ? edited
        : bookingChanges(_original, edited);
    final originalIds = BookingRecord.fromJson(_original).cabinIds.toSet();
    if (widget.id == null ||
        originalIds.length != _selected.length ||
        !originalIds.containsAll(_selected)) {
      payload['cabin_ids'] = _selected.toList();
    }
    if (widget.id == null && _status == 'pending') {
      payload['expires_at'] = DateTime.now()
          .add(const Duration(hours: 48))
          .toUtc()
          .toIso8601String();
    }
    try {
      final api = ref.read(apiRepositoryProvider);
      if (widget.id == null) {
        await api.createReservation(payload);
      } else if (payload.isNotEmpty) {
        await api.updateReservation(widget.id!, payload);
      }
      ref.read(dataRevisionProvider.notifier).changed();
      if (mounted) {
        showMessage(context, 'Registro guardado.');
        Navigator.pop(context);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = errorMessage(error));
        await _check();
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canWrite =
        ref.watch(authControllerProvider).value?.user.isStaff ?? false;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.id == null ? 'Nuevo registro' : 'Editar registro'),
      ),
      body: !canWrite
          ? const Center(child: Text('Tu acceso es de solo lectura.'))
          : _loading
          ? const Center(child: CircularProgressIndicator())
          : widget.id != null && _original.isEmpty
          ? LoadingError(_error ?? 'No se pudo cargar.', () {
              setState(() => _loading = true);
              _load();
            })
          : Form(
              key: _form,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (widget.id == null) ...[
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'pending',
                          label: Text('Cotización'),
                        ),
                        ButtonSegment(
                          value: 'confirmed',
                          label: Text('Ocupación'),
                        ),
                      ],
                      selected: {_status},
                      onSelectionChanged: _saving
                          ? null
                          : (v) => setState(() => _status = v.first),
                    ),
                    const SizedBox(height: 16),
                  ] else
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(
                        'Estado: ${_original['status_label'] ?? _status}',
                      ),
                    ),
                  TextFormField(
                    controller: _name,
                    enabled: !_saving,
                    decoration: const InputDecoration(
                      labelText: 'Turista o grupo *',
                    ),
                    textCapitalization: TextCapitalization.words,
                    validator: requiredText,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phone,
                    enabled: !_saving,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Celular'),
                    validator: phoneError,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _whatsapp,
                    enabled: !_saving,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'WhatsApp (si es diferente)',
                    ),
                    validator: phoneError,
                  ),
                  const SizedBox(height: 12),
                  StayDates(
                    arrival: _arrival,
                    departure: _departure,
                    enabled: !_saving,
                    onChanged: (a, d) {
                      setState(() {
                        _arrival = a;
                        _departure = d;
                        _error = null;
                      });
                      _check();
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _guests,
                    enabled: !_saving,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Personas *'),
                    validator: positiveNumber,
                    onChanged: (_) {
                      ++_generation;
                      setState(() {
                        _checked = false;
                        _checking = false;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Cabañas',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (_checking) const LinearProgressIndicator(),
                  if (!_checked && !_checking)
                    TextButton(
                      onPressed: _check,
                      child: const Text('Comprobar disponibilidad'),
                    ),
                  ...?_planner?.cabins.map(
                    (cabin) => CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(cabin.name),
                      subtitle: Text(
                        '${cabin.maxGuests} personas · ${cabin.availableForRange ? 'Libre' : 'Con ocupación o bloqueo'}',
                      ),
                      value: _selected.contains(cabin.id),
                      onChanged:
                          _saving ||
                              _checking ||
                              !_checked ||
                              (!cabin.availableForRange &&
                                  !_selected.contains(cabin.id))
                          ? null
                          : (v) => setState(() {
                              if (v == true) {
                                _selected.add(cabin.id);
                              } else {
                                _selected.remove(cabin.id);
                              }
                            }),
                    ),
                  ),
                  if (_selected
                      .difference(
                        _planner?.cabins.map((c) => c.id).toSet() ?? {},
                      )
                      .isNotEmpty)
                    const Text(
                      'El registro incluye cabañas históricas que ya no están en el catálogo. Se conservarán al guardar.',
                    ),
                  if (_status == 'pending')
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'Una cotización no bloquea las fechas. La renovación se realiza desde su detalle.',
                      ),
                    ),
                  ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    title: const Text('Datos adicionales'),
                    children: [
                      DropdownButtonFormField<String>(
                        initialValue: _source,
                        decoration: const InputDecoration(labelText: 'Origen'),
                        items:
                            {
                                  'whatsapp': 'WhatsApp',
                                  'phone': 'Llamada',
                                  'walk_in': 'Presencial',
                                  'web': 'Web',
                                  'social_media': 'Redes sociales',
                                  'referral': 'Recomendación',
                                  'other': 'Otro',
                                  if (!const [
                                    'whatsapp',
                                    'phone',
                                    'walk_in',
                                    'web',
                                    'social_media',
                                    'referral',
                                    'other',
                                  ].contains(_source))
                                    _source: _source,
                                }.entries
                                .map(
                                  (e) => DropdownMenuItem(
                                    value: e.key,
                                    child: Text(e.value),
                                  ),
                                )
                                .toList(),
                        onChanged: _saving
                            ? null
                            : (v) => setState(() => _source = v!),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _price,
                        enabled: !_saving,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Valor acordado (COP)',
                        ),
                        validator: (v) =>
                            v == null ||
                                v.trim().isEmpty ||
                                (double.tryParse(v.replaceAll(',', '.')) ??
                                        -1) >=
                                    0
                            ? null
                            : 'Indica un valor válido.',
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _notes,
                        enabled: !_saving,
                        minLines: 2,
                        maxLines: 5,
                        decoration: const InputDecoration(labelText: 'Notas'),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        _error!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _saving || _checking ? null : _save,
                    child: Text(_saving ? 'Guardando…' : 'Guardar registro'),
                  ),
                ],
              ),
            ),
    );
  }
}
