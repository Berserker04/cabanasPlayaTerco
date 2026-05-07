import type { User } from './user';

export type GalleryCategory =
  | 'cabins'
  | 'beach'
  | 'nature'
  | 'food'
  | 'activities'
  | 'events'
  | 'general';

export type GalleryMediaType = 'image' | 'video';

export type GalleryAlbum = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category: GalleryCategory;
  category_label: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  cover_gallery_item_id: number | null;
  cover_url: string | null;
  cover_item?: GalleryItem | null;
  items?: GalleryItem[];
  items_count?: number;
  active_items_count?: number;
  images_count?: number;
  videos_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type GalleryItem = {
  id: number;
  gallery_album_id: number | null;
  album?: GalleryAlbum | null;
  url: string;
  path: string | null;
  thumbnail_url: string | null;
  thumbnail_path: string | null;
  alt: string | null;
  caption: string | null;
  category: GalleryCategory;
  category_label: string;
  type: GalleryMediaType;
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  uploader?: User | null;
  created_at?: string;
  updated_at?: string;
};

export const GALLERY_CATEGORIES: Array<{ value: GalleryCategory; label: string }> = [
  { value: 'cabins', label: 'Cabañas' },
  { value: 'beach', label: 'Playa' },
  { value: 'nature', label: 'Naturaleza' },
  { value: 'food', label: 'Gastronomia' },
  { value: 'activities', label: 'Actividades' },
  { value: 'events', label: 'Eventos' },
  { value: 'general', label: 'General' },
];

export const GALLERY_MEDIA_TYPES: Array<{ value: GalleryMediaType; label: string }> = [
  { value: 'image', label: 'Fotos' },
  { value: 'video', label: 'Videos' },
];
