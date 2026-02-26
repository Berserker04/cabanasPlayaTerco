import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reseñas',
  description: 'Lee las reseñas de nuestros huéspedes.',
};

export default function ReviewsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Reseñas de huéspedes</h1>
      <p className="text-muted-foreground">Cargando reseñas...</p>
      {/* TODO: Fetch approved reviews, pagination, submit review form */}
    </div>
  );
}
