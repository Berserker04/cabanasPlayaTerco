import type { PaginationMeta } from './api';

export type PostStatus = 'draft' | 'published' | 'archived';
export type PostType = 'article' | 'experience';
export type PostMediaType = 'image' | 'video';

export interface PostMedia {
  id: number;
  post_id: number | null;
  url: string;
  path?: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  type: PostMediaType;
  alt: string | null;
  sort_order: number;
  created_at?: string;
}

export interface Post {
  id: number;
  type: PostType;
  type_label: string;
  title: string;
  slug: string;
  excerpt: string | null;
  summary: string | null;
  body?: string;
  featured_image: string | null;
  cover_image_path?: string | null;
  status: PostStatus;
  status_label: string;
  published_at: string | null;
  visit_date: string | null;
  travel_style: string | null;
  media_count: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at?: string;
  author?: { id: number; name: string; avatar: string | null };
  categories?: BlogCategory[];
  tags?: BlogTag[];
  media?: PostMedia[];
  comments?: Comment[];
  comments_count?: number;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  posts_count?: number;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
  posts_count?: number;
}

export interface Comment {
  id: number;
  user_id?: number | null;
  author_name: string | null;
  body: string;
  status: string;
  parent_id: number | null;
  created_at: string;
  replies?: Comment[];
  user?: { id: number; name: string; avatar: string | null };
  commentable?: { id: number; type: string; title: string; slug: string };
}

export interface BlogListResponse {
  data: Post[];
  meta: PaginationMeta;
}

export interface CommentListResponse {
  data: Comment[];
  meta: PaginationMeta;
}
