import type { Metadata } from 'next';
import { api } from '@/lib/api';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type { GalleryAlbum, GalleryItem } from '@/types/gallery';
import { GalleryExperience } from './gallery-experience';

export const metadata: Metadata = {
  title: 'Galeria',
  description: 'Fotos, videos y albumes de Cabañas Playa Terco en Playa Terco, Nuqui.',
};

const fallbackAlbums: GalleryAlbum[] = [
  {
    id: 1,
    title: 'Cabañas entre selva y mar',
    slug: 'cabanas-entre-selva-y-mar',
    description: 'Rincones de descanso rodeados de vegetacion tropical, madera y brisa del Pacifico.',
    category: 'cabins',
    category_label: 'Cabañas',
    is_active: true,
    is_featured: true,
    sort_order: 1,
    cover_gallery_item_id: 1,
    cover_url: '/assets/imagenes/511133422_9990219471027675_1591650365955070210_n.jpg',
    items_count: 2,
    active_items_count: 2,
    images_count: 2,
    videos_count: 0,
  },
  {
    id: 2,
    title: 'Atardeceres de Playa Terco',
    slug: 'atardeceres-playa-terco',
    description: 'Luz dorada, palmeras y tardes frente al Pacifico chocoano.',
    category: 'beach',
    category_label: 'Playa',
    is_active: true,
    is_featured: false,
    sort_order: 2,
    cover_gallery_item_id: 3,
    cover_url: '/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg',
    items_count: 2,
    active_items_count: 2,
    images_count: 2,
    videos_count: 0,
  },
];

const fallbackItems: GalleryItem[] = [
  {
    id: 1,
    gallery_album_id: 1,
    album: fallbackAlbums[0],
    url: '/assets/imagenes/511133422_9990219471027675_1591650365955070210_n.jpg',
    path: null,
    thumbnail_url: '/assets/imagenes/511133422_9990219471027675_1591650365955070210_n.jpg',
    thumbnail_path: null,
    alt: 'Cabañas nativas rodeadas de jardin tropical',
    caption: 'Cabañas entre selva y mar para bajar el ritmo.',
    category: 'cabins',
    category_label: 'Cabañas',
    type: 'image',
    mime_type: 'image/jpeg',
    size_bytes: null,
    sort_order: 1,
    is_featured: true,
    is_active: true,
  },
  {
    id: 2,
    gallery_album_id: 1,
    album: fallbackAlbums[0],
    url: '/assets/imagenes/54516895_2086105884772446_8521564931760324608_n.jpg',
    path: null,
    thumbnail_url: '/assets/imagenes/54516895_2086105884772446_8521564931760324608_n.jpg',
    thumbnail_path: null,
    alt: 'Entrada a las cabañas con vegetacion tropical',
    caption: 'Senderos sencillos entre arena, plantas y descanso.',
    category: 'cabins',
    category_label: 'Cabañas',
    type: 'image',
    mime_type: 'image/jpeg',
    size_bytes: null,
    sort_order: 2,
    is_featured: false,
    is_active: true,
  },
  {
    id: 3,
    gallery_album_id: 2,
    album: fallbackAlbums[1],
    url: '/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg',
    path: null,
    thumbnail_url: '/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg',
    thumbnail_path: null,
    alt: 'Atardecer entre palmeras frente al Pacifico',
    caption: 'Tardes lentas mirando el horizonte de Playa Terco.',
    category: 'beach',
    category_label: 'Playa',
    type: 'image',
    mime_type: 'image/jpeg',
    size_bytes: null,
    sort_order: 1,
    is_featured: true,
    is_active: true,
  },
  {
    id: 4,
    gallery_album_id: 2,
    album: fallbackAlbums[1],
    url: '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg',
    path: null,
    thumbnail_url: '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg',
    thumbnail_path: null,
    alt: 'Vista de Playa Terco y cabañas frente al mar',
    caption: 'La playa como parte natural de la estadia.',
    category: 'beach',
    category_label: 'Playa',
    type: 'image',
    mime_type: 'image/jpeg',
    size_bytes: null,
    sort_order: 2,
    is_featured: false,
    is_active: true,
  },
];

async function getGalleryData(): Promise<{
  albums: GalleryAlbum[];
  items: GalleryItem[];
}> {
  try {
    const [albumsResponse, itemsResponse] = await Promise.all([
      api.get<ApiResponse<GalleryAlbum[]>>('/gallery/albums', {
        next: { revalidate: 60 },
      }),
      api.get<ApiListResponse<GalleryItem>>('/gallery?per_page=60', {
        next: { revalidate: 60 },
      }),
    ]);

    return {
      albums: albumsResponse.data.length > 0 ? albumsResponse.data : fallbackAlbumsWithItems(),
      items: itemsResponse.data.length > 0 ? itemsResponse.data : fallbackItems,
    };
  } catch {
    return {
      albums: fallbackAlbumsWithItems(),
      items: fallbackItems,
    };
  }
}

function fallbackAlbumsWithItems(): GalleryAlbum[] {
  return fallbackAlbums.map((album) => ({
    ...album,
    items: fallbackItems.filter((item) => item.gallery_album_id === album.id),
  }));
}

export default async function GalleryPage() {
  const { albums, items } = await getGalleryData();

  return <GalleryExperience albums={albums} items={items} />;
}
