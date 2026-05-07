import type { Metadata } from 'next';
import { PostDetailClient } from './post-detail-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;

  return <PostDetailClient slug={slug} />;
}
