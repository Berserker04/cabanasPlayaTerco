import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Check, MapPin, MessageCircle, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { SITE_DESCRIPTION, SITE_NAME, WHATSAPP_NUMBER } from '@/lib/constants';
import type { ApiResponse } from '@/types/api';
import type { Amenity } from '@/types/cabin';

const heroImage = '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg';
const logoImage = '/assets/terco_logo.png';

const galleryImages = [
  {
    src: '/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg',
    alt: 'Atardecer entre palmeras frente al Pacífico en Playa Terco',
    label: 'Atardeceres del Pacífico',
  },
  {
    src: '/assets/imagenes/511133422_9990219471027675_1591650365955070210_n.jpg',
    alt: 'Cabañas nativas rodeadas de jardín tropical',
    label: 'Cabañas entre selva y mar',
  },
  {
    src: '/assets/imagenes/54516895_2086105884772446_8521564931760324608_n.jpg',
    alt: 'Entrada a las cabañas con arena y vegetación tropical',
    label: 'Descanso a pasos de la playa',
  },
];

const highlights = [
  {
    title: 'Frente al mar',
    description: 'Despierta con el sonido de las olas y camina directo a la playa.',
    Icon: Waves,
  },
  {
    title: 'Playa Terco, Nuquí',
    description: 'Un refugio tranquilo en el Pacífico chocoano, rodeado de selva viva.',
    Icon: MapPin,
  },
  {
    title: 'Reserva directa',
    description: 'Escríbenos por WhatsApp y consulta fechas, planes y disponibilidad.',
    Icon: CalendarDays,
  },
];

const amenityCategoryLabels: Record<string, string> = {
  room: 'Habitación',
  bathroom: 'Baño',
  kitchen: 'Cocina',
  outdoor: 'Exterior',
  general: 'General',
};

type AmenityGroup = {
  key: string;
  label: string;
  amenities: Amenity[];
};

async function getAmenities(): Promise<Amenity[]> {
  try {
    const response = await api.get<ApiResponse<Amenity[]>>('/amenities', {
      cache: 'no-store',
    });

    return response.data;
  } catch {
    return [];
  }
}

