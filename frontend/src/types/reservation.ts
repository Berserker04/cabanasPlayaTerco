export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export interface Reservation {
  id: number;
  cabin_id: number;
  user_id: number | null;
  check_in: string;
  check_out: string;
  guests_count: number;
  leader_name: string | null;
  display_color: string | null;
  status: ReservationStatus;
  source: string | null;
  notes: string | null;
  total_price: number | null;
  created_at: string;
  cabin?: import('./cabin').Cabin;
  cabins?: import('./cabin').Cabin[];
  guest_group?: GuestGroup;
}

export interface GuestGroup {
  id: number;
  reservation_id: number;
  titular_name: string;
  titular_email: string | null;
  titular_phone: string | null;
  titular_document_number: string | null;
  titular_document_type: string | null;
  city_of_origin: string | null;
  notes: string | null;
  members?: GuestMember[];
}

export interface GuestMember {
  id: number;
  guest_group_id: number;
  full_name: string;
  document_number: string | null;
  document_type: string | null;
  age: number | null;
  is_minor: boolean;
}
