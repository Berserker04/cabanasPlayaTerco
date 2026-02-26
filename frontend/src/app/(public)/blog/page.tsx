import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Noticias, guías y experiencias desde Playa Terco.',
};

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Blog</h1>
      <p className="text-muted-foreground">Cargando artículos...</p>
      {/* TODO: Fetch posts with category/tag filters, pagination */}
    </div>
  );
}
