import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generalQuoteContext,
  generalQuoteMessage,
  generalQuotePayload,
  DEFAULT_QUOTE_MESSAGE,
} from '../src/lib/general-quote.ts';
import {
  stayHref,
  staySearchErrors,
  isStayDate,
} from '../src/lib/stay-context.ts';

test('old cabin-specific links become general quotes without losing the stay', () => {
  const context = generalQuoteContext({
    cabin_id: '999',
    cabin_type_id: '7',
    check_in: '2030-06-10',
    check_out: '2030-06-12',
    guests: '12',
  });
  assert.equal(
    stayHref('/contacto', context),
    '/contacto?check_in=2030-06-10&check_out=2030-06-12&guests=12',
  );
  assert.equal('cabin_id' in context, false);
  assert.equal('cabin_type_id' in context, false);
});
test('quote messages preserve the group context with simple visitor-facing language', () => {
  const text = generalQuoteMessage(
    {
      name: 'Ana',
      check_in: '2030-06-10',
      check_out: '2030-06-12',
      guests: 100,
      cabin_id: 2,
      message: 'Podemos revisar otras fechas.',
    },
    'Playa Terco',
  );
  assert(text.includes('una cotización para mi grupo'));
  assert(text.includes('Huéspedes: 100'));
  assert(text.includes('2030-06-10 a 2030-06-12'));
  assert(text.includes('Quedo pendiente de su respuesta'));
  assert(!text.includes('Cabaña:'));
  assert(!text.includes('undefined'));
  assert.equal(decodeURIComponent(encodeURIComponent(text)), text);
});
test('general web payload only contains contact and group fields, never assignments', () => {
  const payload = generalQuotePayload({
    name: 'Ana',
    email: 'ana@example.test',
    phone: '',
    message: DEFAULT_QUOTE_MESSAGE,
    guests_count: 100,
    check_in: '2030-06-10',
    check_out: '2030-06-12',
    cabin_id: 1,
    cabin_type_id: 2,
    cabin_ids: [1, 2],
    status: 'confirmed',
  });
  assert.deepEqual(Object.keys(payload), [
    'name',
    'email',
    'message',
    'check_in',
    'check_out',
    'guests_count',
  ]);
  assert.equal(payload.guests_count, 100);
});
test('public search rejects impossible dates and invalid groups while preserving valid boundaries', () => {
  const stay = {
    check_in: '2030-06-10',
    check_out: '2030-06-12',
    guests: '12',
  };
  for (const guests of ['1', '100'])
    assert.deepEqual(staySearchErrors({ ...stay, guests }, '2030-06-10'), {});
  for (const guests of ['', '0', '101', '2.5', '-1', 'abc'])
    assert(staySearchErrors({ ...stay, guests }, '2030-06-10').guests);
  assert.equal(isStayDate('2030-02-30'), false);
  assert.equal(isStayDate('2032-02-29'), true);
  assert(
    staySearchErrors({ ...stay, check_in: '2030-06-09' }, '2030-06-10')
      .check_in,
  );
  assert(
    staySearchErrors({ ...stay, check_out: '2030-06-10' }, '2030-06-10')
      .check_out,
  );
  assert(
    staySearchErrors({ ...stay, check_in: '2030-02-30' }, '2030-01-01')
      .check_in,
  );
});
