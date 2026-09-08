import type {
  AvailabilityAgenda,
  AvailabilityAgendaBlock,
  AvailabilityAgendaReservation,
  PlannerCabin,
  PlannerSegment,
} from '@/types/cabin';

export type AvailabilityFilters = {
  checkIn: string;
  checkOut: string;
  guests: string;
};
export type AvailabilityMode = 'operation' | 'availability';
export type AvailabilityView = 'auto' | 'list' | 'matrix' | 'map';
export type AgendaFilter =
  | 'all'
  | 'arrivals'
  | 'departures'
  | 'stays'
  | 'quotes'
  | 'blocks';
export type ReservationEventKind = 'arrival' | 'departure' | 'stay' | 'quote';
export type AgendaEvent =
  | {
      key: string;
      kind: ReservationEventKind;
      date: string;
      reservation: AvailabilityAgendaReservation;
    }
  | {
      key: string;
      kind: 'block';
      date: string;
      block: AvailabilityAgendaBlock;
    };

export const MAX_RANGE_DAYS = 31;
export const reservationSources: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Llamada telefónica',
  walk_in: 'Presencial',
  web: 'Página web',
  social_media: 'Redes sociales',
  referral: 'Recomendación',
  other: 'Otro',
};
export const validContactPhone = (value: string) =>
  !value.trim() || /^\+?(?:[ ()-]*\d){7,15}[ ()-]*$/.test(value.trim());
export const toDate = (date: string) => new Date(`${date}T00:00:00Z`);
export const rangeLength = (from: string, to: string) =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
export function isIsoDate(value: string | null): value is string {
  return Boolean(
    value &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(toDate(value).getTime()) &&
      toDate(value).toISOString().startsWith(value),
  );
}
export function addDaysIso(date: string, days: number) {
  if (!isIsoDate(date)) return '';
  const value = toDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function dateTimeBogota(value = new Date(Date.now() + 48 * 3_600_000)) {
  return `${todayIso(value)}T${new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(value)}`;
}
export function formatDate(value: string, short = false) {
  if (!isIsoDate(value)) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    ...(!short && { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(toDate(value));
}
export const formatRange = (from: string, to: string) =>
  `${formatDate(from)} – ${formatDate(to)}`;
export function validRange(from: string, to: string) {
  return (
    isIsoDate(from) &&
    isIsoDate(to) &&
    rangeLength(from, to) > 0 &&
    rangeLength(from, to) <= MAX_RANGE_DAYS
  );
}
export function initialFilters(params: URLSearchParams): AvailabilityFilters {
  const from = params.get('from');
  const to = params.get('to');
  const checkIn = isIsoDate(from) ? from : todayIso();
  const checkOut = to && validRange(checkIn, to) ? to : addDaysIso(checkIn, 1);
  const guests = Number(params.get('guests'));
  return {
    checkIn,
    checkOut,
    guests:
      Number.isInteger(guests) && guests > 0 && guests <= 50
        ? String(guests)
        : '4',
  };
}
export function buildQuery(
  params: Record<string, string | number | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== '') query.set(key, String(value));
  return `?${query.toString()}`;
}
export const normalizeSearch = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Availability uses checkout-exclusive nights. Adjacent free segments may differ only by quotes. */
export function freeRanges(cabin: PlannerCabin) {
  const ranges: Array<{ check_in: string; check_out: string }> = [];
  for (const segment of cabin.segments) {
    if (!segment.is_available) continue;
    const previous = ranges.at(-1);
    if (previous?.check_out === segment.check_in)
      previous.check_out = segment.check_out;
    else
      ranges.push({ check_in: segment.check_in, check_out: segment.check_out });
  }
  return ranges;
}

/** Quotes can split API segments; an occupied reservation still has one continuous bar. */
export function matrixSegments(segments: PlannerSegment[]) {
  const result: PlannerSegment[] = [];
  for (const segment of segments) {
    const previous = result.at(-1);
    if (
      segment.state === 'reserved' &&
      previous?.state === 'reserved' &&
      segment.reservation?.id === previous.reservation?.id &&
      previous.check_out === segment.check_in
    ) {
      previous.check_out = segment.check_out;
      previous.quotes = [
        ...new Map(
          [...previous.quotes, ...segment.quotes].map((quote) => [
            quote.id,
            quote,
          ]),
        ).values(),
      ];
    } else result.push({ ...segment, quotes: [...segment.quotes] });
  }
  return result;
}

/** A range includes both boundary movement dates; a daily query narrows its inclusive API response to exactly one day. */
export function agendaEvents(
  agenda: AvailabilityAgenda,
  filter: AgendaFilter = 'all',
  day?: string,
  search = '',
): AgendaEvent[] {
  const from = day ?? agenda.period.from;
  const to = day ?? agenda.period.to;
  const inPeriod = (date: string) => date >= from && date <= to;
  const events: AgendaEvent[] = [];
  for (const reservation of agenda.reservations) {
    const event = (kind: ReservationEventKind, date: string) =>
      events.push({
        key: `${kind}-${reservation.id}`,
        kind,
        date,
        reservation,
      });
    const overlaps = reservation.check_in <= to && reservation.check_out > from;
    if (reservation.status === 'pending') {
      if (overlaps && (filter === 'all' || filter === 'quotes'))
        event(
          'quote',
          reservation.check_in < from ? from : reservation.check_in,
        );
      continue;
    }
    const arrival = inPeriod(reservation.check_in);
    const departure = inPeriod(reservation.check_out);
    if (arrival && (filter === 'all' || filter === 'arrivals'))
      event('arrival', reservation.check_in);
    if (departure && (filter === 'all' || filter === 'departures'))
      event('departure', reservation.check_out);
    if (
      overlaps &&
      (filter === 'stays' || (filter === 'all' && !arrival && !departure))
    )
      event('stay', reservation.check_in < from ? from : reservation.check_in);
  }
  if (filter === 'all' || filter === 'blocks') {
    for (const block of agenda.blocks) {
      if (block.check_in <= to && block.check_out > from)
        events.push({
          key: `block-${block.id}`,
          kind: 'block',
          date: block.check_in < from ? from : block.check_in,
          block,
        });
    }
  }
  const term = normalizeSearch(search);
  return events
    .filter((event) => {
      const title =
        event.kind === 'block'
          ? event.block.reason
          : (event.reservation.leader_name ?? '');
      const cabins =
        event.kind === 'block'
          ? event.block.cabin_names
          : event.reservation.cabin_names;
      return normalizeSearch(`${title} ${cabins.join(' ')}`).includes(term);
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.kind.localeCompare(b.kind) ||
        a.key.localeCompare(b.key),
    );
}
