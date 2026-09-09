'use client';

import Link from 'next/link';
import {
  Bath,
  BedDouble,
  CalendarDays,
  LoaderCircle,
  MapPinned,
  MessageCircle,
  Search,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import {
  CabinMap,
  type CabinMapSlotState,
} from '@/components/cabins/cabin-map';
import { LodgingTariffDetails } from '@/components/cabins/lodging-tariff-details';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import {
  addLocalDays as addDaysIso,
  localDateIso as todayIso,
  stayHref,
  type StayContext,
} from '@/lib/stay-context';
import { buildCabinWhatsAppHref, getCabinCover } from '@/lib/cabin-utils';
import type { ApiResponse } from '@/types/api';
import type {
  AvailabilityResult,
  PublicCabin,
  CabinAvailabilityEntry,
  LodgingTariff,
  MapSlot,
} from '@/types/cabin';

function buildSlotStates(entries: CabinAvailabilityEntry<PublicCabin>[]) {
  return entries.reduce<Partial<Record<MapSlot, CabinMapSlotState>>>(
    (states, entry) => {
      if (!entry.map_slot) {
        return states;
      }

      states[entry.map_slot] = {
        tone: entry.tone,
        label: entry.label,
        isAvailable: entry.is_available,
      };

      return states;
    },
    {},
  );
}

export function AvailabilitySearch({
  initialContext = {},
}: {
  initialContext?: StayContext;
}) {
  const defaultCheckIn = initialContext.check_in ?? todayIso();
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(
    initialContext.check_out ?? addDaysIso(defaultCheckIn, 1),
  );
  const [guests, setGuests] = useState(initialContext.guests ?? '2');
  const [availability, setAvailability] =
    useState<AvailabilityResult<PublicCabin> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const tariffsQuery = useQuery({
    queryKey: ['public-lodging-tariffs'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => api.get<ApiResponse<LodgingTariff[]>>('/lodging-tariffs'),
    retry: 1,
  });

  const tariffs = tariffsQuery.data?.data ?? [];
  const slotStates = useMemo(
    () => buildSlotStates(availability?.cabins ?? []),
    [availability?.cabins],
  );
  const mapCabins = useMemo(
    () => availability?.cabins.map((entry) => entry.cabin) ?? [],
    [availability?.cabins],
  );
  const availableEntries = [...(availability?.available_cabins ?? [])].sort(
    (a, b) =>
      Number(b.cabin_id === Number(initialContext.cabin_id)) -
      Number(a.cabin_id === Number(initialContext.cabin_id)),
  );

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isLoading) return;
    setError(null);

    if (!checkIn || checkIn < todayIso() || !checkOut || checkOut <= checkIn) {
      setError('Indica una fecha de salida posterior a la llegada.');
      return;
    }

    if (!/^\d+$/.test(guests) || Number(guests) < 1 || Number(guests) > 50) {
      setError('Indica entre 1 y 50 huéspedes.');
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
      const response = await api.get<
        ApiResponse<AvailabilityResult<PublicCabin>>
      >(`/availability?${params.toString()}`);

      setAvailability(response.data);
    } catch (error) {
      setAvailability(null);
      setError(
        error instanceof ApiError
          ? Object.values(error.errors ?? {})
              .flat()
              .join(' ') || error.message
          : 'No pudimos consultar disponibilidad. Reintenta con los mismos datos.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  const resultContext = {
    ...initialContext,
    check_in: availability?.check_in,
    check_out: availability?.check_out,
    guests: String(availability?.guests ?? guests),
  };
  const resultDates = {
    checkIn: resultContext.check_in,
    checkOut: resultContext.check_out,
    guests: resultContext.guests,
  };
  const preferredCabin = mapCabins.find(
    (cabin) => cabin.id === Number(initialContext.cabin_id),
  );
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
                Revisa el mapa por fecha. La reserva final siempre se confirma
                por contacto directo con el administrador. Las cotizaciones
                pendientes no bloquean disponibilidad.
              </p>
            </div>
            <form
              noValidate
              onSubmit={handleSubmit}
              className="rounded-lg bg-white p-4 text-neutral-950 shadow-xl"
            >
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-[1fr_1fr_100px_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="availability-check-in">Llegada</Label>
                  <Input
                    id="availability-check-in"
                    type="date"
                    min={todayIso()}
                    value={checkIn}
                    onChange={(event) => {
                      const next = event.target.value;
                      setCheckIn(next);
                      if (checkOut <= next) {
                        setCheckOut(addDaysIso(next, 1));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability-check-out">Salida</Label>
                  <Input
                    id="availability-check-out"
                    type="date"
                    min={addDaysIso(checkIn || todayIso(), 1)}
                    value={checkOut}
                    onChange={(event) => setCheckOut(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability-guests">Huespedes</Label>
                  <Input
                    id="availability-guests"
                    type="number"
                    min={1}
                    max={50}
                    value={guests}
                    onChange={(event) => setGuests(event.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="bg-cyan-700 text-white hover:bg-cyan-800"
                >
                  {isLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </div>
              {error ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </section>

      {tariffs.length > 0 ? (
        <section className="bg-white py-8">
          <div className="container mx-auto px-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tariffs.map((tariff) => (
                <article
                  key={tariff.id}
                  className="rounded-lg border bg-stone-50 p-4"
                >
                  <LodgingTariffDetails tariff={tariff} />
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-stone-50 py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <p className="py-12 text-center" role="status">
              Consultando disponibilidad…
            </p>
          ) : !hasSearched ? (
            <div className="rounded-lg border border-dashed bg-white p-8 text-center">
              <CalendarDays className="mx-auto h-9 w-9 text-cyan-700" />
              <h2 className="mt-4 text-xl font-semibold tracking-normal">
                Elige tus fechas para ver el mapa
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Verde indica disponible, rojo no disponible por reserva
                confirmada, y naranja no disponible por mantenimiento o bloqueo
                manual.
              </p>
            </div>
          ) : availability ? (
            <div className="space-y-8">
              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <CabinMap
                  cabins={mapCabins}
                  activeSlot={preferredCabin?.map_slot}
                  slotStates={slotStates}
                  linkMarkers
                  context={resultContext}
                />
                <aside className="rounded-lg border bg-white p-5">
                  <MapPinned className="h-6 w-6 text-cyan-700" />
                  <h2 className="mt-4 text-lg font-semibold tracking-normal">
                    Estado del mapa
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {availability.message}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <Metric
                      label="Verdes"
                      value={availability.summary.available_count}
                    />
                    <Metric
                      label="Rojas"
                      value={availability.summary.reserved_count}
                    />
                    <Metric
                      label="Naranja"
                      value={availability.summary.blocked_count}
                    />
                    <Metric
                      label="Capacidad libre"
                      value={availability.summary.available_capacity}
                    />
                  </div>
                  <Legend />
                  <Button asChild className="mt-6 w-full">
                    <a
                      href={buildCabinWhatsAppHref(preferredCabin, resultDates)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Confirmar por WhatsApp
                    </a>
                  </Button>
                </aside>
              </div>

              {availableEntries.length > 0 ? (
                <div className="grid gap-5">
                  {availableEntries.map((entry) => (
                    <AvailableCabinCard
                      key={entry.cabin_id}
                      entry={entry}
                      checkIn={availability.check_in}
                      checkOut={availability.check_out}
                      guests={String(availability.guests ?? guests)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border bg-white p-8 text-center">
                  <h2 className="text-xl font-semibold tracking-normal">
                    No vemos cabañas libres para esas fechas
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    La disponibilidad es orientativa y la confirmacion final es
                    directa del administrador. Escribenos para revisar cambios
                    recientes, ajustes de grupo u otras fechas.
                  </p>
                  <Button asChild className="mt-6">
                    <a
                      href={buildCabinWhatsAppHref(undefined, {
                        checkIn,
                        checkOut,
                        guests,
                      })}
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
          ) : (
            <div className="rounded-lg border bg-white p-8 text-center">
              <h2 className="text-xl font-semibold tracking-normal">
                No pudimos cargar el mapa
              </h2>
              <Button className="mt-4" onClick={() => void handleSubmit()}>
                Reintentar consulta
              </Button>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Tus fechas se conservan para reintentar.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function AvailableCabinCard({
  entry,
  checkIn,
  checkOut,
  guests,
}: {
  entry: CabinAvailabilityEntry<PublicCabin>;
  checkIn: string;
  checkOut: string;
  guests: string;
}) {
  const cabin = entry.cabin;

  return (
    <article className="grid overflow-hidden rounded-lg border bg-white shadow-sm lg:grid-cols-[320px_1fr]">
      <div
        className="min-h-[220px] bg-cover bg-center"
        style={{ backgroundImage: `url(${getCabinCover(cabin)})` }}
      />
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant={entry.fits_guests ? 'default' : 'outline'}>
              {entry.fits_guests ? 'Disponible' : 'Libre, revisar capacidad'}
            </Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-normal text-neutral-950">
              {cabin.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              {cabin.short_description ?? cabin.description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-900">
            <Users className="h-3.5 w-3.5" />
            Hasta {cabin.max_guests}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs text-neutral-700">
            <BedDouble className="h-3.5 w-3.5" />
            {cabin.beds_count} camas
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs text-neutral-700">
            <Bath className="h-3.5 w-3.5" />
            {cabin.bathrooms_count} banos
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild>
            <Link
              href={stayHref('/contacto', {
                cabin_id: String(cabin.id),
                check_in: checkIn,
                check_out: checkOut,
                guests,
              })}
            >
              Enviar solicitud
            </Link>
          </Button>
          <Button asChild>
            <a
              href={buildCabinWhatsAppHref(cabin, {
                checkIn,
                checkOut,
                guests,
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              Confirmar por WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={stayHref(`/cabanas/${cabin.slug}`, {
                cabin_id: String(cabin.id),
                check_in: checkIn,
                check_out: checkOut,
                guests,
              })}
            >
              Ver ficha
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-stone-50 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-5 grid gap-2 text-xs text-neutral-700">
      <LegendItem className="bg-emerald-500" label="Disponible" />
      <LegendItem
        className="bg-red-500"
        label="Reserva confirmada (las cotizaciones no bloquean)"
      />
      <LegendItem className="bg-amber-500" label="Mantenimiento o bloqueo" />
    </div>
  );
}

function LegendItem({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
