import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../core/notification_coordinator.dart';

class MorePage extends ConsumerWidget {
  const MorePage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value?.user;
    final status = ref.watch(notificationStatusProvider);
    Widget entry(String title, String subtitle, IconData icon, String path) =>
        Card(
          child: ListTile(
            leading: Icon(icon),
            title: Text(title),
            subtitle: Text(subtitle),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.go(path),
          ),
        );
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(user?.name ?? '', style: Theme.of(context).textTheme.titleLarge),
        Text(
          user?.isAdmin == true
              ? 'Administrador'
              : user?.isStaff == true
              ? 'Personal'
              : 'Visualizador · Solo consulta',
        ),
        const SizedBox(height: 16),
        entry(
          'Blogs',
          'Leer publicaciones${user?.isAdmin == true ? ' y moderar contenido' : ''}',
          Icons.article_outlined,
          '/blogs',
        ),
        if (user?.isAdmin == true) ...[
          entry(
            'Reseñas',
            'Opiniones, fotografías y respuestas',
            Icons.reviews_outlined,
            '/reviews',
          ),
          entry(
            'Galería',
            'Fotos, videos y álbumes',
            Icons.photo_library_outlined,
            '/gallery',
          ),
          entry(
            'Usuarios',
            'Roles y estado de las cuentas',
            Icons.group_outlined,
            '/users',
          ),
        ],
        entry(
          'Caja',
          'Ingresos y gastos',
          Icons.account_balance_wallet_outlined,
          '/finance',
        ),
        if (user?.isStaff == true)
          Card(
            child: ListTile(
              leading: const Icon(Icons.notifications_outlined),
              title: const Text('Avisos de cotizaciones'),
              subtitle: Text(
                status ??
                    'Avisos del teléfono activados. La bandeja se actualiza también al abrir la app.',
              ),
              trailing: IconButton(
                tooltip: 'Reintentar activar avisos',
                icon: const Icon(Icons.refresh),
                onPressed: () =>
                    ref.read(notificationRetryProvider.notifier).retry(),
              ),
            ),
          ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          icon: const Icon(Icons.logout),
          label: const Text('Cerrar sesión'),
        ),
      ],
    );
  }
}
