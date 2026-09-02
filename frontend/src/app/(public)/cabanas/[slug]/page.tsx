import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Bath, BedDouble, MessageCircle, Users } from 'lucide-react';
import { CabinMap } from '@/components/cabins/cabin-map';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  MAP_SLOT_LABELS,
  buildCabinWhatsAppHref,
  formatCurrencyCOP,
  getCabinCover,
} from '@/lib/cabin-utils';
import type { ApiResponse } from '@/types/api';
import type { Cabin, LodgingTariff } from '@/types/cabin';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCabin(slug: string): Promise<Cabin | null> {
  try {
    const response = await api.get<ApiResponse<Cabin>>(`/cabins/${slug}`, {
      next: { revalidate: 60 },
    });

    return response.data;
  } catch {
    return null;
  }
}

async function getTariffs(): Promise<LodgingTariff[]> {
  try {
    const response = await api.get<ApiResponse<LodgingTariff[]>>('/lodging-tariffs', {
      next: { revalidate: 60 },
    });

    return response.data;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cabin = await getCabin(slug);

  return {
    title: cabin?.name ?? slug.replace(/-/g, ' '),
    description:
      cabin?.short_description ??
      'Detalles de cabaña, capacidad, ubicación y contacto directo en Playa Terco.',
  };
}

export default async function CabinDetailPage({ params }: Props) {
  const { slug } = await params;
  const [cabin, tariffs] = await Promise.all([getCabin(slug), getTariffs()]);

  if (!cabin) {
    return (
      <section className="bg-stone-50 py-16">
        <div className="container mx-auto px-4">
          <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-normal">No pudimos cargar esta cabaña</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Puede ser un problema temporal de conexión con la API. Puedes volver al catálogo o
              escribirnos directamente para recibir ayuda.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/cabanas">Volver al catalogo</Link>
              </Button>
              <Button asChild variant="outline">
                <a href={buildCabinWhatsAppHref()} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const images = cabin.media?.filter((item) => item.type === 'image') ?? [];
  const videos = cabin.media?.filter((item) => item.type === 'video') ?? [];
  const cover = getCabinCover(cabin);
  const imageUrls = images.length > 0 ? images.map((item) => item.url) : [cover];

  return (
    <>
      <section className="bg-white">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div
              className="min-h-[320px] rounded-lg bg-cover bg-center sm:min-h-[460px]"
              style={{ backgroundImage: `url(${cover})` }}
              aria-label={cabin.name}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {imageUrls.slice(1, 3).map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="min-h-[180px] rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${image})` }}
                />
              ))}
              {videos[0] ? (
                <video
                  src={videos[0].url}
                  controls
                  className="min-h-[180px] w-full rounded-lg bg-neutral-950 object-cover"
                />
              ) : null}
              {imageUrls.length === 1 && !videos[0] ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-lg bg-cyan-950 p-6 text-center text-white">
                  <p className="max-w-xs text-sm leading-6">
                    Una estadía tranquila entre vegetación tropical, playa y atención directa.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-14">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1fr_360px]">
          <div>
            <Badge className="bg-cyan-100 text-cyan-900 hover:bg-cyan-100">
              {cabin.map_slot ? MAP_SLOT_LABELS[cabin.map_slot] : 'Cabañas Playa Terco'}
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-neutral-950 sm:text-5xl">
              {cabin.name}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-600">
              {cabin.description ?? cabin.short_description}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact icon={<Users className="h-5 w-5" />} label="Capacidad cómoda" value={`${cabin.guest_capacity} huéspedes`} />
              <Fact icon={<Users className="h-5 w-5" />} label="Capacidad máxima" value={`${cabin.min_guests}-${cabin.max_guests}`} />
              <Fact icon={<BedDouble className="h-5 w-5" />} label="Camas" value={`${cabin.beds_count}`} />
              <Fact icon={<Bath className="h-5 w-5" />} label="Baños" value={`${cabin.bathrooms_count}`} />
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-semibold tracking-normal text-neutral-950">
                Ubicación interna
              </h2>
              <div className="mt-5">
                <CabinMap cabins={[cabin]} activeSlot={cabin.map_slot} />
              </div>
            </div>

            {imageUrls.length > 1 || videos.length > 1 ? (
              <div className="mt-10">
                <h2 className="text-2xl font-semibold tracking-normal text-neutral-950">Galería</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {imageUrls.slice(1).map((image) => (
                    <div
                      key={image}
                      className="aspect-[4/3] rounded-lg bg-cover bg-center"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                  ))}
                  {videos.slice(1).map((video) => (
                    <video key={video.id} src={video.url} controls className="aspect-[4/3] w-full rounded-lg bg-neutral-950 object-cover" />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="h-fit rounded-lg border bg-stone-50 p-6">
            <p className="text-sm text-muted-foreground">Tarifas del hospedaje</p>
            {tariffs.length > 0 ? (
              <div className="mt-4 space-y-4">
                {tariffs.map((tariff) => (
                  <div key={tariff.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <p className="font-semibold text-neutral-950">{tariff.title}</p>
                    <p className="mt-1 text-2xl font-bold text-neutral-950">
                      {formatCurrencyCOP(tariff.price_cop)}
                    </p>
                    <p className="text-sm text-neutral-600">{tariff.unit_label}</p>
                    {tariff.public_notes ? (
                      <p className="mt-2 text-sm leading-6 text-neutral-600">{tariff.public_notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Las tarifas se confirman por WhatsApp según fechas y grupo.
              </p>
            )}
            <div className="mt-6 grid gap-3">
              <Button asChild size="lg" className="bg-cyan-700 text-white hover:bg-cyan-800">
                <a href={buildCabinWhatsAppHref(cabin)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Reservar por WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/disponibilidad">Consultar disponibilidad</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/contacto">Enviar solicitud</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 text-cyan-700">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
