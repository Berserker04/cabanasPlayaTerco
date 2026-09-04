import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';

class AdminShell extends ConsumerWidget {
  const AdminShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final index = _indexForLocation(location);
    final auth = ref.watch(authControllerProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Playa Terco Admin'),
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
            tooltip: 'Cerrar sesion',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(child: child),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => context.go(_locations[value]),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.space_dashboard_outlined),
            label: 'Panel',
          ),
          NavigationDestination(
            icon: Icon(Icons.event_available_outlined),
            label: 'Fechas',
          ),
          NavigationDestination(
            icon: Icon(Icons.mark_email_unread_outlined),
            label: 'Leads',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            label: 'Caja',
          ),
        ],
      ),
    );
  }

  static const _locations = [
    '/dashboard',
    '/availability',
    '/leads',
    '/finance',
  ];

  int _indexForLocation(String location) {
    final index = _locations.indexWhere(location.startsWith);
    return index < 0 ? 0 : index;
  }
}
