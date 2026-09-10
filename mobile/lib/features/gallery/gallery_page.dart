import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/data_events.dart';
import '../../core/management_models.dart';
import '../../core/providers.dart';
import '../../shared/management_widgets.dart';
import '../../shared/media_widgets.dart';
import '../../shared/widgets.dart';

final galleryAlbumsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(apiRepositoryProvider).albums(),
);

class GalleryPage extends ConsumerWidget {
  const GalleryPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final albums = ref.watch(galleryAlbumsProvider);
    return albums.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, s) =>
          LoadingError(e, () => ref.invalidate(galleryAlbumsProvider)),
      data: (options) => CollectionPage<GalleryItem>(
        title: 'Galería',
        grid: true,
        searchHint: 'Buscar fotografías y videos',
        action: IconButton.filled(
          tooltip: 'Subir archivos',
          icon: const Icon(Icons.add_photo_alternate_outlined),
          onPressed: () => context.push('/gallery/upload'),
        ),
        filters: {
          'category': {'': 'Categorías', ...galleryCategories},
          'type': {
            '': 'Fotos y videos',
            'image': 'Fotografías',
            'video': 'Videos',
          },
          'album_id': {
            '': 'Todos los álbumes',
            for (final a in options) a.id.toString(): a.title,
          },
          'is_active': {
            '': 'Toda visibilidad',
            '1': 'Publicados',
            '0': 'Ocultos',
          },
        },
        load: (page, search, filters) => ref
            .read(apiRepositoryProvider)
            .page(
              '/admin/gallery',
              GalleryItem.fromJson,
              page: page,
              search: search,
              filters: filters,
            ),
        itemBuilder: (context, item, _) => Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: MediaThumbnail(item)),
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
                child: Text(
                  item.caption.isEmpty
                      ? galleryCategories[item.category] ?? item.category
                      : item.caption,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Row(
                children: [
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      item.active ? 'Publicado' : 'Oculto',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Editar archivo',
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: () =>
                        Navigator.of(context, rootNavigator: true).push(
                          MaterialPageRoute<void>(
                            builder: (_) => GalleryEditPage(item, options),
                          ),
                        ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class GalleryEditPage extends ConsumerStatefulWidget {
  const GalleryEditPage(this.item, this.albums, {super.key});
  final GalleryItem item;
  final List<AlbumOption> albums;
  @override
  ConsumerState<GalleryEditPage> createState() => _GalleryEditPageState();
}

class _GalleryEditPageState extends ConsumerState<GalleryEditPage> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _caption, _alt;
  late String _category;
  int? _album;
  bool _active = true, _saving = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    _caption = TextEditingController(text: widget.item.caption);
    _alt = TextEditingController(text: widget.item.alt);
    _category = widget.item.category;
    _album = widget.item.albumId;
    _active = widget.item.active;
  }

  @override
  void dispose() {
    _caption.dispose();
    _alt.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(apiRepositoryProvider)
          .update('/admin/gallery/${widget.item.id}', {
            'caption': _caption.text.trim(),
            'alt': _alt.text.trim(),
            'category': _category,
            'gallery_album_id': _album,
            'is_active': _active,
          });
      ref.read(dataRevisionProvider.notifier).changed();
      if (mounted) {
        showMessage(context, 'Archivo actualizado.');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Editar archivo')),
    body: Form(
      key: _form,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          MediaThumbnail(widget.item),
          const SizedBox(height: 16),
          TextFormField(
            controller: _caption,
            enabled: !_saving,
            maxLength: 500,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Descripción'),
          ),
          TextFormField(
            controller: _alt,
            enabled: !_saving,
            maxLength: 255,
            decoration: const InputDecoration(labelText: 'Texto alternativo'),
          ),
          DropdownButtonFormField<String>(
            initialValue: _category,
            decoration: const InputDecoration(labelText: 'Categoría'),
            items: galleryCategories.entries
                .map(
                  (e) => DropdownMenuItem(value: e.key, child: Text(e.value)),
                )
                .toList(),
            onChanged: _saving ? null : (v) => setState(() => _category = v!),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<int>(
            initialValue: _album ?? 0,
            decoration: const InputDecoration(labelText: 'Álbum'),
            isExpanded: true,
            items: [
              const DropdownMenuItem(value: 0, child: Text('Sin álbum')),
              ...widget.albums.map(
                (a) => DropdownMenuItem(
                  value: a.id,
                  child: Text(a.title, overflow: TextOverflow.ellipsis),
                ),
              ),
            ],
            onChanged: _saving
                ? null
                : (v) => setState(() => _album = v == 0 ? null : v),
          ),
          SwitchListTile(
            title: const Text('Visible en la web'),
            contentPadding: EdgeInsets.zero,
            value: _active,
            onChanged: _saving ? null : (v) => setState(() => _active = v),
          ),
          if (_error != null)
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'Guardando…' : 'Guardar cambios'),
          ),
        ],
      ),
    ),
  );
}
