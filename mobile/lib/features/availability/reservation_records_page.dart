import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/management_models.dart';
import '../../core/providers.dart';
import '../../shared/management_widgets.dart';
import 'booking_detail.dart';

class ReservationRecordsPage extends ConsumerWidget {
  const ReservationRecordsPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: const Text('Registros de estadías')),
    body: CollectionPage<BookingRecord>(
      title: 'Cotizaciones y ocupaciones',
      searchHint: 'Turista, grupo o teléfono',
      filters: const {
        'status': {
          '': 'Todos los estados',
          'pending': 'Cotizaciones vigentes',
          'expired': 'Cotizaciones vencidas',
          'confirmed': 'Confirmadas',
          'checked_in': 'Con entrada',
          'checked_out': 'Con salida',
          'cancelled': 'Canceladas',
        },
      },
      load: (page, search, filters) => ref
          .read(apiRepositoryProvider)
          .page(
            '/admin/reservations',
            BookingRecord.fromJson,
            page: page,
            search: search,
            filters: filters,
          ),
      itemBuilder: (context, record, _) => Card(
        child: ListTile(
          title: Text(record.name),
          subtitle: Text(
            '${record.checkIn} → ${record.checkOut}\n${record.cabinNames.join(', ')}\n${record.statusLabel}',
          ),
          isThreeLine: true,
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context, rootNavigator: true).push(
            MaterialPageRoute<void>(builder: (_) => BookingDetail(record.id)),
          ),
        ),
      ),
    ),
  );
}
