import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/data_events.dart';
import '../../core/management_models.dart';
import '../../core/providers.dart';
import '../../shared/management_widgets.dart';
import '../../shared/media_widgets.dart';
import '../../shared/widgets.dart';
import 'gallery_page.dart';

String? mediaFileError(String name, int bytes) {
  final ext = name.split('.').last.toLowerCase();
  final video = const ['mp4', 'mov'].contains(ext);
  if (!const ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'].contains(ext)) {
    return 'Usa JPG, PNG, WebP, MP4 o MOV.';
  }
  if (bytes == 0) return 'El archivo está vacío.';
  if (bytes > (video ? 150 : 10) * 1024 * 1024) {
    return video ? 'El video supera 150 MB.' : 'La imagen supera 10 MB.';
  }
  return null;
}

class UploadEntry {
  UploadEntry(this.file, this.bytes, this.error);
  final XFile file;
  final int bytes;
  String? error;
  String caption = '';
  double progress = 0;
  bool completed = false;
  bool get video =>
      const ['mp4', 'mov'].contains(file.name.split('.').last.toLowerCase());
}

class GalleryUploadPage extends ConsumerStatefulWidget {
  const GalleryUploadPage({super.key, this.recovered = const []});
  final List<XFile> recovered;
  @override
  ConsumerState<GalleryUploadPage> createState() => _GalleryUploadPageState();
}

class _GalleryUploadPageState extends ConsumerState<GalleryUploadPage> {
  final List<UploadEntry> _entries = [];
  String _category = 'general';
  int? _album;
  bool _active = true,
      _running = false,
      _picking = false,
      _cancelRequested = false;
  CancelToken? _cancel;
  @override
  void initState() {
    super.initState();
    if (widget.recovered.isNotEmpty) _add(widget.recovered);
  }

  @override
  void dispose() {
    _cancelRequested = true;
    _cancel?.cancel();
    super.dispose();
  }

  Future<void> _add(List<XFile> files) async {
    final added = <UploadEntry>[];
    for (final file in files) {
      if (_entries.any((entry) => entry.file.path == file.path)) continue;
      try {
        final bytes = await file.length();
        added.add(UploadEntry(file, bytes, mediaFileError(file.name, bytes)));
      } catch (_) {
        added.add(
          UploadEntry(
            file,
            0,
            'No se pudo leer el archivo. Vuelve a seleccionarlo.',
          ),
        );
      }
    }
    if (mounted) setState(() => _entries.addAll(added));
  }

