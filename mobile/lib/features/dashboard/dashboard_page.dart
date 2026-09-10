import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/data_events.dart';
import '../leads/leads_page.dart';
import '../../shared/formatters.dart';
import '../../shared/widgets.dart';

final dashboardProvider = FutureProvider.autoDispose((ref) {
  ref.watch(dataRevisionProvider);
  ref.watch(authControllerProvider.select((value) => value.value?.user.id));
  return ref.watch(apiRepositoryProvider).dashboardStats();
});

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(dashboardProvider.future),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Operación de hoy',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 12),
          dashboard.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (error, _) => EmptyState(
              icon: Icons.cloud_off,
              title: 'Sin datos',
              message: errorMessage(error),
            ),
            data: (stats) => Column(
              children: [
                _MetricTile(
                  icon: Icons.mark_email_unread_outlined,
                  label: 'Cotizaciones nuevas',
                  value:
                      (ref.watch(newLeadsCountProvider).value ??
                              stats.unansweredLeads)
                          .toString(),
                  color: const Color(0xFF0F766E),
                ),
                _MetricTile(
                  icon: Icons.flight_land,
                  label: 'Llegadas próximas',
                  value: stats.upcomingArrivals.toString(),
                  color: const Color(0xFF2563EB),
                ),
                _MetricTile(
                  icon: Icons.payments_outlined,
                  label: 'Ingresos del mes',
                  value: money(stats.monthlyIncome),
                  color: const Color(0xFF16A34A),
                ),
                _MetricTile(
                  icon: Icons.receipt_long_outlined,
                  label: 'Gastos próximos',
                  value: money(stats.upcomingExpenses),
                  color: const Color(0xFFD97706),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SectionCard(
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: 0.12),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }
}
