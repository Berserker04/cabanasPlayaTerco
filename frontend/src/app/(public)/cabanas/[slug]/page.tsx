import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

export default async function CabinDetailPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold capitalize">{slug.replace(/-/g, ' ')}</h1>
      <p className="text-muted-foreground">Cargando detalles de la cabaña...</p>
      {/* TODO: Fetch cabin type by slug, show gallery, amenities, pricing */}
    </div>
  );
}