  Future<void> _pick() async {
    setState(() => _picking = true);
    try {
      await _add(
        await ImagePicker().pickMultipleMedia(requestFullMetadata: false),
      );
    } catch (_) {
      if (mounted) {
        showMessage(context, 'No se pudo abrir el selector de fotos y videos.');
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  Future<void> _upload() async {
    if (_running) return;
    setState(() {
      _running = true;
      _cancelRequested = false;
    });
    var success = 0;
    try {
      for (final entry in _entries) {
        if (_cancelRequested || !mounted) break;
        if (entry.completed ||
            mediaFileError(entry.file.name, entry.bytes) != null) {
          continue;
        }
        _cancel = CancelToken();
        setState(() {
          entry.error = null;
          entry.progress = 0;
        });
        try {
          await ref
              .read(apiRepositoryProvider)
              .uploadGallery(
                entry.file.path,
                entry.file.name,
                {
                  'category': _category,
                  if (_album != null) 'gallery_album_id': _album,
                  'is_active': _active ? '1' : '0',
                  'caption': entry.caption,
                  'alt': entry.caption.characters.take(255).toString(),
                },
                cancelToken: _cancel!,
                onProgress: (sent, total) {
                  if (mounted && total > 0) {
                    setState(() => entry.progress = sent / total);
                  }
                },
              );
          if (mounted) {
            setState(() {
              entry.completed = true;
              entry.progress = 1;
            });
          }
          success++;
        } on DioException catch (error) {
          if (!mounted) break;
          setState(
            () => entry.error = error.type == DioExceptionType.cancel
                ? 'Subida cancelada. Puedes reintentar.'
                : error.response == null
                ? 'No se pudo confirmar la subida. Revisa la galería antes de reintentar.'
                : errorMessage(error),
          );
        } catch (error) {
          if (mounted) setState(() => entry.error = errorMessage(error));
        }
      }
    } finally {
      if (mounted) {
        setState(() => _running = false);
        if (success > 0) {
          ref.read(dataRevisionProvider.notifier).changed();
          showMessage(context, '$success archivos subidos.');
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final albums = ref.watch(galleryAlbumsProvider);
    final pending = _entries.any(
      (e) => !e.completed && mediaFileError(e.file.name, e.bytes) == null,
    );
    return PopScope(
      canPop: !_running,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) showMessage(context, 'Cancela la subida antes de salir.');
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Subir a la galería')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Selecciona los archivos, revisa sus detalles y publícalos.',
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _running || _picking ? null : _pick,
              icon: const Icon(Icons.add_photo_alternate_outlined),
              label: Text(
                _picking ? 'Abriendo selector…' : 'Seleccionar fotos o videos',
              ),
            ),
            const Text(
              'Imágenes hasta 10 MB · Videos hasta 150 MB',
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: const InputDecoration(labelText: 'Categoría'),
              items: galleryCategories.entries
                  .map(
                    (e) => DropdownMenuItem(value: e.key, child: Text(e.value)),
                  )
                  .toList(),
              onChanged: _running
                  ? null
                  : (v) => setState(() => _category = v!),
            ),
            const SizedBox(height: 16),
            albums.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, s) =>
                  LoadingError(e, () => ref.invalidate(galleryAlbumsProvider)),
              data: (items) => DropdownButtonFormField<int>(
                initialValue: _album ?? 0,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Álbum'),
                items: [
                  const DropdownMenuItem(value: 0, child: Text('Sin álbum')),
                  ...items.map(
                    (a) => DropdownMenuItem(
                      value: a.id,
                      child: Text(a.title, overflow: TextOverflow.ellipsis),
                    ),
                  ),
                ],
                onChanged: _running
                    ? null
                    : (v) => setState(() => _album = v == 0 ? null : v),
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Publicar en la web'),
              value: _active,
              onChanged: _running ? null : (v) => setState(() => _active = v),
            ),
            ..._entries.map(
              (entry) => Padding(
                key: ValueKey(entry.file.path),
                padding: const EdgeInsets.only(bottom: 12),
                child: SectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          SizedBox(
                            width: 72,
                            height: 64,
                            child: InkWell(
                              onTap: () =>
                                  Navigator.of(
                                    context,
                                    rootNavigator: true,
                                  ).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => MediaViewer(
                                        url: entry.file.path,
                                        video: entry.video,
                                        local: true,
                                        title: entry.file.name,
                                      ),
                                    ),
                                  ),
                              child: entry.video
                                  ? const Icon(
                                      Icons.play_circle_outline,
                                      size: 40,
                                    )
                                  : Image.file(
                                      File(entry.file.path),
                                      fit: BoxFit.cover,
                                      cacheWidth: 240,
                                      errorBuilder: (_, e, s) => const Icon(
                                        Icons.broken_image_outlined,
                                      ),
                                    ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  entry.file.name,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  '${(entry.bytes / 1048576).toStringAsFixed(1)} MB',
                                ),
                                if (entry.completed)
                                  const Text(
                                    'Subido',
                                    style: TextStyle(color: Color(0xFF047857)),
                                  ),
                              ],
                            ),
                          ),
                          if (!_running && !entry.completed)
                            IconButton(
                              tooltip: 'Quitar archivo',
                              onPressed: () =>
                                  setState(() => _entries.remove(entry)),
                              icon: const Icon(Icons.close),
                            ),
                        ],
                      ),
                      if (!entry.completed)
                        TextField(
                          enabled: !_running,
                          maxLength: 500,
                          decoration: const InputDecoration(
                            labelText: 'Descripción (opcional)',
                          ),
                          onChanged: (v) => entry.caption = v,
                        ),
                      if (_running &&
                          !entry.completed &&
                          entry.error == null) ...[
                        LinearProgressIndicator(value: entry.progress),
                        Text('${(entry.progress * 100).round()} %'),
                      ],
                      if (entry.error != null)
                        Text(
                          entry.error!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (_running)
              OutlinedButton(
                onPressed: () {
                  _cancelRequested = true;
                  _cancel?.cancel();
                },
                child: const Text('Cancelar subida'),
              )
            else
              FilledButton(
                onPressed: pending ? _upload : null,
                child: const Text('Subir archivos pendientes'),
              ),
            if (_entries.isNotEmpty && _entries.every((e) => e.completed))
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Volver a la galería'),
              ),
          ],
        ),
      ),
    );
  }
}
