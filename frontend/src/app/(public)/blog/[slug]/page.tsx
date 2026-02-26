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

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="container mx-auto px-4 py-12">
      <article className="prose mx-auto max-w-3xl">
        <h1 className="capitalize">{slug.replace(/-/g, ' ')}</h1>
        <p className="text-muted-foreground">Cargando artículo...</p>
        {/* TODO: Fetch post by slug, render content, comments */}
      </article>
    </div>
  );
}
