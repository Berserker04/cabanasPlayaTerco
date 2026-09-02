import type { GalleryCategory } from '@/types/gallery';
import type { MapFeatureKey } from '@/types/map-feature';

export const MAP_FEATURE_LABELS: Record<MapFeatureKey, string> = {
  kiosco: 'Kiosco',
  cocina_comedor: 'Cocina y Comedor',
};

export const MAP_FEATURE_GALLERY_CATEGORIES: Record<MapFeatureKey, GalleryCategory> = {
  kiosco: 'general',
  cocina_comedor: 'food',
};

export const MAP_FEATURE_OPTIONS = Object.entries(MAP_FEATURE_LABELS).map(([value, label]) => ({
  value: value as MapFeatureKey,
  label,
}));
