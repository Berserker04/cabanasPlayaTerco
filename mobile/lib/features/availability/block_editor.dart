import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/data_events.dart';
import '../../core/models.dart';
import '../../core/providers.dart';
import '../../shared/formatters.dart';
import '../../shared/management_widgets.dart';
import '../../shared/widgets.dart';
import 'editor_fields.dart';

class BlockEditor extends ConsumerStatefulWidget {
  const BlockEditor({
    super.key,
    required this.arrival,
    required this.departure,
    required this.cabins,
    this.existing,
    this.selected = const [],
  });
  final DateTime arrival, departure;
  final List<PlannerCabin> cabins;
  final PlannerBlock? existing;
  final List<int> selected;
  @override
  ConsumerState<BlockEditor> createState() => _BlockEditorState();
}

class _BlockEditorState extends ConsumerState<BlockEditor> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _reason, _notes;
  late DateTime _arrival, _departure;
  late Set<int> _selected;
  bool _all = false, _saving = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    final block = widget.existing;
    _arrival = block == null ? widget.arrival : DateTime.parse(block.checkIn);
    _departure = block == null
        ? widget.departure
        : DateTime.parse(block.checkOut);
    _selected = (block?.cabinIds ?? widget.selected).toSet();
    _all = block?.appliesToAll ?? false;
    _reason = TextEditingController(text: block?.reason ?? '');
    _notes = TextEditingController(text: block?.notes ?? '');
  }

  @override
  void dispose() {
    _reason.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save({bool delete = false}) async {
    if (!delete && !_form.currentState!.validate()) return;
    if (!delete && !_departure.isAfter(_arrival)) {
      setState(() => _error = 'La salida debe ser posterior a la llegada.');
      return;
    }
    if (!delete && !_all && _selected.isEmpty) {
      setState(() => _error = 'Selecciona una cabaña o aplica a todas.');
      return;
    }
    if (delete &&
        !await confirmAction(
          context,
          'Eliminar bloqueo',
          'Las fechas volverán a quedar disponibles si no tienen otra ocupación.',
        )) {
      return;
    }
    if (!mounted) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = ref.read(apiRepositoryProvider);
      final payload = <String, dynamic>{
        'check_in': isoDate(_arrival),
        'check_out': isoDate(_departure),
        'reason': _reason.text.trim(),
        'notes': _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        'applies_to_all': _all,
        'cabin_ids': _all ? <int>[] : _selected.toList(),
      };
      if (delete) {
        await api.deleteBlock(widget.existing!.id);
      } else if (widget.existing == null) {
        await api.createBlock(payload);
      } else {
        await api.updateBlock(widget.existing!.id, payload);
      }
      ref.read(dataRevisionProvider.notifier).changed();
      if (mounted) {
        showMessage(
          context,
          delete ? 'Bloqueo eliminado.' : 'Bloqueo guardado.',
        );
        Navigator.pop(context);
      }
    } catch (error) {
      if (mounted) setState(() => _error = errorMessage(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.existing == null ? 'Crear bloqueo' : 'Editar bloqueo'),
    ),
    body: ref.watch(authControllerProvider).value?.user.isStaff != true
        ? const Center(child: Text('Tu acceso es de solo lectura.'))
        : Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextFormField(
                  controller: _reason,
                  enabled: !_saving,
                  validator: requiredText,
                  decoration: const InputDecoration(
                    labelText: 'Motivo del bloqueo *',
                  ),
                ),
                const SizedBox(height: 16),
                StayDates(
                  arrival: _arrival,
                  departure: _departure,
                  enabled: !_saving,
                  onChanged: (a, d) => setState(() {
                    _arrival = a;
                    _departure = d;
                  }),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Todas las cabañas'),
                  value: _all,
                  onChanged: _saving ? null : (v) => setState(() => _all = v),
                ),
                if (!_all)
                  ...widget.cabins.map(
                    (c) => CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(c.name),
                      value: _selected.contains(c.id),
                      onChanged: _saving
                          ? null
                          : (v) => setState(() {
                              if (v == true) {
                                _selected.add(c.id);
                              } else {
                                _selected.remove(c.id);
                              }
                            }),
                    ),
                  ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _notes,
                  enabled: !_saving,
                  minLines: 2,
                  maxLines: 5,
                  decoration: const InputDecoration(labelText: 'Notas'),
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
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Guardando…' : 'Guardar bloqueo'),
                ),
                if (widget.existing != null)
                  TextButton(
                    onPressed: _saving ? null : () => _save(delete: true),
                    child: const Text('Eliminar bloqueo'),
                  ),
              ],
            ),
          ),
  );
}
