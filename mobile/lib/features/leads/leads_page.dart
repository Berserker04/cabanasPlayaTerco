import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/data_events.dart';
import '../../core/models.dart';
import '../../core/providers.dart';
import '../../shared/management_widgets.dart';
import '../../shared/widgets.dart';

final newLeadsCountProvider = FutureProvider.autoDispose<int>((ref) async {
  ref.watch(dataRevisionProvider);
  ref.watch(authControllerProvider.select((a) => a.value?.user.id));
  final result = await ref
      .watch(apiRepositoryProvider)
      .page('/admin/leads', LeadItem.fromJson, filters: {'status': 'new'});
  return asInt(result.meta['new_count']);
});

class LeadsPage extends ConsumerWidget {
  const LeadsPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => CollectionPage<LeadItem>(
    title: 'Cotizaciones',
    searchHint: 'Nombre, correo o teléfono',
    filters: const {
      'status': {
        '': 'Todas',
        'new': 'Nuevas',
        'contacted': 'Contactadas',
        'quoted': 'Cotizadas',
        'converted': 'Cerradas con reserva',
        'lost': 'Cerradas sin reserva',
      },
    },
    load: (page, search, filters) => ref
        .read(apiRepositoryProvider)
        .page(
          '/admin/leads',
          LeadItem.fromJson,
          page: page,
          search: search,
          filters: filters,
        ),
    itemBuilder: (context, item, _) => Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          child: Icon(
            item.status == 'new'
                ? Icons.mark_email_unread_outlined
                : Icons.mail_outline,
          ),
        ),
        title: Text(item.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (item.email != null) Text(item.email!),
            if (item.checkIn != null)
              Text('${item.checkIn} → ${item.checkOut ?? 'Por definir'}'),
            const SizedBox(height: 6),
            StatusBadge(item.statusLabel, positive: item.status == 'new'),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/leads/${item.id}'),
      ),
    ),
  );
}

class LeadDetailPage extends ConsumerStatefulWidget {
  const LeadDetailPage(this.id, {super.key});
  final int id;
  @override
  ConsumerState<LeadDetailPage> createState() => _LeadDetailPageState();
}

class _LeadDetailPageState extends ConsumerState<LeadDetailPage> {
  late Future<LeadItem> _future;
  final _notes = TextEditingController();
  bool _saving = false;
  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<LeadItem> _load() async {
    final item = LeadItem.fromJson(
      await ref.read(apiRepositoryProvider).detail('/admin/leads/${widget.id}'),
    );
    if (mounted) _notes.text = item.notes;
    return item;
  }

  Future<void> _close() async {
    final status = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar solicitud'),
        content: const Text(
          'Indica el resultado para conservar el seguimiento del equipo.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'lost'),
            child: const Text('Sin reserva'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, 'converted'),
            child: const Text('Con reserva'),
          ),
        ],
      ),
    );
    if (status != null && mounted) await _save(status);
  }

  Future<void> _save(String status) async {
    setState(() => _saving = true);
    try {
      await ref
          .read(apiRepositoryProvider)
          .updateLead(widget.id, status: status, notes: _notes.text.trim());
      ref.read(dataRevisionProvider.notifier).changed();
      if (mounted) {
        setState(() {
          _future = _load();
        });
        showMessage(context, 'Solicitud actualizada.');
      }
    } catch (error) {
      if (mounted) showMessage(context, errorMessage(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final write =
        ref.watch(authControllerProvider).value?.user.isStaff ?? false;
    return Scaffold(
      appBar: AppBar(title: const Text('Solicitud de cotización')),
      body: FutureBuilder<LeadItem>(
        future: _future,
        builder: (context, s) {
          if (s.hasError) {
            return LoadingError(
              s.error!,
              () => setState(() {
                _future = _load();
              }),
            );
          }
          if (!s.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final item = s.requireData;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(item.name, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: StatusBadge(
                  item.statusLabel,
                  positive: item.status == 'new',
                ),
              ),
              const SizedBox(height: 20),
              if (item.createdAt.isNotEmpty)
                Text('Recibida: ${_colombiaTime(item.createdAt)}'),
              if (item.sourceLabel.isNotEmpty)
                Text('Origen: ${item.sourceLabel}'),
              if (item.assigneeName.isNotEmpty)
                Text('Responsable: ${item.assigneeName}'),
              if (item.respondedAt.isNotEmpty)
                Text('Primer seguimiento: ${_colombiaTime(item.respondedAt)}'),
              const SizedBox(height: 12),
              if (item.email != null) SelectableText(item.email!),
              if (item.phone != null) SelectableText(item.phone!),
              if (item.checkIn != null || item.guests != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    '${item.checkIn ?? 'Llegada por definir'} → ${item.checkOut ?? 'Salida por definir'} · ${item.guests ?? '—'} personas',
                  ),
                ),
              if (item.cabinName.isNotEmpty)
                Text('Alojamiento: ${item.cabinName}'),
              if (item.message != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: SelectableText(item.message!),
                ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (item.email?.isNotEmpty == true)
                    OutlinedButton.icon(
                      onPressed: () => openExternal(
                        context,
                        Uri(
                          scheme: 'mailto',
                          path: item.email,
                          query:
                              'subject=${Uri.encodeComponent('Tu cotización en Playa Terco')}',
                        ),
                      ),
                      icon: const Icon(Icons.email_outlined),
                      label: const Text('Correo'),
                    ),
                  if (item.phone?.isNotEmpty == true)
                    OutlinedButton.icon(
                      onPressed: () => openExternal(
                        context,
                        Uri.parse(
                          'https://wa.me/${item.phone!.replaceAll(RegExp(r'\D'), '')}',
                        ),
                      ),
                      icon: const Icon(Icons.chat_outlined),
                      label: const Text('WhatsApp'),
                    ),
                ],
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _notes,
                readOnly: !write || _saving,
                minLines: 3,
                maxLines: 8,
                decoration: const InputDecoration(
                  labelText: 'Notas del equipo',
                  alignLabelWithHint: true,
                ),
              ),
              if (_saving) const LinearProgressIndicator(),
              if (write) ...[
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _saving ? null : () => _save(item.status),
                  child: const Text('Guardar notas'),
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    if (item.status != 'contacted')
                      OutlinedButton(
                        onPressed: _saving ? null : () => _save('contacted'),
                        child: const Text('Marcar contactada'),
                      ),
                    if (!['converted', 'lost'].contains(item.status))
                      OutlinedButton(
                        onPressed: _saving ? null : _close,
                        child: const Text('Cerrar solicitud'),
                      ),
                  ],
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

String _colombiaTime(String value) {
  final date = DateTime.tryParse(value);
  return date == null
      ? value
      : '${DateFormat('dd/MM/yyyy HH:mm').format(date.toUtc().subtract(const Duration(hours: 5)))} (Colombia)';
}
