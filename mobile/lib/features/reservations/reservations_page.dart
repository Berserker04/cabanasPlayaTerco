import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models.dart';
import '../../core/providers.dart';
import '../../shared/formatters.dart';
import '../../shared/widgets.dart';

final reservationsProvider = FutureProvider.autoDispose.family<List<ReservationSummary>, String>((ref, status) {
  return ref.watch(apiRepositoryProvider).reservations(status: status);
});

class ReservationsPage extends ConsumerStatefulWidget {
  const ReservationsPage({super.key});

  @override
  ConsumerState<ReservationsPage> createState() => _ReservationsPageState();
}

class _ReservationsPageState extends ConsumerState<ReservationsPage> {
  String _status = 'all';

  @override
  Widget build(BuildContext context) {
    final reservations = ref.watch(reservationsProvider(_status));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Row(
            children: [
              Expanded(child: Text('Reservas y cotizaciones', style: Theme.of(context).textTheme.headlineSmall)),
              DropdownButton<String>(
                value: _status,
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('Todas')),
                  DropdownMenuItem(value: 'pending', child: Text('Cotizadas')),
                  DropdownMenuItem(value: 'confirmed', child: Text('Confirmadas')),
                  DropdownMenuItem(value: 'checked_in', child: Text('Activas')),
                ],
                onChanged: (value) => setState(() => _status = value ?? 'all'),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.refresh(reservationsProvider(_status).future),
            child: reservations.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => EmptyState(icon: Icons.cloud_off, title: 'Sin reservas', message: errorMessage(error)),
              data: (items) {
                if (items.isEmpty) {
                  return const EmptyState(icon: Icons.king_bed_outlined, title: 'Nada por aqui', message: 'No hay registros para este filtro.');
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) => _ReservationCard(
                    item: items[index],
                    onAddPayment: () => _showPaymentDialog(items[index]),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _showPaymentDialog(ReservationSummary reservation) async {
    final amount = TextEditingController();
    final reference = TextEditingController();
    String method = 'transfer';

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Abono de ${reservation.leaderName}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Monto')),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                  initialValue: method,
                decoration: const InputDecoration(labelText: 'Metodo'),
                items: const [
                  DropdownMenuItem(value: 'cash', child: Text('Efectivo')),
                  DropdownMenuItem(value: 'transfer', child: Text('Transferencia')),
                  DropdownMenuItem(value: 'nequi', child: Text('Nequi')),
                  DropdownMenuItem(value: 'daviplata', child: Text('Daviplata')),
                  DropdownMenuItem(value: 'credit_card', child: Text('Tarjeta')),
                  DropdownMenuItem(value: 'other', child: Text('Otro')),
                ],
                onChanged: (value) => setDialogState(() => method = value ?? 'transfer'),
              ),
              const SizedBox(height: 10),
              TextField(controller: reference, decoration: const InputDecoration(labelText: 'Referencia')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Guardar')),
          ],
        ),
      ),
    );

    if (saved != true) return;
    try {
      await ref.read(apiRepositoryProvider).createPayment(
            reservationId: reservation.id,
            amount: double.tryParse(amount.text.trim()) ?? 0,
            method: method,
            paymentDate: isoDate(DateTime.now()),
            reference: reference.text.trim(),
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pago registrado.')));
        ref.invalidate(reservationsProvider(_status));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessage(error))));
      }
    }
  }
}

class _ReservationCard extends StatelessWidget {
  const _ReservationCard({required this.item, required this.onAddPayment});

  final ReservationSummary item;
  final VoidCallback onAddPayment;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(item.leaderName, style: Theme.of(context).textTheme.titleMedium)),
              Chip(label: Text(item.statusLabel)),
            ],
          ),
          Text('${item.checkIn} -> ${item.checkOut} · ${item.guests} personas'),
          if (item.cabinNames.isNotEmpty) Text(item.cabinNames.join(', ')),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: Text('Total ${item.totalPrice == null ? '-' : money(item.totalPrice!)}')),
              Expanded(child: Text('Pagado ${money(item.totalPaid)}')),
              Expanded(child: Text('Saldo ${item.balanceDue == null ? '-' : money(item.balanceDue!)}')),
            ],
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: OutlinedButton.icon(onPressed: onAddPayment, icon: const Icon(Icons.add_card), label: const Text('Abono')),
          ),
        ],
      ),
    );
  }
}
