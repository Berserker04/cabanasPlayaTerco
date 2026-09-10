import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/data_events.dart';
import '../../core/management_models.dart';
import '../../core/providers.dart';
import '../../shared/management_widgets.dart';
import '../../shared/media_widgets.dart';
import '../../shared/widgets.dart';

class ReviewsPage extends ConsumerWidget {
  const ReviewsPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      CollectionPage<ReviewItem>(
        title: 'Reseñas',
        searchHint: 'Autor, título o contenido',
        filters: const {
          'status': {'': 'Todos los estados', ...moderationLabels},
        },
        load: (page, search, filters) => ref
            .read(apiRepositoryProvider)
            .page(
              '/admin/reviews',
              ReviewItem.fromJson,
              page: page,
              search: search,
              filters: filters,
            ),
        itemBuilder: (context, item, _) => Card(
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: () => Navigator.of(context, rootNavigator: true).push(
              MaterialPageRoute<void>(builder: (_) => ReviewDetailPage(item)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.author,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      StatusBadge(
                        moderationLabels[item.status] ?? item.status,
                        positive: item.status == 'approved',
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '★ ' * item.rating,
                    style: const TextStyle(color: Color(0xFFB7791F)),
                  ),
                  if (item.title.isNotEmpty)
                    Text(
                      item.title,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  Text(item.body, maxLines: 3, overflow: TextOverflow.ellipsis),
                  if (item.media.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text('${item.media.length} fotografías'),
                    ),
                ],
              ),
            ),
          ),
        ),
      );
}

class ReviewDetailPage extends ConsumerStatefulWidget {
  const ReviewDetailPage(this.item, {super.key});
  final ReviewItem item;
  @override
  ConsumerState<ReviewDetailPage> createState() => _ReviewDetailPageState();
}

class _ReviewDetailPageState extends ConsumerState<ReviewDetailPage> {
  late String _status;
  late final TextEditingController _response;
  bool _saving = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    _status = widget.item.status;
    _response = TextEditingController(text: widget.item.response);
  }

  @override
  void dispose() {
    _response.dispose();
    super.dispose();
  }

  Future<void> _save({bool delete = false}) async {
    if (delete &&
        !await confirmAction(
          context,
          'Eliminar reseña',
          'Se eliminarán la reseña y sus fotografías.',
        )) {
      return;
    }
    if (!mounted || _saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = ref.read(apiRepositoryProvider);
      if (delete) {
        await api.remove('/admin/reviews/${widget.item.id}');
      } else {
        await api.update('/admin/reviews/${widget.item.id}', {
          'status': _status,
          'admin_response': _response.text.trim(),
        });
      }
      ref.read(dataRevisionProvider.notifier).changed();
      if (mounted) {
        showMessage(
          context,
          delete ? 'Reseña eliminada.' : 'Reseña actualizada.',
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
  Widget build(BuildContext context) {
    final admin =
        ref.watch(authControllerProvider).value?.user.isAdmin ?? false;
    final item = widget.item;
    return Scaffold(
      appBar: AppBar(title: const Text('Detalle de reseña')),
      body: !admin
          ? const Center(
              child: Text('Tu cuenta no tiene acceso a la moderación.'),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  item.author,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 6),
                Text(
                  '★ ' * item.rating,
                  style: const TextStyle(
                    color: Color(0xFFB7791F),
                    fontSize: 22,
                  ),
                ),
                if (item.title.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Text(
                      item.title,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ),
                SelectableText(item.body),
                const SizedBox(height: 16),
                MediaStrip(item.media),
                const SizedBox(height: 24),
                DropdownButtonFormField<String>(
                  initialValue: _status,
                  decoration: const InputDecoration(labelText: 'Visibilidad'),
                  items: moderationLabels.entries
                      .map(
                        (e) => DropdownMenuItem(
                          value: e.key,
                          child: Text(e.value),
                        ),
                      )
                      .toList(),
                  onChanged: _saving
                      ? null
                      : (v) => setState(() => _status = v!),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _response,
                  enabled: !_saving,
                  maxLength: 2000,
                  minLines: 3,
                  maxLines: 8,
                  decoration: const InputDecoration(
                    labelText: 'Respuesta de administración',
                    alignLabelWithHint: true,
                  ),
                ),
                if (_error != null)
                  Text(
                    _error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Guardando…' : 'Guardar cambios'),
                ),
                TextButton(
                  onPressed: _saving ? null : () => _save(delete: true),
                  child: const Text('Eliminar reseña'),
                ),
              ],
            ),
    );
  }
}
