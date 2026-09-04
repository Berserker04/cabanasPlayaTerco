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

export type AvailabilityState = 'available' | 'reserved' | 'blocked' | 'maintenance' | 'inactive';
export type AvailabilityTone = 'green' | 'red' | 'orange' | 'gray';

export interface CabinAvailabilityEntry {
  cabin_id: number;
  map_slot: MapSlot | null;
  state: AvailabilityState;
  tone: AvailabilityTone;
  label: string;
  is_available: boolean;
  fits_guests: boolean;
  leader_name: string | null;
  display_color: string | null;
  reservation: {
    id: number;
    status: import('./reservation').ReservationStatus;
    status_label: string;
    leader_name: string | null;
    display_color: string | null;
    check_in: string;
    check_out: string;
    guests_count: number;
    expires_at: string | null;
    confirmed_at: string | null;
    is_expired_quote: boolean;
    expires_soon: boolean;
  } | null;
  block: {
    id: number;
    reason: string;
    notes: string | null;
    applies_to_all: boolean;
  } | null;
  cabin: Cabin;
}

export interface AvailabilitySummary {
  total_cabins: number;
  available_count: number;
  reserved_count: number;
  quoted_count?: number;
  confirmed_count?: number;
  blocked_count: number;
  inactive_count: number;
  available_capacity: number;
  can_host_guests: boolean;
}

export interface AvailabilityResult {
  check_in: string;
  check_out: string;
  guests: number | null;
  cabins: CabinAvailabilityEntry[];
  available_cabins: CabinAvailabilityEntry[];
  summary: AvailabilitySummary;
  message: string;
}

export interface PlannerReservation {
  id: number;
  status: import('./reservation').ReservationStatus;
  status_label: string;
  leader_name: string | null;
  display_color: string | null;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number | null;
  notes: string | null;
  source: string | null;
  expires_at: string | null;
  confirmed_at: string | null;
  cabin_ids: number[];
  cabin_names: string[];
  assigned_to: number | null;
  assigned_staff: {
    id: number;
    full_name: string;
    role: string;
    role_label: string;
  } | null;
}

export interface PlannerBlock {
  id: number;
  reason: string;
  notes: string | null;
  applies_to_all: boolean;
}

export interface PlannerSegment {
  check_in: string;
  check_out: string;
  state: AvailabilityState;
  tone: AvailabilityTone;
  label: string;
  is_available: boolean;
  reservation: PlannerReservation | null;
  quotes: PlannerReservation[];
  block: PlannerBlock | null;
}

export interface PlannerCabin {
  cabin_id: number;
  name: string;
  map_slot: MapSlot | null;
  max_guests: number;
  fits_guests: boolean;
  available_for_range: boolean;
  segments: PlannerSegment[];
  cabin: Cabin;
}

export interface PlannerSuggestion {
  cabin_ids: number[];
  capacity: number;
  capacity_extra: number;
  cabins_count: number;
  cabins: Array<Pick<Cabin, 'id' | 'name' | 'map_slot' | 'max_guests'>>;
}

export interface PlannerResult {
  check_in: string;
  check_out: string;
  guests: number | null;
  cabins: PlannerCabin[];
  suggestions: PlannerSuggestion[];
  summary: AvailabilitySummary & {
    maintenance_count: number;
  };
}

export interface AvailabilityBlock {
  id: number;
  check_in: string;
  check_out: string;
  reason: string;
  notes: string | null;
  applies_to_all: boolean;
  cabin_ids?: number[];
  cabins?: Cabin[];
  created_at?: string;
  updated_at?: string;
}

export interface AdminAvailabilityCalendarDay {
  date: string;
  available: number;
  total: number;
  status: 'available' | 'limited' | 'full';
}

export interface AdminAvailabilityCalendarEvent {
  id: number;
  type: 'reservation' | 'block';
  status: import('./reservation').ReservationStatus | 'blocked';
  status_label: string;
  leader_name: string | null;
  display_color: string | null;
  check_in: string;
  check_out: string;
  guests_count: number | null;
  total_price: number | null;
  notes: string | null;
  expires_at: string | null;
  confirmed_at: string | null;
  is_expired_quote: boolean;
  expires_soon: boolean;
  blocks_availability: boolean;
  cabin_ids: number[];
  cabin_names: string[];
}

export interface AdminAvailabilityCalendar {
  period: {
    mode: 'month' | 'year';
    month: string | null;
    year: number;
    start: string;
    end: string;
  };
  cabins: Array<Pick<Cabin, 'id' | 'name' | 'map_slot' | 'max_guests'>>;
  days: AdminAvailabilityCalendarDay[];
  events: AdminAvailabilityCalendarEvent[];
  summary: {
    total_days: number;
    available_days: number;
    limited_days: number;
    full_days: number;
    events_count: number;
  };
}
