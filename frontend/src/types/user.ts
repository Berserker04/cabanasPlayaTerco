export type UserStatus = 'active' | 'suspended';

export interface UserRole {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  email_verified_at: string | null;
  roles?: string[];
  role_ids?: number[];
  status: UserStatus;
  status_label: string;
  is_admin: boolean;
  is_staff: boolean;
  can_access_panel?: boolean;
  created_at: string;
}

export interface AdminUserListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  available_roles: UserRole[];
  counts: {
    total: number;
    active: number;
    suspended: number;
    active_admins: number;
  };
}

export interface AdminUserListResponse {
  data: User[];
  meta: AdminUserListMeta;
}

export interface UpdateAdminUserPayload {
  role_ids?: number[];
  status?: UserStatus;
}
