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
}

export interface Cabin {
  id: number;
  cabin_type_id: number;
  name: string;
  code: string;
  status: 'available' | 'occupied' | 'maintenance' | 'inactive';
  floor: number | null;
  notes: string | null;
  type?: CabinType;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string | null;
  category: string | null;
}

export interface CabinMedia {
  id: number;
  cabin_type_id: number;
  url: string;
  alt: string | null;
  type: 'image' | 'video';
  sort_order: number;
}
