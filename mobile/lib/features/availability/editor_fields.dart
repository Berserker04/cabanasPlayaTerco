import 'package:flutter/material.dart';
import '../../shared/formatters.dart';

DateTime todayInBogota([DateTime? instant]) {
  final date = (instant ?? DateTime.now()).toUtc().subtract(
    const Duration(hours: 5),
  );
  return DateTime(date.year, date.month, date.day);
}

class StayDates extends StatelessWidget {
  const StayDates({
    super.key,
    required this.arrival,
    required this.departure,
    required this.onChanged,
    this.enabled = true,
  });
  final DateTime arrival, departure;
  final void Function(DateTime, DateTime) onChanged;
  final bool enabled;
  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    onPressed: !enabled
        ? null
        : () async {
            final range = await showDateRangePicker(
              context: context,
              firstDate: DateTime(2020),
              lastDate: DateTime(todayInBogota().year + 5, 12, 31),
              initialDateRange: DateTimeRange(start: arrival, end: departure),
              helpText: 'Llegada y salida',
              saveText: 'Usar fechas',
            );
            if (range != null) onChanged(range.start, range.end);
          },
    icon: const Icon(Icons.date_range),
    label: Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          Text('${isoDate(arrival)} → ${isoDate(departure)}'),
          Text(
            '${departure.difference(arrival).inDays} noches',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    ),
  );
}

String? requiredText(String? value) =>
    value == null || value.trim().isEmpty ? 'Completa este campo.' : null;
String? positiveNumber(String? value) => (int.tryParse(value ?? '') ?? 0) < 1
    ? 'Indica al menos una persona.'
    : null;
String? phoneError(String? value) =>
    value == null ||
        value.trim().isEmpty ||
        RegExp(r'^\+?(?:[ ()-]*\d){7,15}[ ()-]*$').hasMatch(value.trim())
    ? null
    : 'Indica entre 7 y 15 dígitos.';
