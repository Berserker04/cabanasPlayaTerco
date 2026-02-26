import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disponibilidad',
  description: 'Consulta la disponibilidad de nuestras cabañas.',
};

export default function AvailabilityPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Disponibilidad</h1>
      <p className="text-muted-foreground">Selecciona tus fechas para verificar disponibilidad.</p>
      {/* TODO: Date picker, guest count, availability results */}
    </div>
  );
}
