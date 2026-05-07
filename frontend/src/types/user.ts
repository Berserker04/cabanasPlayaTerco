export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  email_verified_at: string | null;
  roles?: string[];
  is_admin: boolean;
  is_staff: boolean;
  created_at: string;
}
