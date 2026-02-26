export type StaffRole =
  | 'manager'
  | 'receptionist'
  | 'cleaner'
  | 'cook'
  | 'maintenance'
  | 'security'
  | 'guide'
  | 'other';

export interface Staff {
  id: number;
  full_name: string;
  document_number: string | null;
  phone: string | null;
  email: string | null;
  role: StaffRole;
  is_active: boolean;
  hire_date: string | null;
  notes: string | null;
  created_at: string;
}
