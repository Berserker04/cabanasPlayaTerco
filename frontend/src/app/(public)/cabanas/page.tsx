import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { CabinCatalog } from './cabin-catalog';
import type { ApiResponse } from '@/types/api';
import type { CabinType } from '@/types/cabin';

export const metadata: Metadata = {
  title: 'Cabañas',
  description: 'Descubre nuestras cabañas frente al mar en Playa Terco, Chocó.',
};

async function getCabinTypes(): Promise<CabinType[]> {
  try {
    const response = await api.get<ApiResponse<CabinType[]>>('/cabins', {
      next: { revalidate: 60 },
    });

    return response.data;
  } catch {
    return [];
  }
}

export default async function CabinsPage() {
  const cabinTypes = await getCabinTypes();

  return <CabinCatalog cabinTypes={cabinTypes} />;
}
