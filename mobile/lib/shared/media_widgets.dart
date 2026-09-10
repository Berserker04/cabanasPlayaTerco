import 'dart:io';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../core/management_models.dart';
import 'management_widgets.dart';

class MediaThumbnail extends StatelessWidget {
  const MediaThumbnail(this.item, {super.key, this.onTap});
  final MediaItem item;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap:
        onTap ??
        () => Navigator.of(context, rootNavigator: true).push(
          MaterialPageRoute<void>(
            builder: (_) => MediaViewer(
              url: item.url,
              video: item.isVideo,
              title: item.alt,
            ),
          ),
        ),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: AspectRatio(
        aspectRatio: 1.5,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Container(color: const Color(0xFFE4ECE8)),
            if (!item.isVideo || item.thumbnail != item.url)
              Image.network(
                item.thumbnail,
                fit: BoxFit.cover,
                cacheWidth: 640,
                errorBuilder: (_, error, stack) =>
                    const Icon(Icons.broken_image_outlined),
              ),
            if (item.isVideo)
              const Center(child: Icon(Icons.play_circle_fill, size: 48)),
          ],
        ),
      ),
    ),
  );
}

class MediaStrip extends StatelessWidget {
  const MediaStrip(this.items, {super.key});
  final List<MediaItem> items;
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: items
        .map((item) => SizedBox(width: 140, child: MediaThumbnail(item)))
        .toList(),
  );
}

class MediaViewer extends StatelessWidget {
  const MediaViewer({
    super.key,
    required this.url,
    this.video = false,
    this.local = false,
    this.title = '',
  });
  final String url, title;
  final bool video, local;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(title.isEmpty ? (video ? 'Video' : 'Fotografía') : title),
    ),
    body: Center(
      child: video
          ? VideoPreview(url: url, local: local)
          : InteractiveViewer(
              minScale: .5,
              maxScale: 5,
              child: local
                  ? Image.file(
                      File(url),
                      errorBuilder: (_, e, s) =>
                          const Text('No se pudo leer la imagen.'),
                    )
                  : Image.network(
                      url,
                      errorBuilder: (_, e, s) =>
                          const Text('No se pudo cargar la imagen.'),
                    ),
            ),
    ),
  );
}

class VideoPreview extends StatefulWidget {
  const VideoPreview({super.key, required this.url, this.local = false});
  final String url;
  final bool local;
  @override
  State<VideoPreview> createState() => _VideoPreviewState();
}

class _VideoPreviewState extends State<VideoPreview>
    with WidgetsBindingObserver {
  VideoPlayerController? _controller;
  bool _loading = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) _controller?.pause();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _play() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final controller = widget.local
        ? VideoPlayerController.file(File(widget.url))
        : VideoPlayerController.networkUrl(Uri.parse(widget.url));
    final previous = _controller;
    _controller = controller;
    await previous?.dispose();
    try {
      await controller.initialize();
      if (!mounted) return;
      await controller.play();
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'El dispositivo no pudo reproducir este video.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_error!, textAlign: TextAlign.center),
          TextButton(onPressed: _play, child: const Text('Reintentar')),
          if (!widget.local)
            TextButton(
              onPressed: () => openExternal(context, Uri.parse(widget.url)),
              child: const Text('Abrir video'),
            ),
        ],
      );
    }
    if (controller == null || !controller.value.isInitialized) {
      return Center(
        child: FilledButton.icon(
          onPressed: _play,
          icon: const Icon(Icons.play_arrow),
          label: const Text('Reproducir video'),
        ),
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) =>
          ValueListenableBuilder<VideoPlayerValue>(
            valueListenable: controller,
            builder: (context, value, _) {
              final controlsHeight =
                  (MediaQuery.textScalerOf(context).scale(16) * 1.5).clamp(
                    48.0,
                    160.0,
                  );
              final videoWidth = constraints.hasBoundedHeight
                  ? ((constraints.maxHeight - controlsHeight).clamp(
                              1.0,
                              double.infinity,
                            ) *
                            value.aspectRatio)
                        .clamp(1.0, constraints.maxWidth)
                  : constraints.maxWidth;
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: videoWidth,
                    height: videoWidth / value.aspectRatio,
                    child: VideoPlayer(controller),
                  ),
                  SizedBox(
                    height: controlsHeight,
                    child: Row(
                      children: [
                        IconButton(
                          tooltip: value.isPlaying ? 'Pausar' : 'Reproducir',
                          onPressed: () => value.isPlaying
                              ? controller.pause()
                              : controller.play(),
                          icon: Icon(
                            value.isPlaying ? Icons.pause : Icons.play_arrow,
                          ),
                        ),
                        Expanded(
                          child: VideoProgressIndicator(
                            controller,
                            allowScrubbing: true,
                            padding: const EdgeInsets.all(12),
                          ),
                        ),
                        Text('${value.position.inSeconds} s'),
                        const SizedBox(width: 12),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
    );
  }
}
