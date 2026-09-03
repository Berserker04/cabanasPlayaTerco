import { CabinFormPage } from '../../cabin-form-page';

export default async function EditCabinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CabinFormPage mode="edit" cabinId={Number(id)} />;
}
