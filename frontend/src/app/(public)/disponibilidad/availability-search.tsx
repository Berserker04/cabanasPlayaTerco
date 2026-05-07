'use client';

import Link from 'next/link';
import { CalendarDays, LoaderCircle, MessageCircle, Search, Users } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { buildCabinWhatsAppHref, formatCurrencyCOP, getCabinCover } from '@/lib/cabin-utils';
import type { ApiResponse } from '@/types/api';
import type { Cabin, CabinType } from '@/types/cabin';

type AvailabilityGroup = {
  cabinType: CabinType;
  units: Cabin[];
};

const todayIso = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today.toISOString().slice(0, 10);
};

export function AvailabilitySearch() {
  const [checkIn, setCheckIn] = useState(todayIso());
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [results, setResults] = useState<Cabin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const groups = useMemo<AvailabilityGroup[]>(() => {
    const grouped = new Map<number, AvailabilityGroup>();

    results.forEach((cabin) => {
      if (!cabin.type) {
        return;
      }

      const current = grouped.get(cabin.type.id);

      if (current) {
        current.units.push(cabin);
      } else {
        grouped.set(cabin.type.id, {
          cabinType: cabin.type,
          units: [cabin],
        });
      }
    });

    return Array.from(grouped.values());
  }, [results]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError('Indica una fecha de salida posterior a la llegada.');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        check_in: checkIn,
        check_out: checkOut,
        guests,
      });
      const response = await api.get<ApiResponse<Cabin[]>>(`/availability?${params.toString()}`);

      setResults(response.data);
    } catch {
      setResults([]);
      setError('No pudimos consultar disponibilidad ahora. Escríbenos por WhatsApp y te ayudamos.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <section className="bg-cyan-950 py-14 text-white sm:py-16">
        <div className="container mx-auto px-4">
          <Badge className="bg-cyan-400 text-cyan-950 hover:bg-cyan-300">
            Disponibilidad orientativa
          </Badge>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-normal sm:text-5xl">
                Consulta fechas antes de escribirnos
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-cyan-50">
                Revisa unidades libres por fecha y capacidad. La reserva final se confirma por
                contacto directo para validar temporada, plan y llegada a Nuquí.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="rounded-lg bg-white p-4 text-neutral-950 shadow-xl">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_120px_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="availability-check-in">Llegada</Label>
                  <Input
                    id="availability-check-in"
                    type="date"
                    min={todayIso()}
                    value={checkIn}
                    onChange={(event) => setCheckIn(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability-check-out">Salida</Label>
                  <Input
                    id="availability-check-out"
                    type="date"
                    min={checkIn || todayIso()}
                    value={checkOut}
                    onChange={(event) => setCheckOut(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability-guests">Huéspedes</Label>
                  <Input
                    id="availability-guests"
                    type="number"
                    min={1}
                    max={20}
                    value={guests}
                    onChange={(event) => setGuests(event.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" disabled={isLoading} className="bg-cyan-700 text-white hover:bg-cyan-800">
                  {isLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </div>
              {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            </form>
          </div>
        </div>
      </section>

      <section className="bg-stone-50 py-12">
        <div className="container mx-auto px-4">
          {!hasSearched ? (
            <div className="rounded-lg border border-dashed bg-white p-8 text-center">
              <CalendarDays className="mx-auto h-9 w-9 text-cyan-700" />
              <h2 className="mt-4 text-xl font-semibold tracking-normal">
                Elige tus fechas para ver opciones
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Te mostraremos unidades disponibles agrupadas por tipo de cabaña.
              </p>
            </div>
          ) : groups.length > 0 ? (
            <div className="grid gap-5">
              {groups.map(({ cabinType, units }) => (
                <article key={cabinType.id} className="grid overflow-hidden rounded-lg border bg-white shadow-sm lg:grid-cols-[320px_1fr]">
                  <div
                    className="min-h-[220px] bg-cover bg-center"
                    style={{ backgroundImage: `url(${getCabinCover(cabinType)})` }}
                  />
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Badge variant="outline">{units.length} unidad(es) libre(s)</Badge>
                        <h2 className="mt-3 text-2xl font-semibold tracking-normal text-neutral-950">
                          {cabinType.name}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                          {cabinType.short_description ?? cabinType.description}
                        </p>
                      </div>
                      <div className="shrink-0 sm:text-right">
                        <p className="text-xs text-muted-foreground">Desde</p>
                        <p className="text-xl font-bold text-neutral-950">
                          {formatCurrencyCOP(cabinType.base_price)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-900">
                        <Users className="h-3.5 w-3.5" />
                        Hasta {cabinType.max_guests}
                      </span>
                      {units.map((unit) => (
                        <span key={unit.id} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-neutral-700">
                          {unit.name}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Button asChild>
                        <a
                          href={buildCabinWhatsAppHref(cabinType, { checkIn, checkOut, guests })}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Confirmar por WhatsApp
                        </a>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href={`/cabanas/${cabinType.slug}`}>Ver ficha</Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-white p-8 text-center">
              <h2 className="text-xl font-semibold tracking-normal">
                No encontramos unidades libres para esas fechas
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Prueba otras fechas o escríbenos para revisar alternativas y cambios recientes.
              </p>
              <Button asChild className="mt-6">
                <a
                  href={buildCabinWhatsAppHref(undefined, { checkIn, checkOut, guests })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar por WhatsApp
                </a>
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
