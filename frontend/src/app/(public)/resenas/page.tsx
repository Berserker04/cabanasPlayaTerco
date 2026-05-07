import type { Metadata } from 'next';
import { ReviewsPageClient } from './reviews-page-client';

export const metadata: Metadata = {
  title: 'Resenas',
  description: 'Lee y comparte resenas de huespedes de Cabanas Playa Terco.',
};

export default function ReviewsPage() {
  return <ReviewsPageClient />;
}
