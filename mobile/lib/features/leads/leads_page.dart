import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models.dart';
import '../../core/providers.dart';
import '../../shared/widgets.dart';

final leadsProvider = FutureProvider.autoDispose((ref) {
  return ref.watch(apiRepositoryProvider).leads();
});

class LeadsPage extends ConsumerWidget {
  const LeadsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leads = ref.watch(leadsProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(leadsProvider.future),
      child: leads.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => EmptyState(icon: Icons.cloud_off, title: 'Sin leads', message: errorMessage(error)),
        data: (items) {
          if (items.isEmpty) {
            return const EmptyState(icon: Icons.inbox_outlined, title: 'Bandeja limpia', message: 'Los contactos nuevos apareceran aqui.');
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length + 1,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              if (index == 0) {
                return Text('Leads del sistema', style: Theme.of(context).textTheme.headlineSmall);
              }
              return _LeadCard(item: items[index - 1]);
            },
          );
        },
      ),
    );
  }
}

class _LeadCard extends ConsumerWidget {
  const _LeadCard({required this.item});

  final LeadItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(item.name, style: Theme.of(context).textTheme.titleMedium)),
              Chip(label: Text(item.statusLabel)),
            ],
          ),
          if (item.email != null) Text(item.email!),
          if (item.phone != null) Text(item.phone!),
          if (item.checkIn != null) Text('${item.checkIn} -> ${item.checkOut ?? '-'} · ${item.guests ?? 0} personas'),
          if (item.message != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(item.message!)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: () => _update(context, ref, 'contacted'),
                icon: const Icon(Icons.check),
                label: const Text('Contactado'),
              ),
              OutlinedButton.icon(
                onPressed: () => _update(context, ref, 'closed'),
                icon: const Icon(Icons.done_all),
                label: const Text('Cerrar'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _update(BuildContext context, WidgetRef ref, String status) async {
    try {
      await ref.read(apiRepositoryProvider).updateLead(item.id, status: status);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lead actualizado.')));
        ref.invalidate(leadsProvider);
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessage(error))));
      }
    }
  }
}
