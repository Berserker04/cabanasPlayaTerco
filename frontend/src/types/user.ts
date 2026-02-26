export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  google_id: string | null;
  email_verified_at: string | null;
  created_at: string;
  roles?: Role[];
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
}
