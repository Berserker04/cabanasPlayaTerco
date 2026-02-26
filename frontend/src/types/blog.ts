export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  featured_image: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  author?: { id: number; name: string; avatar: string | null };
  categories?: BlogCategory[];
  tags?: BlogTag[];
  comments_count?: number;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
}

export interface Comment {
  id: number;
  user_id: number | null;
  author_name: string | null;
  body: string;
  status: string;
  created_at: string;
  replies?: Comment[];
  user?: { id: number; name: string; avatar: string | null };
}
