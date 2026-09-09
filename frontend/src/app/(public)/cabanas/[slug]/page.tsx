import { GeneralQuoteActions } from '@/components/cabins/general-quote-actions';
import { generalQuoteContext, QUOTE_NOTICE } from '@/lib/general-quote';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  stayHref,
  stayFromSearchParams,
  type StaySearchParams,
} from '@/lib/stay-context';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Bath, BedDouble, Users } from 'lucide-react';
import { CabinMap } from '@/components/cabins/cabin-map';
import { LodgingTariffDetails } from '@/components/cabins/lodging-tariff-details';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { getCabinCover } from '@/lib/cabin-utils';
import type { ApiResponse } from '@/types/api';
import type { PublicCabin as Cabin, LodgingTariff } from '@/types/cabin';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: StaySearchParams;
}

async function getCabin(slug: string): Promise<Cabin | null> {
  try {
    const response = await api.get<ApiResponse<Cabin>>(`/cabins/${slug}`, {
      cache: 'no-store',
    });

    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function getTariffs(): Promise<LodgingTariff[]> {
  try {
    const response = await api.get<ApiResponse<LodgingTariff[]>>(
      '/lodging-tariffs',
      {
        cache: 'no-store',
      },
    );

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

export default async function CabinDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [cabin, tariffs] = await Promise.all([getCabin(slug), getTariffs()]);

  if (!cabin) notFound();
  const context = {
    ...(await stayFromSearchParams(searchParams)),
    cabin_id: String(cabin.id),
  };
  const media = [...(cabin.media ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id,
  );
  const images = media.filter((item) => item.type === 'image') ?? [];
  const cover = getCabinCover(cabin);

  return (
    <>
      <section className="bg-white">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src={cover}
                alt={'Portada de ' + cabin.name}
                fill
                unoptimized
                priority
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            </div>
            <div
              className={`grid gap-4 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} lg:grid-cols-1`}
            >
              {images.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="relative min-h-[128px] overflow-hidden rounded-lg sm:min-h-[180px]"
                >
                  <Image
                    src={item.url}
                    alt={item.alt || cabin.name}
                    fill
                    unoptimized
                    sizes="40vw"
                    className="object-cover"
                  />
                </div>
              ))}
              {images.length === 0 && (
                <div className="flex items-center rounded-lg bg-cyan-950 p-6 text-white">
                  <p>
                    Una estadía tranquila entre vegetación tropical, playa y
                    atención directa.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-14">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1fr_360px]">
          <div>
            <Badge className="bg-cyan-100 text-cyan-900 hover:bg-cyan-100">
              {cabin.map_point?.label ?? 'Cabañas Playa Terco'}
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-neutral-950 sm:text-5xl">
              {cabin.name}
            </h1>
            <p className="mt-5 max-w-3xl whitespace-pre-wrap break-words text-base leading-8 text-neutral-600">
              {cabin.description ?? cabin.short_description}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact
                icon={<Users className="h-5 w-5" />}
                label="Capacidad cómoda"
                value={`${cabin.guest_capacity} huéspedes`}
              />
              <Fact
                icon={<Users className="h-5 w-5" />}
                label="Huéspedes (mín. – máx.)"
                value={`${cabin.min_guests} – ${cabin.max_guests}`}
              />
              <Fact
                icon={<BedDouble className="h-5 w-5" />}
                label="Camas"
                value={`${cabin.beds_count}`}
              />
              <Fact
                icon={<Bath className="h-5 w-5" />}
                label="Baños"
                value={`${cabin.bathrooms_count}`}
              />
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-semibold tracking-normal text-neutral-950">
                Ubicación interna
              </h2>
              <div className="mt-5">
                <CabinMap cabins={[cabin]} activeSlot={cabin.map_slot} />
              </div>
            </div>

            {media.length > 0 ? (
              <div className="mt-10">
                <h2 className="text-2xl font-semibold tracking-normal text-neutral-950">
                  Galería
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {media.map((item) => (
                    <figure key={item.id} className="min-w-0 space-y-2">
                      {item.type === 'video' ? (
                        <video
                          src={item.url}
                          controls
                          playsInline
                          preload="metadata"
                          aria-label={item.alt || 'Video de ' + cabin.name}
                          className="aspect-[4/3] w-full rounded-lg bg-neutral-950 object-contain"
                        />
                      ) : (
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={item.url}
                            alt={item.alt || 'Imagen de ' + cabin.name}
                            fill
                            unoptimized
                            sizes="(min-width: 768px) 33vw, 100vw"
                            className="rounded-lg object-cover"
                          />
                        </div>
                      )}
                      {item.alt && (
                        <figcaption className="break-words text-sm text-muted-foreground">
                          {item.alt}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="h-fit rounded-lg border bg-stone-50 p-6">
            <Button asChild variant="ghost" className="mb-4">
              <Link href={stayHref('/cabanas', context)}>
                Volver al catálogo
              </Link>
            </Button>
            {context.check_in && (
              <p className="mb-4 text-sm">
                {context.check_in} → {context.check_out || 'Salida por definir'}{' '}
                · {context.guests || '2'} huéspedes
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Tarifas del hospedaje
            </p>
            {tariffs.length > 0 ? (
              <div className="mt-4 space-y-4">
                {tariffs.map((tariff) => (
                  <div
                    key={tariff.id}
                    className="border-b pb-4 last:border-b-0 last:pb-0"
                  >
                    <LodgingTariffDetails tariff={tariff} defaultExpanded />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Las tarifas se confirman por WhatsApp según fechas y grupo.
              </p>
            )}
            <div className="mt-6 grid gap-3">
              <p className="text-sm leading-6 text-muted-foreground">
                {QUOTE_NOTICE}
              </p>
              <GeneralQuoteActions context={context} />
              <Button asChild size="lg" variant="outline">
                <Link
                  href={stayHref(
                    '/disponibilidad',
                    generalQuoteContext(context),
                  )}
                >
                  Consultar disponibilidad
                </Link>
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
