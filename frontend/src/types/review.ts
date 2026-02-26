export interface Review {
  id: number;
  author_name: string;
  author_email: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  created_at: string;
  media?: ReviewMedia[];
}

export interface ReviewMedia {
  id: number;
  review_id: number;
  url: string;
  alt: string | null;
  sort_order: number;
}
