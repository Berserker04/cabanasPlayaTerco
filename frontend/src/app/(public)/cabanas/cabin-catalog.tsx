'use client';

import Link from 'next/link';
import { BedDouble, Home, Search, Users, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { buildCabinWhatsAppHref, formatCurrencyCOP, getCabinCover } from '@/lib/cabin-utils';
import type { CabinType } from '@/types/cabin';

const guestOptions = [
  { label: 'Cualquier capacidad', value: 'any' },
  { label: '2+ huéspedes', value: '2' },
  { label: '4+ huéspedes', value: '4' },
  { label: '6+ huéspedes', value: '6' },
] as const;

export function CabinCatalog({ cabinTypes }: { cabinTypes: CabinType[] }) {
  const [search, setSearch] = useState('');
  const [guests, setGuests] = useState('any');

  const filteredCabins = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const guestsCount = guests === 'any' ? 0 : Number(guests);

    return cabinTypes.filter((cabinType) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        cabinType.name.toLowerCase().includes(normalizedSearch) ||
        (cabinType.short_description ?? '').toLowerCase().includes(normalizedSearch);
      const matchesGuests = guestsCount === 0 || cabinType.max_guests >= guestsCount;

      return matchesSearch && matchesGuests;
    });
  }, [cabinTypes, guests, search]);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${getCabinCover(cabinTypes[0] ?? { id: 0, image: null })})` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,29,27,0.92),rgba(5,29,27,0.58),rgba(5,29,27,0.26))]" />
        <div className="container relative mx-auto px-4 py-16 sm:py-20">
          <div className="max-w-3xl">
            <Badge className="mb-5 bg-cyan-400 text-cyan-950 hover:bg-cyan-300">
              Playa Terco, Nuquí
            </Badge>
            <h1 className="text-3xl font-bold tracking-normal sm:text-5xl">
              Cabañas frente al Pacífico para descansar de verdad
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-cyan-50 sm:text-lg">
              Elige una ficha, revisa capacidad, comodidades e imágenes, y escríbenos para
              confirmar fechas con atención directa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-cyan-500 text-cyan-950 hover:bg-cyan-400">
                <Link href="/disponibilidad">Consultar disponibilidad</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/70 bg-white/10 text-white hover:bg-white hover:text-neutral-950"
              >
                <a href={buildCabinWhatsAppHref()} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-10 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
                Catálogo
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-neutral-950">
                Encuentra la cabaña que encaja con tu viaje
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px] lg:w-[520px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre o ambiente"
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

          {filteredCabins.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredCabins.map((cabinType) => (
                <article
                  key={cabinType.id}
                  className="overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Link
                    href={`/cabanas/${cabinType.slug}`}
                    className="block aspect-[4/3] bg-cover bg-center"
                    style={{ backgroundImage: `url(${getCabinCover(cabinType)})` }}
                    aria-label={`Ver ${cabinType.name}`}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold tracking-normal text-neutral-950">
                          {cabinType.name}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
                          {cabinType.short_description ?? cabinType.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {cabinType.available_cabins_count ?? cabinType.cabins_count ?? 0} libres
                      </Badge>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 text-sm text-neutral-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-cyan-700" />
                        {cabinType.max_guests}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BedDouble className="h-4 w-4 text-cyan-700" />
                        {cabinType.bedrooms}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Home className="h-4 w-4 text-cyan-700" />
                        {cabinType.size_sqm ? `${cabinType.size_sqm} m²` : 'Nativa'}
                      </span>
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-4 border-t pt-5">
                      <div>
                        <p className="text-xs text-muted-foreground">Desde</p>
                        <p className="text-lg font-bold text-neutral-950">
                          {formatCurrencyCOP(cabinType.base_price)}
                        </p>
                      </div>
                      <Button asChild>
                        <Link href={`/cabanas/${cabinType.slug}`}>Ver detalles</Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-dashed bg-stone-50 p-8 text-center">
              <Waves className="mx-auto h-8 w-8 text-cyan-700" />
              <h3 className="mt-4 text-lg font-semibold">No hay cabañas para esos filtros</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajusta la búsqueda o escríbenos para recomendarte una opción disponible.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
