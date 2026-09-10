import test from 'node:test';
import assert from 'node:assert/strict';
import { localDateIso, addLocalDays, readStayContext, stayHref } from '../src/lib/stay-context.ts';

test('arrival today remains valid after UTC midnight in Colombia', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-09T02:00:00Z') });
  assert.equal(localDateIso(), '2026-09-08');
  const context = readStayContext(new URLSearchParams('cabin_id=9&check_in=2026-09-08&check_out=2026-09-10&guests=100'));
  assert.deepEqual(context, { cabin_id: '9', guests: '100', check_in: '2026-09-08', check_out: '2026-09-10' });
  const link = new URL(stayHref('/contacto', context), 'https://example.test');
  assert.equal(link.searchParams.get('cabin_id'), '9');
  assert.equal(link.searchParams.get('guests'), '100');
  assert.equal(link.searchParams.get('check_in'), '2026-09-08');
  assert.equal(link.searchParams.get('check_out'), '2026-09-10');
});

test('invalid calendar dates, past stays and out-of-range guests are discarded', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-01-01T15:00:00Z') });
  for (const guests of ['0', '101', '2.5', '-1', 'abc']) {
    assert.equal(readStayContext(new URLSearchParams({ guests })).guests, undefined);
  }
  assert.deepEqual(readStayContext(new URLSearchParams('check_in=2026-02-30&check_out=2026-03-02')), {});
  assert.deepEqual(readStayContext(new URLSearchParams('check_in=2025-12-31&check_out=2026-01-02')), {});
  assert.deepEqual(readStayContext(new URLSearchParams('check_in=2026-01-02&check_out=2026-01-02')), { check_in: '2026-01-02' });
  assert.equal(addLocalDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addLocalDays('2026-12-31', 1), '2027-01-01');
});
