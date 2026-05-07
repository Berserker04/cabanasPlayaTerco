import type { Metadata } from 'next';
import { BlogPageClient } from './blog-page-client';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Noticias, guias y experiencias desde Playa Terco.',
};

export default function BlogPage() {
  return <BlogPageClient />;
}
