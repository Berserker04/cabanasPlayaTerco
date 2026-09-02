import 'package:cabanas_playa_terco_admin/core/models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('planner result parses cabins and suggestions', () {
    final result = PlannerResult.fromJson({
      'check_in': '2030-12-10',
      'check_out': '2030-12-20',
      'guests': 6,
      'summary': {'available_count': 1},
      'cabins': [
        {
          'cabin_id': 1,
          'name': 'Cabana 1',
          'max_guests': 8,
          'available_for_range': true,
          'fits_guests': true,
          'segments': [
            {
              'check_in': '2030-12-10',
              'check_out': '2030-12-20',
              'state': 'available',
              'tone': 'green',
              'label': 'Disponible',
            }
          ],
        }
      ],
      'suggestions': [
        {
          'cabin_ids': [1],
          'capacity': 8,
          'capacity_extra': 2,
          'cabins_count': 1,
          'cabins': [
            {'name': 'Cabana 1'}
          ],
        }
      ],
    });

    expect(result.cabins.single.availableForRange, isTrue);
    expect(result.suggestions.single.capacityExtra, 2);
  });
}
