import {
  stayFromSearchParams,
  type StaySearchParams,
} from '@/lib/stay-context';
import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { MAP_FEATURE_OPTIONS } from '@/lib/map-features';
import { CabinCatalog } from './cabin-catalog';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type { PublicCabin as Cabin, LodgingTariff } from '@/types/cabin';
import type { GalleryItem } from '@/types/gallery';
import type { MapFeatureKey } from '@/types/map-feature';

export const metadata: Metadata = {
  title: 'Cabañas',
  description:
    'Descubre las cabañas reales de Cabañas Playa Terco frente al mar en Choco.',
};

async function getCabins(): Promise<Cabin[]> {
  const response = await api.get<ApiResponse<Cabin[]>>('/cabins', {
    cache: 'no-store',
  });
  return response.data;
}

async function getTariffs(): Promise<LodgingTariff[]> {
  try {
    const response = await api.get<ApiResponse<LodgingTariff[]>>(
      '/lodging-tariffs',
      {
        cache: 'no-store',
      },
    );

    return response.data;
  } catch {
    return [];
  }
}

async function getMapFeatureMedia(): Promise<
  Partial<Record<MapFeatureKey, GalleryItem[]>>
> {
  try {
    const responses = await Promise.all(
      MAP_FEATURE_OPTIONS.map(async (feature) => {
        const response = await api.get<ApiListResponse<GalleryItem>>(
          `/gallery?per_page=20&map_point=${feature.value}&type=image`,
          {
            cache: 'no-store',
          },
        );

        return [feature.value, response.data] as const;
      }),
    );

    return Object.fromEntries(responses) as Partial<
      Record<MapFeatureKey, GalleryItem[]>
    >;
  } catch {
    return {};
  }
}

export default async function CabinsPage({
  searchParams,
}: {
  searchParams: StaySearchParams;
}) {
  const context = await stayFromSearchParams(searchParams);
  const [cabins, tariffs, mapFeatureMedia] = await Promise.all([
    getCabins(),
    getTariffs(),
    getMapFeatureMedia(),
  ]);

  return (
    <CabinCatalog
      initialContext={context}
      cabins={cabins}
      tariffs={tariffs}
      mapFeatureMedia={mapFeatureMedia}
    />
  );
}
