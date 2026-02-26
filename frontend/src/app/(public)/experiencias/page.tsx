import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Experiencias',
  description: 'Actividades y experiencias en Playa Terco.',
};

export default function ExperiencesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Experiencias</h1>
      <p className="text-muted-foreground">Descubre las actividades que puedes disfrutar.</p>
      {/* TODO: Static/dynamic experience cards */}
    </div>
  );
}
