import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Galería',
  description: 'Galería de fotos de Cabañas Playa Terco.',
};

export default function GalleryPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Galería</h1>
      <p className="text-muted-foreground">Cargando galería...</p>
      {/* TODO: Fetch gallery items with category filter, masonry grid */}
    </div>
  );
}
