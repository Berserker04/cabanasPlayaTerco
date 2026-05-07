export type MapSlot =
  | 'cabana_1'
  | 'cabana_2'
  | 'cabana_3'
  | 'cabana_4'
  | 'cabana_5'
  | 'cabana_6'
  | 'cabana_7'
  | 'cabana_8';

export interface CabinType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number | null;
  image: string | null;
  is_active: boolean;
  sort_order: number;
  amenities?: Amenity[];
  media?: CabinMedia[];
  cabins_count?: number;
  available_cabins_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Cabin {
  id: number;
  cabin_type_id: number;
  name: string;
  slug: string;
  code: string;
  status: 'available' | 'occupied' | 'maintenance' | 'inactive';
  status_label?: string;
  floor: number | null;
  notes: string | null;
  cover_image: string | null;
  cover_image_path: string | null;
  short_description: string | null;
  description: string | null;
  guest_capacity: number;
  min_guests: number;
  max_guests: number;
  beds_count: number;
  bathrooms_count: number;
  map_slot: MapSlot | null;
  is_active: boolean;
  sort_order: number;
  type?: CabinType;
  amenities?: Amenity[];
  media?: CabinMedia[];
  created_at?: string;
  updated_at?: string;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string | null;
  category: string | null;
}

export interface CabinMedia {
  id: number;
  cabin_id: number | null;
  cabin_type_id: number;
  url: string;
  path: string | null;
  alt: string | null;
  type: 'image' | 'video';
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number;
}

export interface LodgingTariff {
  id: number;
  title: string;
  price_cop: number;
  unit_label: string;
  description: string | null;
  includes: string[];
  excludes: string[];
  public_notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type CabinStatus = Cabin['status'];
