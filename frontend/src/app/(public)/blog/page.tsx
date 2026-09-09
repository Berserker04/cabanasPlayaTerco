import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BlogPageClient } from './blog-page-client';
import { BlogLoading } from '@/components/blog/blog-ui';
export const metadata: Metadata = {
  title: 'Blog',
  description: 'Experiencias de viajeros y artículos desde Playa Terco.',
};
export default function BlogPage() {
  return (
    <Suspense fallback={<BlogLoading />}>
      <BlogPageClient />
    </Suspense>
  );
}
