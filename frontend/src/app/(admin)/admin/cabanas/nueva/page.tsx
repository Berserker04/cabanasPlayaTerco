import { CabinFormPage } from '../cabin-form-page';

export default async function NewCabinPage({ searchParams }: { searchParams: Promise<{ map_slot?: string }> }) {
  const { map_slot } = await searchParams;
  return <CabinFormPage mode="create" initialMapSlot={map_slot} />;
}
