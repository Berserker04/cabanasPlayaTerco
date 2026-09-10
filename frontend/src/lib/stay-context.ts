import { MAX_GROUP_GUESTS } from './guest-limits.js';

export { MAX_GROUP_GUESTS };

export type StayContext = {
  cabin_id?: string;
  check_in?: string;
  check_out?: string;
  guests?: string;
};
export type StaySearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function stayFromSearchParams(
  params: StaySearchParams,
): Promise<StayContext> {
  const values = await params;
  return readStayContext({
    get: (key) => (typeof values[key] === 'string' ? values[key] : null),
  });
}

export function localDateIso(date?: Date) {
  if (!date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const part = (type: string) =>
      parts.find((value) => value.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addLocalDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDateIso(value);
}

export function isStayDate(value: string | null | undefined): value is string {
  return Boolean(
    value &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      localDateIso(new Date(`${value}T12:00:00`)) === value,
  );
}

export function staySearchErrors(context: StayContext, today = localDateIso()) {
  const errors: Partial<Record<'check_in' | 'check_out' | 'guests', string>> =
    {};
  if (!isStayDate(context.check_in))
    errors.check_in = 'Indica una fecha de llegada válida.';
  else if (context.check_in < today)
    errors.check_in = 'La llegada debe ser hoy o posterior.';
  if (!isStayDate(context.check_out))
    errors.check_out = 'Indica una fecha de salida válida.';
  else if (
    isStayDate(context.check_in) &&
    context.check_out <= context.check_in
  )
    errors.check_out = 'La salida debe ser posterior a la llegada.';
  if (
    !context.guests ||
    !/^\d+$/.test(context.guests) ||
    Number(context.guests) < 1 ||
    Number(context.guests) > MAX_GROUP_GUESTS
  )
    errors.guests = `Indica entre 1 y ${MAX_GROUP_GUESTS} huéspedes.`;
  return errors;
}

export function readStayContext(
  params: URLSearchParams | { get(name: string): string | null },
): StayContext {
  const result: StayContext = {};
  const cabin = params.get('cabin_id');
  const guests = params.get('guests');
  const arrival = params.get('check_in');
  const departure = params.get('check_out');
  if (cabin && /^\d+$/.test(cabin) && Number(cabin) > 0)
    result.cabin_id = cabin;
  if (
    guests &&
    /^\d+$/.test(guests) &&
    Number(guests) >= 1 &&
    Number(guests) <= MAX_GROUP_GUESTS
  )
    result.guests = guests;
  if (isStayDate(arrival) && arrival >= localDateIso())
    result.check_in = arrival;
  if (isStayDate(departure) && result.check_in && departure > result.check_in)
    result.check_out = departure;
  return result;
}

export function stayHref(path: string, context: StayContext) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(context))
    if (value) params.set(key, value);
  return `${path}${params.size ? `?${params.toString()}` : ''}`;
}