function groupAmenities(amenities: Amenity[]): AmenityGroup[] {
  const groups = new Map<string, AmenityGroup>();

  for (const amenity of amenities) {
    const rawCategory = amenity.category?.trim() ?? '';
    const key = amenityCategoryLabels[rawCategory] ? rawCategory : 'general';
    const label = amenityCategoryLabels[key] ?? 'General';
    const group = groups.get(key) ?? { key, label, amenities: [] };

    group.amenities.push(amenity);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

export default async function HomePage() {
  const amenities = await getAmenities();
  const amenityGroups = groupAmenities(amenities);
  const whatsappMessage = encodeURIComponent(
    `Hola, quiero consultar disponibilidad para hospedarme en ${SITE_NAME}.`
  );
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${whatsappMessage}`;

  return (
    <>
      <section className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden bg-neutral-950 text-white">
        <Image
          src={heroImage}
          alt="Cabañas Playa Terco rodeadas de vegetación tropical frente a la playa"
          fill
          priority
          sizes="100vw"
          className="z-0 -translate-y-4 scale-[1.04] object-cover object-center sm:-translate-y-12"
        />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(6,24,20,0.86),rgba(6,24,20,0.48),rgba(6,24,20,0.18))]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-[-1px] z-20" aria-hidden="true">
          <svg
            viewBox="0 0 1440 180"
            preserveAspectRatio="none"
            className="h-20 w-full sm:h-28 lg:h-36"
          >
            <path
              d="M0 106C150 70 244 70 383 101C528 134 656 142 822 99C1004 52 1148 50 1440 90V180H0Z"
              className="fill-cyan-400 opacity-80"
            />
            <path
              d="M0 128C158 91 306 88 450 123C621 164 772 164 947 118C1138 68 1268 72 1440 112V180H0Z"
              className="fill-sky-100 opacity-90"
            />
            <path
              d="M0 142C178 109 342 106 510 137C700 172 872 170 1048 132C1206 98 1320 103 1440 132V180H0Z"
              className="fill-white"
            />
          </svg>
        </div>

        <div className="container relative z-30 mx-auto flex min-h-[calc(100vh-4rem)] items-center px-4 py-16">
          <div className="max-w-3xl overflow-hidden">
            <Image
              src={logoImage}
              alt="Logo de Cabañas Playa Terco"
              width={160}
              height={160}
              className="mb-8 h-24 w-24 rounded-full object-contain shadow-2xl ring-1 ring-white/70 sm:h-32 sm:w-32"
            />
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Playa Terco, Nuquí
            </p>
            <h1 className="max-w-full text-3xl font-bold tracking-normal text-white sm:text-5xl md:text-6xl">
              Cabañas Playa Terco
            </h1>
            <p className="mt-6 max-w-full text-sm leading-7 text-cyan-50 sm:max-w-2xl sm:text-lg sm:leading-8">
              {SITE_DESCRIPTION} Un lugar para descansar frente al mar, caminar entre selva y vivir
              el Pacífico colombiano con calma.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="bg-cyan-500 text-cyan-950 hover:bg-cyan-400"
              >
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
                  Consultar por WhatsApp
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/70 bg-white/10 text-white hover:bg-white hover:text-neutral-950"
              >
                <Link href="/cabanas">Ver cabañas</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {highlights.map(({ title, description, Icon }) => (
              <article key={title} className="rounded-lg border bg-white p-6 shadow-sm">
                <Icon className="mb-5 h-7 w-7 text-cyan-700" aria-hidden="true" />
                <h2 className="text-xl font-semibold tracking-normal text-neutral-950">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {amenityGroups.length > 0 ? (
        <section className="bg-cyan-950 py-16 text-white sm:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Amenidades
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-normal sm:text-4xl">
                Amenidades para tu estadía
              </h2>
              <p className="mt-4 text-sm leading-7 text-cyan-50 sm:text-base">
                Un vistazo general a lo que puedes encontrar en Cabañas Playa Terco durante tu
                descanso frente al Pacífico.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {amenityGroups.map((group) => (
                <article key={group.key} className="rounded-lg border border-white/15 bg-white/10 p-5">
                  <h3 className="text-lg font-semibold tracking-normal text-white">{group.label}</h3>
                  <div className="mt-4 grid gap-2">
                    {group.amenities.map((amenity) => (
                      <div key={amenity.id} className="flex items-start gap-3 rounded-md bg-white/[0.08] px-3 py-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-cyan-950">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="text-sm leading-6 text-cyan-50">{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-stone-50 py-16 sm:py-20">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Naturaleza y descanso
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-normal text-neutral-950 sm:text-4xl">
              Cabañas nativas entre el jardín tropical y el Pacífico
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-neutral-600">
              La experiencia combina playa, vegetación, comida local y la tranquilidad de un destino
              pensado para desconectarse. Ideal para parejas, familias y grupos que quieren quedarse
              cerca del mar sin perder el contacto con la naturaleza.
            </p>
          </div>

          <div className="grid auto-rows-[220px] gap-4 sm:grid-cols-2">
            {galleryImages.map((image, index) => (
              <figure
                key={image.src}
                className={`relative overflow-hidden rounded-lg ${
                  index === 0 ? 'sm:col-span-2' : ''
                }`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes={
                    index === 0
                      ? '(min-width: 1024px) 55vw, 100vw'
                      : '(min-width: 1024px) 27vw, 50vw'
                  }
                  className="object-cover"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/80 to-transparent px-4 pb-4 pt-12 text-sm font-medium text-white">
                  {image.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cyan-950 py-14 text-white">
        <div className="container mx-auto flex flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">
              Planea tu estadía en Playa Terco
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-cyan-100">
              Consulta fechas, número de huéspedes y recomendaciones para llegar a Nuquí.
            </p>
          </div>
          <Button size="lg" asChild className="bg-white text-cyan-950 hover:bg-cyan-100">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
              Escribir a WhatsApp
            </a>
          </Button>
        </div>
      </section>
    </>
  );
}
