import type { StayContext } from './stay-context';

export const QUOTE_NOTICE = 'La disponibilidad está sujeta a confirmación.';
export const DEFAULT_QUOTE_MESSAGE =
  'Quisiera conocer el valor de una estadía para mi grupo y las opciones disponibles.';

export function generalQuoteContext(context: StayContext) {
  return {
    check_in: context.check_in,
    check_out: context.check_out,
    guests: context.guests,
  };
}

export function generalQuoteMessage(
  values: {
    check_in?: string;
    check_out?: string;
    guests?: string | number;
    name?: string;
    message?: string;
  },
  siteName: string,
) {
  const lines = [`Hola, quisiera una cotización para mi grupo en ${siteName}.`];
  if (values.name?.trim()) lines.push(`Mi nombre es ${values.name.trim()}.`);
  if (values.check_in && values.check_out)
    lines.push(`Fechas: ${values.check_in} a ${values.check_out}.`);
  if (values.guests) lines.push(`Huéspedes: ${values.guests}.`);
  if (values.message?.trim()) lines.push(`Mensaje: ${values.message.trim()}`);
  lines.push('Gracias. Quedo pendiente de su respuesta.');
  return lines.join('\n');
}

/** A public web request never assigns a cabin, including older incoming links. */
export function generalQuotePayload(values: Record<string, unknown>) {
  return Object.fromEntries(
    [
      'name',
      'email',
      'phone',
      'message',
      'check_in',
      'check_out',
      'guests_count',
    ]
      .filter((key) => values[key] !== undefined && values[key] !== '')
      .map((key) => [key, values[key]]),
  );
}
