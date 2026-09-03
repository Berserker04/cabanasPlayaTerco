import { CabinFormPage } from '../cabin-form-page';
import type { MapSlot } from '@/types/cabin';

const mapSlots = new Set<MapSlot>([
  'cabana_1',
  'cabana_2',
  'cabana_3',
  'cabana_4',
  'cabana_5',
  'cabana_6',
  'cabana_7',
  'cabana_8',
]);

export default async function NewCabinPage({
  searchParams,
}: {
  searchParams: Promise<{ map_slot?: string }>;
}) {
  const { map_slot: requestedMapSlot } = await searchParams;
  const initialMapSlot = mapSlots.has(requestedMapSlot as MapSlot)
    ? (requestedMapSlot as MapSlot)
    : undefined;

  return <CabinFormPage mode="create" initialMapSlot={initialMapSlot} />;
}
