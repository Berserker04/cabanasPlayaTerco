import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/data_events.dart';
import '../../core/management_models.dart';
import '../../core/models.dart';
import '../../core/providers.dart';
import '../../shared/management_widgets.dart';
import '../../shared/widgets.dart';
import 'booking_editor.dart';

class BookingDetail extends ConsumerStatefulWidget {
  const BookingDetail(this.id, {super.key});
  final int id;
  @override
  ConsumerState<BookingDetail> createState() => _BookingDetailState();
}

class _BookingDetailState extends ConsumerState<BookingDetail> {
  late Future<BookingRecord> _future;
  bool _saving = false;
  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<BookingRecord> _load() async => BookingRecord.fromJson(
    await ref
        .read(apiRepositoryProvider)
        .detail('/admin/reservations/${widget.id}'),
  );
  Future<void> _change(JsonMap payload, String title) async {
    if (!await confirmAction(
      context,
      title,
      'El calendario se actualizará con este cambio.',
    )) {
      return;
    }
    if (!mounted) return;
    setState(() => _saving = true);
    try {
      await ref
          .read(apiRepositoryProvider)
          .updateReservation(widget.id, payload);
      ref.read(dataRevisionProvider.notifier).changed();
      if (mounted) {
        setState(() {
          _future = _load();
        });
      }
    } catch (e) {
      if (mounted) showMessage(context, errorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final write =
        ref.watch(authControllerProvider).value?.user.isStaff ?? false;
    return Scaffold(
      appBar: AppBar(title: const Text('Detalle del registro')),
      body: FutureBuilder<BookingRecord>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return LoadingError(
              snapshot.error!,
              () => setState(() {
                _future = _load();
              }),
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final record = snapshot.requireData;
          final phone = record.data['leader_phone']?.toString() ?? '';
          final whatsapp = record.data['leader_whatsapp']?.toString() ?? phone;
          final expiresAt = DateTime.tryParse(
            record.data['expires_at']?.toString() ?? '',
          );
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                record.name,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: StatusBadge(record.statusLabel),
              ),
              const SizedBox(height: 16),
              Text('${record.checkIn} → ${record.checkOut}'),
              Text(
                '${record.guests} personas · ${record.cabinNames.join(', ')}',
              ),
              if (phone.isNotEmpty) SelectableText('Celular: $phone'),
              if (whatsapp.isNotEmpty)
                TextButton.icon(
                  onPressed: () => openExternal(
                    context,
                    Uri.parse(
                      'https://wa.me/${whatsapp.replaceAll(RegExp(r'\D'), '')}',
                    ),
                  ),
                  icon: const Icon(Icons.chat_outlined),
                  label: const Text('Abrir WhatsApp'),
                ),
              if (record.status == 'pending' && expiresAt != null)
                Text(
                  'Vence: ${expiresAt.toUtc().subtract(const Duration(hours: 5)).toString().substring(0, 16)} (Colombia)',
                ),
              if (record.data['notes'] != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: SelectableText(record.data['notes'].toString()),
                ),
              if (_saving) const LinearProgressIndicator(),
              if (write) ...[
                const SizedBox(height: 20),
                OutlinedButton.icon(
                  onPressed: _saving
                      ? null
                      : () async {
                          await Navigator.of(context, rootNavigator: true).push(
                            MaterialPageRoute<void>(
                              builder: (_) => BookingEditor(
                                id: record.id,
                                arrival: DateTime.parse(record.checkIn),
                                departure: DateTime.parse(record.checkOut),
                              ),
                            ),
                          );
                          if (mounted) {
                            setState(() {
                              _future = _load();
                            });
                          }
                        },
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Editar registro'),
                ),
                if (record.status == 'pending' ||
                    record.status == 'expired') ...[
                  FilledButton(
                    onPressed: _saving
                        ? null
                        : () => _change({
                            'status': 'confirmed',
                          }, 'Confirmar ocupación'),
                    child: const Text('Confirmar ocupación'),
                  ),
                  OutlinedButton(
                    onPressed: _saving
                        ? null
                        : () => _change({
                            'status': 'pending',
                            'expires_at': DateTime.now()
                                .add(const Duration(hours: 48))
                                .toUtc()
                                .toIso8601String(),
                          }, 'Renovar cotización por 48 horas'),
                    child: const Text('Renovar 48 horas'),
                  ),
                ],
                if (record.status == 'confirmed')
                  FilledButton(
                    onPressed: _saving
                        ? null
                        : () => _change({
                            'status': 'checked_in',
                          }, 'Registrar entrada'),
                    child: const Text('Registrar entrada'),
                  ),
                if (record.status == 'checked_in')
                  FilledButton(
                    onPressed: _saving
                        ? null
                        : () => _change({
                            'status': 'checked_out',
                          }, 'Registrar salida'),
                    child: const Text('Registrar salida'),
                  ),
                if (const [
                  'pending',
                  'confirmed',
                  'checked_in',
                  'expired',
                ].contains(record.status))
                  TextButton(
                    onPressed: _saving
                        ? null
                        : () => _change({
                            'status': 'cancelled',
                          }, 'Cancelar registro'),
                    child: const Text('Cancelar registro'),
                  ),
              ],
            ],
          );
        },
      ),
    );
  }
}
