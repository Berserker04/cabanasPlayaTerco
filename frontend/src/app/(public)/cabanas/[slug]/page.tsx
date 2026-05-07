import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Bath, BedDouble, Check, Home, MessageCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { buildCabinWhatsAppHref, formatCurrencyCOP, getCabinCover } from '@/lib/cabin-utils';
import type { ApiResponse } from '@/types/api';
import type { CabinType } from '@/types/cabin';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCabinType(slug: string): Promise<CabinType | null> {
  try {
    const response = await api.get<ApiResponse<CabinType>>(`/cabins/${slug}`, {
      next: { revalidate: 60 },
    });

    return response.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cabinType = await getCabinType(slug);

  return {
    title: cabinType?.name ?? slug.replace(/-/g, ' '),
    description:
      cabinType?.short_description ??
      'Detalles de cabaña, capacidad, comodidades y contacto directo en Playa Terco.',
  };
}

export default async function CabinDetailPage({ params }: Props) {
  const { slug } = await params;
  const cabinType = await getCabinType(slug);

  if (!cabinType) {
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
                <Link href="/cabanas">Volver al catálogo</Link>
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

  const gallery =
    cabinType.media?.filter((item) => item.type === 'image').map((item) => item.url) ?? [];
  const cover = getCabinCover(cabinType);
  const images = gallery.length > 0 ? gallery : [cover];

  return (
    <>
      <section className="bg-white">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div
              className="min-h-[320px] rounded-lg bg-cover bg-center sm:min-h-[460px]"
              style={{ backgroundImage: `url(${cover})` }}
              aria-label={cabinType.name}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {images.slice(1, 3).map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="min-h-[180px] rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${image})` }}
                />
              ))}
              {images.length === 1 ? (
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
              {cabinType.available_cabins_count ?? cabinType.cabins_count ?? 0} unidades disponibles
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-neutral-950 sm:text-5xl">
              {cabinType.name}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-600">
              {cabinType.description ?? cabinType.short_description}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact icon={<Users className="h-5 w-5" />} label="Capacidad" value={`${cabinType.max_guests} huéspedes`} />
              <Fact icon={<BedDouble className="h-5 w-5" />} label="Habitaciones" value={`${cabinType.bedrooms}`} />
              <Fact icon={<Bath className="h-5 w-5" />} label="Baños" value={`${cabinType.bathrooms}`} />
              <Fact
                icon={<Home className="h-5 w-5" />}
                label="Tamaño"
                value={cabinType.size_sqm ? `${cabinType.size_sqm} m²` : 'Nativa'}
              />
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-semibold tracking-normal text-neutral-950">
                Comodidades incluidas
              </h2>
              {cabinType.amenities && cabinType.amenities.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {cabinType.amenities.map((amenity) => (
                    <div key={amenity.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
                        <Check className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-neutral-950">{amenity.name}</p>
                        {amenity.category ? (
                          <p className="text-xs text-muted-foreground">{amenity.category}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Escríbenos para confirmar las comodidades disponibles en esta cabaña.
                </p>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-lg border bg-stone-50 p-6">
            <p className="text-sm text-muted-foreground">Tarifa desde</p>
            <p className="mt-1 text-3xl font-bold text-neutral-950">
              {formatCurrencyCOP(cabinType.base_price)}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Precio base por noche. La tarifa final puede variar por temporada, número de
              huéspedes y plan elegido.
            </p>
            <div className="mt-6 grid gap-3">
              <Button asChild size="lg" className="bg-cyan-700 text-white hover:bg-cyan-800">
                <Link href="/disponibilidad">Consultar disponibilidad</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a
                  href={buildCabinWhatsAppHref(cabinType)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
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
