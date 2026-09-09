import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agendaEvents,
  initialWorkspace,
  operationParams,
  operationQueryPeriod,
  operationStayFilters,
  operationWeek,
  todayIso,
  validOperationRange,
} from '../src/app/(admin)/admin/disponibilidad/availability-model.ts';

const today = '2026-09-09';
const workspace = (query = '', hash = '') =>
  initialWorkspace(new URLSearchParams(query), hash, today);
const serialize = (period, filters, mode = 'operation') => {
  const params = new URLSearchParams({
    mode,
    from: filters.checkIn,
    to: filters.checkOut,
    guests: filters.guests,
  });
  for (const [key, value] of Object.entries(operationParams(period))) {
    if (value !== undefined) params.set(key, value);
  }
  return params.toString();
};

test('operation defaults to today and six following dates, with a one-night stay', () => {
  for (const query of ['', 'mode=operation', 'guests=6']) {
    const result = workspace(query);
    assert.equal(result.mode, 'operation');
    assert.deepEqual(result.operation, {
      from: today,
      to: '2026-09-15',
      preset: 'week',
    });
    assert.equal(result.filters.checkIn, today);
    assert.equal(result.filters.checkOut, '2026-09-10');
    assert.equal(
      operationStayFilters(result.operation, '6').checkOut,
      '2026-09-10',
    );
  }
});

test('rolling seven-day periods cross month, year and leap-day boundaries', () => {
  for (const [from, to] of [
    ['2026-09-28', '2026-10-04'],
    ['2026-12-29', '2027-01-04'],
    ['2028-02-26', '2028-03-03'],
  ])
    assert.deepEqual(operationWeek(from), { from, to, preset: 'week' });
  assert.equal(todayIso(new Date('2026-09-09T04:59:59Z')), '2026-09-08');
  assert.equal(todayIso(new Date('2026-09-09T05:00:00Z')), '2026-09-09');
});

test('legacy daily URLs prioritize date over shared search dates', () => {
  const result = workspace(
    'mode=operation&from=2026-09-08&to=2026-09-14&guests=4&date=2026-09-08',
  );
  assert.deepEqual(result.operation, {
    from: '2026-09-08',
    to: '2026-09-08',
    preset: 'day',
  });
  assert.equal(result.filters.checkOut, '2026-09-09');
  assert.equal(workspace('date=2026-08-20').operation.from, '2026-08-20');
  assert.equal(
    workspace('mode=operation&from=2026-08-20').operation.to,
    '2026-08-20',
  );
});

test('legacy range and hash agenda links keep both endpoints', () => {
  for (const [query, hash] of [
    [
      'mode=operation&period=range&from=2026-09-08&to=2026-09-14&date=2026-09-01',
      '',
    ],
    ['from=2026-09-08&to=2026-09-14', '#agenda'],
  ]) {
    const result = workspace(query, hash);
    assert.equal(result.mode, 'operation');
    assert.deepEqual(result.operation, {
      from: '2026-09-08',
      to: '2026-09-14',
      preset: 'range',
    });
    assert.equal(result.filters.checkOut, '2026-09-09');
  }
  assert.equal(
    workspace('mode=availability&from=2026-09-08&to=2026-09-14', '#agenda')
      .mode,
    'availability',
  );
});

test('search links keep checkout-exclusive dates and do not set operation dates', () => {
  for (const prefix of ['', 'mode=availability&']) {
    const result = workspace(`${prefix}from=2026-10-01&to=2026-10-12&guests=8`);
    assert.equal(result.mode, 'availability');
    assert.deepEqual(result.filters, {
      checkIn: '2026-10-01',
      checkOut: '2026-10-12',
      guests: '8',
    });
    assert.deepEqual(result.operation, operationWeek(today));
  }
  assert.equal(workspace('view=map').mode, 'availability');
});

test('canonical URLs round-trip each preset independently of search dates and midnight', () => {
  const filters = {
    checkIn: '2026-10-01',
    checkOut: '2026-10-12',
    guests: '8',
  };
  for (const period of [
    operationWeek(today),
    { from: today, to: today, preset: 'day' },
    { from: '2026-08-20', to: '2026-08-20', preset: 'range' },
    { from: '2026-08-20', to: '2026-09-20', preset: 'range' },
  ]) {
    for (const mode of ['operation', 'availability']) {
      const query = serialize(period, filters, mode);
      const result = initialWorkspace(
        new URLSearchParams(query),
        '',
        '2026-09-10',
      );
      assert.deepEqual(result, { mode, operation: period, filters });
    }
  }
});

test('operational ranges allow one date and reject invalid, reversed or excessive intervals', () => {
  assert.equal(validOperationRange(today, today), true);
  assert.equal(validOperationRange(today, '2026-10-10'), true);
  for (const [from, to] of [
    [today, '2026-10-11'],
    [today, '2026-09-08'],
    ['', today],
    [today, ''],
    ['2026-02-30', '2026-03-01'],
  ]) {
    assert.equal(validOperationRange(from, to), false);
  }
  const invalid = workspace(
    'mode=operation&operation_from=2026-02-30&operation_to=nope',
  );
  assert.deepEqual(invalid.operation, operationWeek(today));
});

test('one-date query uses the daily API adapter; custom ranges retain inclusive endpoints', () => {
  assert.deepEqual(
    operationQueryPeriod({ from: today, to: today, preset: 'range' }),
    {
      from: today,
      to: '2026-09-10',
      day: today,
    },
  );
  assert.deepEqual(operationQueryPeriod(operationWeek(today)), {
    from: today,
    to: '2026-09-15',
    day: undefined,
  });
});

test('seven-date agenda includes boundary movements and overlapping stays, quotes and blocks', () => {
  const reservation = (id, check_in, check_out, status = 'confirmed') => ({
    id,
    check_in,
    check_out,
    status,
    leader_name: 'Prueba',
    cabin_names: ['Cabaña'],
    cabin_ids: [1],
  });
  const agenda = {
    period: { from: today, to: '2026-09-15' },
    reservations: [
      reservation(1, '2026-09-08', today),
      reservation(2, today, '2026-09-15'),
      reservation(3, '2026-09-15', '2026-09-17'),
      reservation(4, '2026-09-16', '2026-09-18'),
      reservation(5, '2026-09-01', '2026-09-30'),
      reservation(6, '2026-09-10', '2026-09-12', 'pending'),
    ],
    blocks: [
      {
        id: 1,
        check_in: '2026-09-15',
        check_out: '2026-09-16',
        reason: 'Mantenimiento',
        cabin_names: ['Cabaña'],
      },
      {
        id: 2,
        check_in: '2026-09-08',
        check_out: today,
        reason: 'Finalizado',
        cabin_names: ['Cabaña'],
      },
    ],
  };
  const events = agendaEvents(agenda);
  assert.deepEqual(
    events.filter((e) => e.kind === 'arrival').map((e) => e.reservation.id),
    [2, 3],
  );
  assert.deepEqual(
    events.filter((e) => e.kind === 'departure').map((e) => e.reservation.id),
    [1, 2],
  );
  assert.deepEqual(
    events.filter((e) => e.kind === 'stay').map((e) => e.reservation.id),
    [5],
  );
  assert.deepEqual(
    events.filter((e) => e.kind === 'quote').map((e) => e.reservation.id),
    [6],
  );
  assert.deepEqual(
    events.filter((e) => e.kind === 'block').map((e) => e.block.id),
    [1],
  );
  assert.equal(
    events.some((e) => e.reservation?.id === 4),
    false,
  );
  assert(agendaEvents(agenda, 'all', today).every((e) => e.date === today));
});
