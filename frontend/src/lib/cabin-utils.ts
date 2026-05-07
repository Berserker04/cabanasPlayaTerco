import { SITE_NAME, WHATSAPP_URL } from '@/lib/constants';
import type { Cabin, MapSlot } from '@/types/cabin';

export const CABIN_FALLBACK_IMAGES = [
  '/assets/imagenes/511133422_9990219471027675_1591650365955070210_n.jpg',
  '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg',
  '/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg',
  '/assets/imagenes/54516895_2086105884772446_8521564931760324608_n.jpg',
] as const;

export const MAP_SLOT_LABELS: Record<MapSlot, string> = {
  cabana_1: 'Cabaña 1',
  cabana_2: 'Cabaña 2',
  cabana_3: 'Cabaña 3',
  cabana_4: 'Cabaña 4',
  cabana_5: 'Cabaña 5',
  cabana_6: 'Cabaña 6',
  cabana_7: 'Cabaña 7',
  cabana_8: 'Cabaña 8',
};

export const MAP_SLOT_OPTIONS = Object.entries(MAP_SLOT_LABELS).map(([value, label]) => ({
  value: value as MapSlot,
  label,
}));

export function formatCurrencyCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getCabinCover(cabin: Pick<Cabin, 'id' | 'cover_image' | 'media'>) {
  const mediaImage = cabin.media?.find((item) => item.type === 'image')?.url;

  return (
    cabin.cover_image ||
    mediaImage ||
    CABIN_FALLBACK_IMAGES[Math.abs(cabin.id) % CABIN_FALLBACK_IMAGES.length]
  );
}

export function buildCabinWhatsAppHref(
  cabin?: Pick<Cabin, 'name'>,
  dates?: {
    checkIn?: string;
    checkOut?: string;
    guests?: number | string;
  },
) {
  const lines = [`Hola, quiero consultar disponibilidad en ${SITE_NAME}.`];

  if (cabin?.name) {
    lines.push(`Cabaña: ${cabin.name}.`);
  }

  if (dates?.checkIn && dates?.checkOut) {
    lines.push(`Fechas: ${dates.checkIn} a ${dates.checkOut}.`);
  }

  if (dates?.guests) {
    lines.push(`Huespedes: ${dates.guests}.`);
  }

  return `${WHATSAPP_URL}?text=${encodeURIComponent(lines.join('\n'))}`;
}
