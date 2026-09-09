import type { Metadata } from 'next';
import { ReviewsPageClient } from './reviews-page-client';

export const metadata: Metadata = {
  title: 'Reseñas',
  description:
    'Lee y comparte reseñas y fotos de viajeros de Cabañas Playa Terco.',
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ escribir?: string }>;
}) {
  const params = await searchParams;
  return <ReviewsPageClient initiallyOpen={params.escribir === '1'} />;
}
