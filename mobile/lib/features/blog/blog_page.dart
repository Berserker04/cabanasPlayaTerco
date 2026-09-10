import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_widget_from_html/flutter_widget_from_html.dart';
import '../../core/data_events.dart';
import '../../core/management_models.dart';
import '../../core/providers.dart';
import '../../shared/management_widgets.dart';
import '../../shared/media_widgets.dart';
import '../../shared/widgets.dart';

class BlogPage extends ConsumerWidget {
  const BlogPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final admin =
        ref.watch(authControllerProvider).value?.user.isAdmin ?? false;
    return CollectionPage<PostItem>(
      key: ValueKey(admin),
      title: 'Blogs',
      searchHint: 'Buscar publicaciones',
      action: admin
          ? IconButton(
              tooltip: 'Moderar comentarios',
              onPressed: () => Navigator.of(context, rootNavigator: true).push(
                MaterialPageRoute<void>(builder: (_) => const CommentsPage()),
              ),
              icon: const Icon(Icons.forum_outlined),
            )
          : null,
      filters: {
        if (admin) 'status': {'': 'Todos los estados', ...postLabels},
        'type': {
          '': 'Todos los tipos',
          'article': 'Artículos',
          'experience': 'Experiencias',
        },
      },
      load: (page, search, filters) => ref
          .read(apiRepositoryProvider)
          .page(
            admin ? '/admin/posts' : '/posts',
            PostItem.fromJson,
            page: page,
            search: search,
            filters: filters,
          ),
      itemBuilder: (context, post, _) => Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => Navigator.of(
            context,
            rootNavigator: true,
          ).push(MaterialPageRoute<void>(builder: (_) => PostDetailPage(post))),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (post.cover?.isNotEmpty == true)
                Image.network(
                  post.cover!,
                  height: 160,
                  fit: BoxFit.cover,
                  cacheWidth: 900,
                  errorBuilder: (_, e, s) => const SizedBox(
                    height: 80,
                    child: Icon(Icons.landscape_outlined),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (admin)
                      StatusBadge(
                        postLabels[post.status] ?? post.status,
                        positive: post.status == 'published',
                      ),
                    const SizedBox(height: 8),
                    Text(
                      post.title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      post.summary,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '${post.author} · ${post.commentsCount} comentarios',
                      style: Theme.of(context).textTheme.bodySmall,
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

class PostDetailPage extends ConsumerStatefulWidget {
  const PostDetailPage(this.initial, {super.key});
  final PostItem initial;
  @override
  ConsumerState<PostDetailPage> createState() => _PostDetailPageState();
}

class _PostDetailPageState extends ConsumerState<PostDetailPage> {
  late Future<PostItem> _future;
  bool _saving = false;
  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<PostItem> _load() async {
    final admin = ref.read(authControllerProvider).value?.user.isAdmin ?? false;
    return PostItem.fromJson(
      await ref
          .read(apiRepositoryProvider)
          .detail(
            admin
                ? '/admin/posts/${widget.initial.id}'
                : '/posts/${Uri.encodeComponent(widget.initial.slug)}',
          ),
    );
  }

  Future<void> _moderate(String status) async {
    if (_saving) return;
    if (status == 'delete' &&
        !await confirmAction(
          context,
          'Eliminar publicación',
          'Se eliminarán la publicación, sus archivos y comentarios.',
        )) {
      return;
    }
    if (!mounted) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiRepositoryProvider);
      if (status == 'delete') {
        await api.remove('/admin/posts/${widget.initial.id}');
      } else {
        await api.update('/admin/posts/${widget.initial.id}', {
          'status': status,
        });
      }
      ref.read(dataRevisionProvider.notifier).changed();
      if (!mounted) return;
      showMessage(context, 'Publicación actualizada.');
      if (status == 'delete') {
        Navigator.pop(context);
      } else {
        setState(() {
          _future = _load();
        });
      }
    } catch (error) {
      if (mounted) showMessage(context, errorMessage(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin =
        ref.watch(authControllerProvider).value?.user.isAdmin ?? false;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Publicación'),
        actions: [
          if (admin)
            PopupMenuButton<String>(
              tooltip: 'Moderar publicación',
              enabled: !_saving,
              onSelected: _moderate,
              itemBuilder: (_) => const [
                PopupMenuItem(
                  value: 'published',
                  child: Text('Publicar / reactivar'),
                ),
                PopupMenuItem(
                  value: 'draft',
                  child: Text('Devolver a borrador'),
                ),
                PopupMenuItem(value: 'archived', child: Text('Archivar')),
                PopupMenuItem(
                  value: 'delete',
                  child: Text('Eliminar publicación'),
                ),
              ],
            ),
        ],
      ),
      body: FutureBuilder<PostItem>(
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
          final post = snapshot.requireData;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (_saving) const LinearProgressIndicator(),
              if (admin)
                Align(
                  alignment: Alignment.centerLeft,
                  child: StatusBadge(postLabels[post.status] ?? post.status),
                ),
              const SizedBox(height: 10),
              Text(
                post.title,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(post.author),
              const SizedBox(height: 16),
              if (post.cover?.isNotEmpty == true)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    post.cover!,
                    errorBuilder: (_, e, s) => const SizedBox.shrink(),
                  ),
                ),
              const SizedBox(height: 20),
              HtmlWidget(
                post.body,
                textStyle: const TextStyle(fontSize: 17, height: 1.6),
                onTapUrl: (url) async {
                  final uri = Uri.tryParse(url);
                  if (uri != null) await openExternal(context, uri);
                  return true;
                },
                customWidgetBuilder: (element) {
                  if (element.localName == 'video') {
                    final url =
                        element.attributes['src'] ??
                        element.querySelector('source')?.attributes['src'];
                    if (url != null) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: VideoPreview(url: url),
                      );
                    }
                  }
                  if (element.localName == 'iframe') {
                    final uri = Uri.tryParse(element.attributes['src'] ?? '');
                    return OutlinedButton.icon(
                      onPressed: uri == null
                          ? null
                          : () => openExternal(context, uri),
                      icon: const Icon(Icons.open_in_new),
                      label: const Text('Ver video externo'),
                    );
                  }
                  return null;
                },
              ),
              if (post.media.isNotEmpty) ...[
                const SizedBox(height: 20),
                MediaStrip(post.media),
              ],
              const SizedBox(height: 24),
              Text(
                'Comentarios',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              if (admin)
                OutlinedButton.icon(
                  onPressed: () =>
                      Navigator.of(context, rootNavigator: true).push(
                        MaterialPageRoute<void>(
                          builder: (_) => CommentsPage(postId: post.id),
                        ),
                      ),
                  icon: const Icon(Icons.forum_outlined),
                  label: const Text('Ver y moderar comentarios'),
                )
              else if (post.comments.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: Text('Todavía no hay comentarios.'),
                )
              else
                ...post.comments.map(
                  (comment) => Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: SectionCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            comment.author,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          Text(comment.body),
                          ...comment.replies.map(
                            (reply) => Padding(
                              padding: const EdgeInsets.only(left: 16, top: 12),
                              child: Text('${reply.author}: ${reply.body}'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class CommentsPage extends ConsumerWidget {
  const CommentsPage({super.key, this.postId});
  final int? postId;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('Comentarios')),
    body: CollectionPage<CommentItem>(
      title: postId == null ? 'Moderación' : 'Comentarios del blog',
      filters: const {
        'status': {'': 'Todos los estados', ...moderationLabels},
      },
      load: (page, search, filters) => ref
          .read(apiRepositoryProvider)
          .page(
            '/admin/comments',
            CommentItem.fromJson,
            page: page,
            search: search,
            filters: {...filters, if (postId != null) 'post_id': postId},
          ),
      itemBuilder: (context, item, _) => _CommentCard(item),
    ),
  );
}

class _CommentCard extends ConsumerStatefulWidget {
  const _CommentCard(this.item);
  final CommentItem item;
  @override
  ConsumerState<_CommentCard> createState() => _CommentCardState();
}

class _CommentCardState extends ConsumerState<_CommentCard> {
  bool _saving = false;
  Future<void> _change(String status) async {
    if (status == 'delete' &&
        !await confirmAction(
          context,
          'Eliminar comentario',
          'Se eliminará este comentario.',
        )) {
      return;
    }
    if (!mounted) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(apiRepositoryProvider);
      if (status == 'delete') {
        await api.remove('/admin/comments/${widget.item.id}');
      } else {
        await api.update('/admin/comments/${widget.item.id}', {
          'status': status,
        });
      }
      ref.read(dataRevisionProvider.notifier).changed();
    } catch (error) {
      if (mounted) showMessage(context, errorMessage(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => SectionCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                widget.item.author,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            StatusBadge(
              moderationLabels[widget.item.status] ?? widget.item.status,
            ),
            PopupMenuButton<String>(
              tooltip: 'Moderar comentario',
              enabled: !_saving,
              onSelected: _change,
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'approved', child: Text('Publicar')),
                PopupMenuItem(value: 'rejected', child: Text('Ocultar')),
                PopupMenuItem(
                  value: 'pending',
                  child: Text('Marcar pendiente'),
                ),
                PopupMenuItem(value: 'delete', child: Text('Eliminar')),
              ],
            ),
          ],
        ),
        if (widget.item.parentBody != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              'En respuesta a: ${widget.item.parentBody}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        SelectableText(widget.item.body),
        if (_saving) const LinearProgressIndicator(),
      ],
    ),
  );
}
