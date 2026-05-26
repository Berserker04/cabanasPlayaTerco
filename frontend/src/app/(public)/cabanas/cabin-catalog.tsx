'use client';

import Link from 'next/link';
import { Bath, BedDouble, Check, MessageCircle, Search, Users, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CabinMap } from '@/components/cabins/cabin-map';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CABIN_FALLBACK_IMAGES,
  MAP_SLOT_LABELS,
  buildCabinWhatsAppHref,
  formatCurrencyCOP,
  getCabinCover,
} from '@/lib/cabin-utils';
import type { Cabin, LodgingTariff, MapSlot } from '@/types/cabin';

const guestOptions = [
  { label: 'Cualquier capacidad', value: 'any' },
  { label: '2+ huespedes', value: '2' },
  { label: '4+ huespedes', value: '4' },
  { label: '6+ huespedes', value: '6' },
  { label: '8+ huespedes', value: '8' },
] as const;

export function CabinCatalog({
  cabins,
  tariffs,
}: {
  cabins: Cabin[];
  tariffs: LodgingTariff[];
}) {
  const [search, setSearch] = useState('');
  const [guests, setGuests] = useState('any');
  const [selectedSlot, setSelectedSlot] = useState<MapSlot | null>(null);

  const filteredCabins = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const guestsCount = guests === 'any' ? 0 : Number(guests);

    return cabins.filter((cabin) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        cabin.name.toLowerCase().includes(normalizedSearch) ||
        (cabin.short_description ?? '').toLowerCase().includes(normalizedSearch) ||
        (cabin.description ?? '').toLowerCase().includes(normalizedSearch);
      const matchesGuests = guestsCount === 0 || cabin.max_guests >= guestsCount;
      const matchesSlot = !selectedSlot || cabin.map_slot === selectedSlot;

      return matchesSearch && matchesGuests && matchesSlot;
    });
  }, [cabins, guests, search, selectedSlot]);

  const heroImage = cabins[0] ? getCabinCover(cabins[0]) : CABIN_FALLBACK_IMAGES[0];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,29,27,0.92),rgba(5,29,27,0.58),rgba(5,29,27,0.26))]" />
        <div className="container relative mx-auto px-4 py-16 sm:py-20">
          <div className="max-w-3xl">
            <Badge className="mb-5 bg-cyan-400 text-cyan-950 hover:bg-cyan-300">
              Playa Terco, Nuqui
            </Badge>
            <h1 className="text-3xl font-bold tracking-normal sm:text-5xl">
              Cabañas reales entre la playa, el mar y la zona verde
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-cyan-50 sm:text-lg">
              Revisa cada cabaña por nombre, capacidad, ubicacion y galeria. La reserva se confirma
              por WhatsApp con atencion directa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-cyan-500 text-cyan-950 hover:bg-cyan-400">
                <a href={buildCabinWhatsAppHref()} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/70 bg-white/10 text-white hover:bg-white hover:text-neutral-950"
              >
                <Link href="/disponibilidad">Consultar disponibilidad</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {tariffs.length > 0 ? (
        <section className="bg-cyan-950 py-8 text-white">
          <div className="container mx-auto px-4">
            <div className="grid gap-4 lg:grid-cols-[260px_1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
                  Tarifas
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal">Hospedaje Playa Terco</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {tariffs.map((tariff) => (
                  <article key={tariff.id} className="rounded-lg border border-white/15 bg-white/10 p-4">
                    <p className="text-sm font-semibold text-cyan-50">{tariff.title}</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrencyCOP(tariff.price_cop)}</p>
                    <p className="text-sm text-cyan-100">{tariff.unit_label}</p>
                    {tariff.description ? (
                      <p className="mt-3 text-sm leading-6 text-cyan-50">{tariff.description}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-white py-10 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
                Cabañas
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-neutral-950">
                Elige tu lugar dentro de Playa Terco
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px] lg:w-[520px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre"
                  className="pl-9"
                />
              </div>
              <Select value={guests} onValueChange={setGuests}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Capacidad" />
                </SelectTrigger>
                <SelectContent>
                  {guestOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <CabinMap cabins={cabins} selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} compactLabels />
            {selectedSlot ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-stone-50 px-4 py-3 text-sm">
                <span className="font-medium text-neutral-800">{MAP_SLOT_LABELS[selectedSlot]}</span>
                <Button size="sm" variant="ghost" onClick={() => setSelectedSlot(null)}>
                  Ver todas
                </Button>
              </div>
            ) : null}

            {filteredCabins.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredCabins.map((cabin) => (
                  <article
                    key={cabin.id}
                    className="overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link
                      href={`/cabanas/${cabin.slug}`}
                      className="block aspect-[4/3] bg-cover bg-center"
                      style={{ backgroundImage: `url(${getCabinCover(cabin)})` }}
                      aria-label={`Ver ${cabin.name}`}
                    />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold tracking-normal text-neutral-950">
                            {cabin.name}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
                            {cabin.short_description ?? cabin.description}
                          </p>
                        </div>
                        {cabin.map_slot ? <Badge variant="outline">{MAP_SLOT_LABELS[cabin.map_slot]}</Badge> : null}
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2 text-sm text-neutral-700">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-cyan-700" />
                          {cabin.min_guests}-{cabin.max_guests}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BedDouble className="h-4 w-4 text-cyan-700" />
                          {cabin.beds_count}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Bath className="h-4 w-4 text-cyan-700" />
                          {cabin.bathrooms_count}
                        </span>
                      </div>

                      {cabin.amenities && cabin.amenities.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {cabin.amenities.slice(0, 3).map((amenity) => (
                            <span key={amenity.id} className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-900">
                              <Check className="h-3 w-3" />
                              {amenity.name}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-5 flex items-center justify-between gap-4 border-t pt-5">
                        <Button asChild variant="outline">
                          <a href={buildCabinWhatsAppHref(cabin)} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                          </a>
                        </Button>
                        <Button asChild>
                          <Link href={`/cabanas/${cabin.slug}`}>Ver detalles</Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-stone-50 p-8 text-center">
                <Waves className="mx-auto h-8 w-8 text-cyan-700" />
                <h3 className="mt-4 text-lg font-semibold">No hay cabañas para esos filtros</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ajusta la busqueda o escribenos para recomendarte una opcion disponible.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
