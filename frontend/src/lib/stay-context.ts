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
    Number(guests) <= 50
  )
    result.guests = guests;
  const validDate = (value: string | null): value is string =>
    Boolean(
      value &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      localDateIso(new Date(`${value}T12:00:00`)) === value,
    );
  if (validDate(arrival) && arrival >= localDateIso())
    result.check_in = arrival;
  if (validDate(departure) && result.check_in && departure > result.check_in)
    result.check_out = departure;
  return result;
}

export function stayHref(path: string, context: StayContext) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(context))
    if (value) params.set(key, value);
  return `${path}${params.size ? `?${params.toString()}` : ''}`;
}
