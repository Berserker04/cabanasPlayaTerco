import { Suspense } from 'react';
import type { Metadata } from 'next';
import { api } from '@/lib/api';
import type { Post } from '@/types/blog';
import { BlogLoading } from '@/components/blog/blog-ui';
import { PostDetailClient } from './post-detail-client';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data } = await api.get<{ data: Post }>(
      `/posts/${encodeURIComponent(slug)}`,
    );
    return {
      title: data.meta_title || data.title,
      description:
        data.meta_description || data.excerpt || data.summary || undefined,
    };
  } catch {
    return { title: 'Publicación del blog' };
  }
}
export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;
  return (
    <Suspense fallback={<BlogLoading />}>
      <PostDetailClient slug={slug} />
    </Suspense>
  );
}
