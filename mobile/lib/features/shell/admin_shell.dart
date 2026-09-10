import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../leads/leads_page.dart';

class AdminShell extends ConsumerWidget {
  const AdminShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final index = _indexForLocation(location);
    final auth = ref.watch(authControllerProvider).value;
    final count = ref.watch(newLeadsCountProvider).value ?? 0;

    return Scaffold(
      appBar: AppBar(
        leading: index == 3 && location != '/more'
            ? IconButton(
                tooltip: 'Más',
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.go('/more'),
              )
            : null,
        title: const Text('Playa Terco'),
        actions: [
          if (auth != null)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Center(
                child: Text(
                  auth.user.name.split(' ').first,
                  style: Theme.of(context).textTheme.labelLarge,
                ),
              ),
            ),
          IconButton(
            tooltip: 'Cerrar sesión',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(child: child),
      bottomNavigationBar: MediaQuery.withClampedTextScaling(
        maxScaleFactor: 1.0,
        child: NavigationBar(
          labelTextStyle: const WidgetStatePropertyAll(TextStyle(fontSize: 12)),
          selectedIndex: index,
          onDestinationSelected: (value) => context.go(_locations[value]),
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.space_dashboard_outlined),
              label: 'Inicio',
            ),
            const NavigationDestination(
              icon: Icon(Icons.event_available_outlined),
              label: 'Fechas',
            ),
            NavigationDestination(
              icon: Badge(
                isLabelVisible: count > 0,
                label: Text(count > 99 ? '99+' : '$count'),
                child: const Icon(Icons.mark_email_unread_outlined),
              ),
              label: 'Cotizaciones',
            ),
            const NavigationDestination(icon: Icon(Icons.menu), label: 'Más'),
          ],
        ),
      ),
    );
  }

  static const _locations = ['/dashboard', '/availability', '/leads', '/more'];

  int _indexForLocation(String location) {
    final index = _locations.indexWhere(location.startsWith);
    return index < 0 ? 3 : index;
  }
}
