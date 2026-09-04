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
              'is_available': true,
              'quotes': [
                {
                  'id': 9,
                  'status': 'pending',
                  'status_label': 'Pendiente',
                  'leader_name': 'Grupo WhatsApp',
                  'guests_count': 4,
                  'check_in': '2030-12-10',
                  'check_out': '2030-12-12',
                  'expires_at': '2030-12-09T18:00:00Z',
                  'cabin_ids': [1],
                  'cabin_names': ['Cabana 1'],
                }
              ],
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
    expect(result.cabins.single.segments.single.isAvailable, isTrue);
    expect(result.cabins.single.segments.single.reservation, isNull);
    expect(result.cabins.single.segments.single.quotes.single.leaderName, 'Grupo WhatsApp');
    expect(result.cabins.single.segments.single.quotes.single.cabinIds, [1]);
    expect(result.suggestions.single.capacityExtra, 2);
  });
}
