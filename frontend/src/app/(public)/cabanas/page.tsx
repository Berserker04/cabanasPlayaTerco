import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { CabinCatalog } from './cabin-catalog';
import type { ApiResponse } from '@/types/api';
import type { Cabin, LodgingTariff } from '@/types/cabin';

export const metadata: Metadata = {
  title: 'Cabañas',
  description: 'Descubre las cabañas reales de Cabañas Playa Terco frente al mar en Choco.',
};

async function getCabins(): Promise<Cabin[]> {
  try {
    const response = await api.get<ApiResponse<Cabin[]>>('/cabins', {
      next: { revalidate: 60 },
    });

    return response.data;
  } catch {
    return [];
  }
}

async function getTariffs(): Promise<LodgingTariff[]> {
  try {
    const response = await api.get<ApiResponse<LodgingTariff[]>>('/lodging-tariffs', {
      next: { revalidate: 60 },
    });

    return response.data;
  } catch {
    return [];
  }
}

export default async function CabinsPage() {
  const [cabins, tariffs] = await Promise.all([getCabins(), getTariffs()]);

  return <CabinCatalog cabins={cabins} tariffs={tariffs} />;
}
