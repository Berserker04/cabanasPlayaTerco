export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: number;
  user_id?: number;
  reservation_id?: number | null;
  author_name: string;
  author_email?: string | null;
  author_avatar?: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  status_label: string;
  approved_at: string | null;
  admin_response?: string | null;
  responded_at?: string | null;
  responded_by?: number | null;
  created_at: string;
  updated_at?: string;
  media?: ReviewMedia[];
}

export interface ReviewMedia {
  id: number;
  review_id: number;
  url: string;
  alt: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  sort_order: number;
}

export interface ReviewStatsMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  average_rating?: number;
  rating_counts?: Record<string, number>;
  status_counts?: Record<ReviewStatus, number>;
}

export interface ReviewListResponse {
  data: Review[];
  meta: ReviewStatsMeta;
}
