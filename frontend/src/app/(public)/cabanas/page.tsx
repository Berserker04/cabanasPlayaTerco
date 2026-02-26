import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cabañas',
  description: 'Descubre nuestras cabañas frente al mar en Playa Terco, Chocó.',
};

export default function CabinsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Nuestras Cabañas</h1>
      <p className="text-muted-foreground">Cargando cabañas...</p>
      {/* TODO: Fetch cabin types from API and render CabinTypeCard grid */}
    </div>
  );
}
