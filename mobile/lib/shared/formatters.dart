import 'package:intl/intl.dart';

final moneyFormat = NumberFormat.currency(locale: 'es_CO', symbol: r'$ ', decimalDigits: 0);
final compactDateFormat = DateFormat('d MMM', 'es_CO');

String money(num value) => moneyFormat.format(value);

String isoDate(DateTime date) => DateFormat('yyyy-MM-dd').format(date);

String monthKey(DateTime date) => DateFormat('yyyy-MM').format(date);
