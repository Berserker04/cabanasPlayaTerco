import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agendaEvents,
  freeRanges,
  matrixSegments,
  initialFilters,
  todayIso,
  dateTimeBogota,
  validRange,
  isIsoDate,
} from '../src/app/(admin)/admin/disponibilidad/availability-model.ts';

const reservation = (id, from, to, status = 'confirmed') => ({
  id,
  check_in: from,
  check_out: to,
  status,
  leader_name: 'Familia Pérez',
  cabin_names: ['Cabaña 4'],
  cabin_ids: [4],
});
const agenda = {
  period: { from: '2026-09-08', to: '2026-09-22', nights: 14 },
  reservations: [
    reservation(1, '2026-09-10', '2026-09-15'),
    reservation(2, '2026-09-15', '2026-09-22'),
    reservation(3, '2026-09-01', '2026-09-30'),
    reservation(4, '2026-09-14', '2026-09-18', 'pending'),
  ],
  blocks: [
    {
      id: 1,
      check_in: '2026-09-15',
      check_out: '2026-09-16',
      reason: 'Techo',
      cabin_names: ['Cabaña 2'],
    },
  ],
};

test('arrival and departure are separate movements for a single reservation', () => {
  const events = agendaEvents(agenda);
  assert.deepEqual(
    events
      .filter((event) => event.reservation?.id === 1)
      .map((event) => event.kind),
    ['arrival', 'departure'],
  );
  assert.equal(
    new Set(
      events
        .filter((event) => event.reservation)
        .map((event) => event.reservation.id),
    ).size,
    4,
  );
  assert.equal(agendaEvents(agenda, 'arrivals').length, 2);
  assert.equal(agendaEvents(agenda, 'departures').length, 2);
});
test('daily mode excludes tomorrow and includes checkout-day departures', () => {
  const day = agendaEvents(agenda, 'all', '2026-09-15');
  assert.deepEqual(
    day
      .filter((event) => event.kind === 'arrival')
      .map((event) => event.reservation.id),
    [2],
  );
  assert.deepEqual(
    day
      .filter((event) => event.kind === 'departure')
      .map((event) => event.reservation.id),
    [1],
  );
  assert(day.every((event) => event.date === '2026-09-15'));
  assert.equal(agendaEvents(agenda, 'blocks', '2026-09-16').length, 0);
  assert.equal(
    agendaEvents(agenda, 'stays', '2026-09-15').some(
      (event) => event.reservation.id === 1,
    ),
    false,
  );
});
test('quotes do not appear as arrivals or departures and stays remain visible', () => {
  assert.equal(agendaEvents(agenda, 'arrivals', '2026-09-14').length, 0);
  assert.equal(agendaEvents(agenda, 'quotes', '2026-09-14').length, 1);
  assert.equal(agendaEvents(agenda, 'quotes', '2026-09-18').length, 0);
  assert(
    agendaEvents(agenda, 'all', '2026-09-09').some(
      (event) => event.kind === 'stay',
    ),
  );
});
test('search matches titular and cabin without case or accent differences', () => {
  assert.equal(agendaEvents(agenda, 'all', undefined, 'PEREZ').length, 6);
  assert.equal(agendaEvents(agenda, 'all', undefined, 'cabana 2').length, 1);
});
test('defaults use a single night, validate dates and preserve URL dates', () => {
  const defaults = initialFilters(new URLSearchParams('from=2026-09-08'));
  assert.deepEqual(defaults, {
    checkIn: '2026-09-08',
    checkOut: '2026-09-09',
    guests: '4',
  });
  assert.equal(
    initialFilters(
      new URLSearchParams('from=2026-09-08&to=2026-09-22&guests=6'),
    ).checkOut,
    '2026-09-22',
  );
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(validRange('2026-09-08', '2026-09-08'), false);
  assert.equal(validRange('2026-09-08', '2026-10-09'), true);
  assert.equal(validRange('2026-09-08', '2026-10-10'), false);
});
test('Colombia date and expiry are stable around UTC midnight', () => {
  assert.equal(todayIso(new Date('2026-09-09T02:30:00Z')), '2026-09-08');
  assert.equal(
    dateTimeBogota(new Date('2026-09-09T02:30:00Z')),
    '2026-09-08T21:30',
  );
});
test('free periods merge adjacent quoted nights but never cross occupied nights', () => {
  assert.deepEqual(
    freeRanges({
      segments: [
        { check_in: '2026-09-08', check_out: '2026-09-09', is_available: true },
        {
          check_in: '2026-09-09',
          check_out: '2026-09-10',
          is_available: true,
          quotes: [{ id: 2 }],
        },
        {
          check_in: '2026-09-10',
          check_out: '2026-09-15',
          is_available: false,
        },
        { check_in: '2026-09-15', check_out: '2026-09-18', is_available: true },
      ],
    }),
    [
      { check_in: '2026-09-08', check_out: '2026-09-10' },
      { check_in: '2026-09-15', check_out: '2026-09-18' },
    ],
  );
});

test('matrix keeps one bar per reservation across overlapping quotes and separates consecutive bookings', () => {
  const segments = [
    {
      check_in: '2026-09-08',
      check_out: '2026-09-09',
      state: 'reserved',
      reservation: { id: 1 },
      quotes: [],
    },
    {
      check_in: '2026-09-09',
      check_out: '2026-09-10',
      state: 'reserved',
      reservation: { id: 1 },
      quotes: [{ id: 3 }],
    },
    {
      check_in: '2026-09-10',
      check_out: '2026-09-11',
      state: 'reserved',
      reservation: { id: 2 },
      quotes: [{ id: 3 }],
    },
  ];
  const result = matrixSegments(segments);
  assert.equal(result.length, 2);
  assert.equal(result[0].check_out, '2026-09-10');
  assert.equal(result[1].reservation.id, 2);
  assert.deepEqual(result[0].quotes, [{ id: 3 }]);
  assert.equal(segments[0].check_out, '2026-09-09');
});
