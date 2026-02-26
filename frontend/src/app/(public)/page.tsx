import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[80vh] items-center justify-center bg-gradient-to-b from-sky-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Bienvenidos a<br />
            <span className="text-primary">{SITE_NAME}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {SITE_DESCRIPTION}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/cabanas">Ver cabañas</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/disponibilidad">Consultar disponibilidad</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">
          ¿Por qué Playa Terco?
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: 'Frente al mar',
              description:
                'Cabañas con vista directa al océano Pacífico, a pocos pasos de la playa.',
              emoji: '🌊',
            },
            {
              title: 'Naturaleza pura',
              description:
                'Rodeados de selva tropical, avistamiento de ballenas y biodiversidad única.',
              emoji: '🌴',
            },
            {
              title: 'Experiencias únicas',
              description:
                'Surf, pesca artesanal, senderismo y cultura chocoana auténtica.',
              emoji: '🏄',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border p-6 text-center transition-shadow hover:shadow-md"
            >
              <div className="mb-4 text-4xl">{feature.emoji}</div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
