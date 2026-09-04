import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models.dart';
import '../../core/providers.dart';
import '../../shared/formatters.dart';
import '../../shared/widgets.dart';

final financeSummaryProvider = FutureProvider.autoDispose((ref) {
  return ref
      .watch(apiRepositoryProvider)
      .financeSummary(month: monthKey(DateTime.now()));
});

final expensesProvider = FutureProvider.autoDispose((ref) {
  return ref.watch(apiRepositoryProvider).expenses();
});

class FinancePage extends ConsumerWidget {
  const FinancePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(financeSummaryProvider);
    final expenses = ref.watch(expensesProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Caja simple',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            FilledButton.icon(
              onPressed: () => _showExpenseDialog(context, ref),
              icon: const Icon(Icons.add),
              label: const Text('Gasto'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        summary.when(
          loading: () => const LinearProgressIndicator(),
          error: (error, _) => SectionCard(child: Text(errorMessage(error))),
          data: (item) => _FinanceSummary(summary: item),
        ),
        const SizedBox(height: 16),
        Text('Gastos', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        expenses.when(
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: CircularProgressIndicator(),
            ),
          ),
          error: (error, _) => SectionCard(child: Text(errorMessage(error))),
          data: (items) {
            if (items.isEmpty) {
              return const EmptyState(
                icon: Icons.receipt_long_outlined,
                title: 'Sin gastos',
                message:
                    'Registra gastos futuros o pagados desde el boton superior.',
              );
            }
            return Column(
              children: items.map((item) => _ExpenseCard(item: item)).toList(),
            );
          },
        ),
      ],
    );
  }

  Future<void> _showExpenseDialog(BuildContext context, WidgetRef ref) async {
    final category = TextEditingController();
    final description = TextEditingController();
    final amount = TextEditingController();
    DateTime dueDate = DateTime.now();
    String status = 'pending';

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Nuevo gasto'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: category,
                  decoration: const InputDecoration(labelText: 'Categoria'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: description,
                  decoration: const InputDecoration(labelText: 'Descripcion'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: amount,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Monto'),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: status,
                  decoration: const InputDecoration(labelText: 'Estado'),
                  items: const [
                    DropdownMenuItem(
                      value: 'pending',
                      child: Text('Pendiente'),
                    ),
                    DropdownMenuItem(value: 'paid', child: Text('Pagado')),
                  ],
                  onChanged: (value) =>
                      setDialogState(() => status = value ?? 'pending'),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: dueDate,
                      firstDate: DateTime.now().subtract(
                        const Duration(days: 1),
                      ),
                      lastDate: DateTime(DateTime.now().year + 5),
                    );
                    if (picked != null) setDialogState(() => dueDate = picked);
                  },
                  icon: const Icon(Icons.event),
                  label: Text(isoDate(dueDate)),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );

    if (saved != true) return;
    try {
      await ref.read(apiRepositoryProvider).createExpense({
        'category': category.text.trim(),
        'description': description.text.trim(),
        'amount': double.tryParse(amount.text.trim()) ?? 0,
        'status': status,
        'due_date': isoDate(dueDate),
        if (status == 'paid') 'paid_at': isoDate(DateTime.now()),
      });
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Gasto guardado.')));
        ref.invalidate(expensesProvider);
        ref.invalidate(financeSummaryProvider);
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(errorMessage(error))));
      }
    }
  }
}

class _FinanceSummary extends StatelessWidget {
  const _FinanceSummary({required this.summary});

  final FinanceSummary summary;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      child: Column(
        children: [
          _MoneyRow(
            label: 'Ingresos',
            value: summary.incomeTotal,
            color: const Color(0xFF16A34A),
          ),
          _MoneyRow(
            label: 'Gastos pagados',
            value: summary.expenseTotal,
            color: const Color(0xFFDC2626),
          ),
          _MoneyRow(
            label: 'Gastos pendientes',
            value: summary.pendingExpenseTotal,
            color: const Color(0xFFD97706),
          ),
          const Divider(),
          _MoneyRow(
            label: 'Neto',
            value: summary.netTotal,
            color: const Color(0xFF2563EB),
          ),
        ],
      ),
    );
  }
}

class _MoneyRow extends StatelessWidget {
  const _MoneyRow({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(
            money(value),
            style: TextStyle(color: color, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class _ExpenseCard extends StatelessWidget {
  const _ExpenseCard({required this.item});

  final ExpenseItem item;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: SectionCard(
        child: Row(
          children: [
            CircleAvatar(
              child: Text(
                (item.category.isEmpty ? '?' : item.category.characters.first)
                    .toUpperCase(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.description,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    '${item.category} · ${item.statusLabel} · ${item.dueDate}',
                  ),
                ],
              ),
            ),
            Text(
              money(item.amount),
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }
}
