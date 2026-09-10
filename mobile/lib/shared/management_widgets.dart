import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/data_events.dart';
import '../core/management_models.dart';
import '../core/models.dart';
import 'widgets.dart';

typedef PageLoader<T> =
    Future<PageResult<T>> Function(
      int page,
      String search,
      Map<String, String> filters,
    );

class CollectionPage<T> extends ConsumerStatefulWidget {
  const CollectionPage({
    super.key,
    required this.title,
    required this.load,
    required this.itemBuilder,
    this.filters = const {},
    this.action,
    this.grid = false,
    this.searchHint = 'Buscar',
  });
  final String title, searchHint;
  final PageLoader<T> load;
  final Widget Function(BuildContext, T, JsonMap) itemBuilder;
  final Map<String, Map<String, String>> filters;
  final Widget? action;
  final bool grid;
  @override
  ConsumerState<CollectionPage<T>> createState() => _CollectionPageState<T>();
}

class _CollectionPageState<T> extends ConsumerState<CollectionPage<T>> {
  final _search = TextEditingController();
  final Map<String, String> _filters = {};
  final List<T> _items = [];
  PageResult<T>? _page;
  bool _loading = true;
  Object? _error;
  Timer? _debounce;
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    _load(reset: true);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load({bool reset = false}) async {
    final generation = ++_generation;
    setState(() {
      _loading = true;
      _error = null;
      if (reset) {
        _items.clear();
        _page = null;
      }
    });
    try {
      final result = await widget.load(
        reset ? 1 : (_page?.page ?? 0) + 1,
        _search.text,
        Map.of(_filters),
      );
      if (!mounted || generation != _generation) return;
      setState(() {
        _items.addAll(result.items);
        _page = result;
      });
    } catch (error) {
      if (mounted && generation == _generation) setState(() => _error = error);
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(dataRevisionProvider, (_, next) => _load(reset: true));
    return RefreshIndicator(
      onRefresh: () => _load(reset: true),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          widget.title,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ),
                      ?widget.action,
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('collection-search'),
                    controller: _search,
                    decoration: InputDecoration(
                      hintText: widget.searchHint,
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: IconButton(
                        tooltip: 'Limpiar búsqueda',
                        icon: const Icon(Icons.close),
                        onPressed: () {
                          _debounce?.cancel();
                          _search.clear();
                          _load(reset: true);
                        },
                      ),
                    ),
                    onChanged: (_) {
                      _debounce?.cancel();
                      _debounce = Timer(
                        const Duration(milliseconds: 350),
                        () => _load(reset: true),
                      );
                    },
                  ),
                  if (widget.filters.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: widget.filters.entries
                          .map(
                            (filter) => SizedBox(
                              width: 165,
                              child: DropdownButtonFormField<String>(
                                isExpanded: true,
                                initialValue: _filters[filter.key] ?? '',
                                items: filter.value.entries
                                    .map(
                                      (e) => DropdownMenuItem(
                                        value: e.key,
                                        child: Text(
                                          e.value,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (value) {
                                  _filters[filter.key] = value ?? '';
                                  _load(reset: true);
                                },
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ],
                  if (_page != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Text(
                        '${_page!.total} resultados',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (_items.isEmpty && !_loading && _error == null)
            const SliverToBoxAdapter(
              child: EmptyState(
                icon: Icons.search_off,
                title: 'Sin resultados',
                message: 'Prueba otra búsqueda o cambia los filtros.',
              ),
            ),
          if (widget.grid)
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid.builder(
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount:
                      MediaQuery.sizeOf(context).width < 350 ||
                          MediaQuery.textScalerOf(context).scale(14) > 22
                      ? 1
                      : 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  mainAxisExtent:
                      220 + MediaQuery.textScalerOf(context).scale(40),
                ),
                itemCount: _items.length,
                itemBuilder: (context, index) => widget.itemBuilder(
                  context,
                  _items[index],
                  _page?.meta ?? {},
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList.builder(
                itemCount: _items.length,
                itemBuilder: (context, index) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: widget.itemBuilder(
                    context,
                    _items[index],
                    _page?.meta ?? {},
                  ),
                ),
              ),
            ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  if (_loading) const CircularProgressIndicator(),
                  if (_error != null) ...[
                    Text(errorMessage(_error!), textAlign: TextAlign.center),
                    TextButton(
                      onPressed: () => _load(reset: _page == null),
                      child: const Text('Reintentar'),
                    ),
                  ],
                  if (!_loading && _error == null && (_page?.hasMore ?? false))
                    OutlinedButton(
                      onPressed: _load,
                      child: const Text('Cargar más'),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.label, {super.key, this.positive = false});
  final String label;
  final bool positive;
  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: positive ? const Color(0xFFD1FAE5) : const Color(0xFFEEF2F6),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      child: Text(label, style: Theme.of(context).textTheme.labelMedium),
    ),
  );
}

Future<bool> confirmAction(
  BuildContext context,
  String title,
  String message,
) async =>
    await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Volver'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    ) ??
    false;

void showMessage(BuildContext context, String message) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

Future<void> openExternal(BuildContext context, Uri uri) async {
  if (!const ['https', 'http', 'mailto', 'tel'].contains(uri.scheme)) return;
  try {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
        context.mounted) {
      showMessage(
        context,
        'No hay una aplicación disponible para abrir este enlace.',
      );
    }
  } catch (_) {
    if (context.mounted) showMessage(context, 'No se pudo abrir el enlace.');
  }
}

class LoadingError extends StatelessWidget {
  const LoadingError(this.error, this.retry, {super.key});
  final Object error;
  final VoidCallback retry;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(errorMessage(error), textAlign: TextAlign.center),
          TextButton(onPressed: retry, child: const Text('Reintentar')),
        ],
      ),
    ),
  );
}
