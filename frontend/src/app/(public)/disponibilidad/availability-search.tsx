'use client';

import Link from 'next/link';
import { Bath, BedDouble, CalendarDays, LoaderCircle, Search, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CabinMap,
  type CabinMapSlotState,
} from '@/components/cabins/cabin-map';
import { GeneralQuoteActions } from '@/components/cabins/general-quote-actions';
import { LodgingTariffDetails } from '@/components/cabins/lodging-tariff-details';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import {
  addLocalDays,
  localDateIso,
  isStayDate,
  MAX_GROUP_GUESTS,
  stayHref,
  staySearchErrors,
  type StayContext,
} from '@/lib/stay-context';
import { generalQuoteContext, QUOTE_NOTICE } from '@/lib/general-quote';
import { getCabinCover } from '@/lib/cabin-utils';
import type { ApiResponse } from '@/types/api';
import type {
  AvailabilityResult,
  PublicCabin,
  CabinAvailabilityEntry,
  LodgingTariff,
  MapSlot,
} from '@/types/cabin';

export function AvailabilitySearch({
  initialContext = {},
}: {
  initialContext?: StayContext;
}) {
  const initialArrival = initialContext.check_in ?? localDateIso();
  const [context, setContext] = useState({
    check_in: initialArrival,
    check_out: initialContext.check_out ?? addLocalDays(initialArrival, 1),
    guests: initialContext.guests ?? '2',
  });
  const [availability, setAvailability] =
    useState<AvailabilityResult<PublicCabin> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    ReturnType<typeof staySearchErrors>
  >({});
  const requestVersion = useRef(0);
  useEffect(
    () => () => {
      requestVersion.current += 1;
    },
    [],
  );
  const tariffsQuery = useQuery({
    queryKey: ['public-lodging-tariffs'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => api.get<ApiResponse<LodgingTariff[]>>('/lodging-tariffs'),
    retry: 1,
  });
  const entries = availability?.cabins ?? [];
  const slotStates = entries.reduce<
    Partial<Record<MapSlot, CabinMapSlotState>>
  >((states, entry) => {
    if (entry.map_slot)
      states[entry.map_slot] = {
        tone: entry.tone,
        label: entry.label,
        isAvailable: entry.is_available,
      };
    return states;
  }, {});
  const quoteContext = generalQuoteContext(context);

  function change(next: typeof context) {
    // A slow earlier request cannot restore a result after the visitor edits it.
    requestVersion.current += 1;
    setContext(next);
    setAvailability(null);
    setError(null);
    setFieldErrors({});
    setIsLoading(false);
  }
  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isLoading) return;
    const errors = staySearchErrors(context);
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return;
    const version = ++requestVersion.current;
    setAvailability(null);
    setIsLoading(true);
    try {
      const response = await api.get<
        ApiResponse<AvailabilityResult<PublicCabin>>
      >(`/availability?${new URLSearchParams(context)}`);
      if (version !== requestVersion.current) return;
      setAvailability(response.data);
      window.history.replaceState(
        null,
        '',
        stayHref('/disponibilidad', quoteContext),
      );
    } catch (failure) {
      if (version !== requestVersion.current) return;
      setError(
        failure instanceof ApiError
          ? Object.values(failure.errors ?? {})
              .flat()
              .join(' ') || failure.message
          : 'No pudimos consultar disponibilidad. Reintenta con los mismos datos.',
      );
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }
  return (
    <>
      <section className="bg-cyan-950 py-12 text-white sm:py-16">
        <div className="container mx-auto px-4">
          <Badge className="bg-cyan-400 text-cyan-950 hover:bg-cyan-300">
            Disponibilidad para tu grupo
          </Badge>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-normal sm:text-5xl">
                Consulta fechas y solicita una cotización
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-cyan-50">
                Indica las fechas y cuántas personas viajarán contigo para
                conocer las cabañas disponibles.
              </p>
            </div>
            <form
              noValidate
              onSubmit={handleSubmit}
              className="min-w-0 rounded-lg bg-white p-4 text-neutral-950 shadow-xl"
            >
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-[1fr_1fr_110px_auto]">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="availability-check-in">Llegada</Label>
                  <Input
                    id="availability-check-in"
                    type="date"
                    className="h-11 text-base md:text-base"
                    min={localDateIso()}
                    value={context.check_in}
                    aria-invalid={Boolean(fieldErrors.check_in)}
                    aria-describedby={
                      fieldErrors.check_in ? 'arrival-error' : undefined
                    }
                    onChange={(event) => {
                      const date = event.target.value;
                      change({
                        ...context,
                        check_in: date,
                        check_out:
                          isStayDate(date) && context.check_out <= date
                            ? addLocalDays(date, 1)
                            : context.check_out,
                      });
                    }}
                  />
                  {fieldErrors.check_in && (
                    <p
                      id="arrival-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {fieldErrors.check_in}
                    </p>
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="availability-check-out">Salida</Label>
                  <Input
                    id="availability-check-out"
                    type="date"
                    className="h-11 text-base md:text-base"
                    min={
                      isStayDate(context.check_in)
                        ? addLocalDays(context.check_in, 1)
                        : undefined
                    }
                    value={context.check_out}
                    aria-invalid={Boolean(fieldErrors.check_out)}
                    aria-describedby={
                      fieldErrors.check_out ? 'departure-error' : undefined
                    }
                    onChange={(event) =>
                      change({ ...context, check_out: event.target.value })
                    }
                  />
                  {fieldErrors.check_out && (
                    <p
                      id="departure-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {fieldErrors.check_out}
                    </p>
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="availability-guests">Huéspedes</Label>
                  <Input
                    id="availability-guests"
                    type="number"
                    inputMode="numeric"
                    className="h-11 text-base md:text-base"
                    min={1}
                    max={MAX_GROUP_GUESTS}
                    step={1}
                    value={context.guests}
                    aria-invalid={Boolean(fieldErrors.guests)}
                    aria-describedby={
                      fieldErrors.guests ? 'guests-error' : undefined
                    }
                    onChange={(event) =>
                      change({ ...context, guests: event.target.value })
                    }
                  />
                  {fieldErrors.guests && (
                    <p
                      id="guests-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {fieldErrors.guests}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="min-h-11 self-start bg-cyan-700 text-white hover:bg-cyan-800 sm:mt-6"
                >
                  {isLoading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}{' '}
                  Buscar
                </Button>
              </div>
              {isLoading && (
                <p role="status" className="mt-4 text-sm text-neutral-600">
                  Consultando disponibilidad…
                </p>
              )}
              {error && (
                <div role="alert" className="mt-4 space-y-3">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => void handleSubmit()}
                  >
                    Reintentar consulta
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>
      {!availability && !isLoading && !error && (
        <section className="bg-stone-50 py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <div role="status" className="rounded-lg border bg-white p-5 sm:p-6">
              <CalendarDays className="size-7 text-cyan-700" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-semibold">
                Consulta la disponibilidad para tu viaje
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Elige las fechas y el número de huéspedes, y pulsa Buscar para
                conocer las cabañas disponibles.
              </p>
            </div>
          </div>
        </section>
      )}
      {availability && (
        <section
          className="bg-stone-50 py-8 sm:py-12"
          aria-label="Resultado de disponibilidad"
        >
          <div className="container mx-auto space-y-8 px-4">
            <div className="min-w-0 rounded-lg border bg-white p-5 sm:p-6">
              <GroupSummary availability={availability} />
              <p className="mt-5 text-sm leading-6 text-neutral-700">
                {QUOTE_NOTICE}
              </p>
              <GeneralQuoteActions context={quoteContext} className="mt-5" />
            </div>
            {availability && (
              <>
                <div>
                  <h2 className="mb-2 text-2xl font-semibold">
                    Cabañas en estas fechas
                  </h2>
                  <p className="mb-4 text-sm leading-6 text-muted-foreground">
                    Consulta las cabañas libres para las fechas de tu viaje.
                  </p>
                  <CabinMap
                    cabins={entries.map((entry) => entry.cabin)}
                    slotStates={slotStates}
                    linkMarkers
                    context={quoteContext}
                  />
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <LegendItem
                      color="bg-emerald-500"
                      label="Libre en estas fechas"
                    />
                    <LegendItem color="bg-red-500" label="Reserva confirmada" />
                    <LegendItem
                      color="bg-amber-500"
                      label="Mantenimiento o bloqueo"
                    />
                    <LegendItem color="bg-neutral-400" label="No operativa" />
                  </div>
                </div>
                {availability.available_cabins.length > 0 && (
                  <div className="space-y-5">
                    <h2 className="text-2xl font-semibold">
                      Conoce las cabañas libres
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Conoce sus espacios y comodidades.
                    </p>
                    {availability.available_cabins.map((entry) => (
                      <AvailableCabinCard
                        key={entry.cabin_id}
                        entry={entry}
                        context={quoteContext}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
      {(tariffsQuery.data?.data.length ?? 0) > 0 && (
        <section className="bg-white py-8">
          <div className="container mx-auto px-4">
            <h2 className="mb-4 text-2xl font-semibold">
              Tarifas de referencia
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tariffsQuery.data?.data.map((tariff) => (
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
      )}
    </>
  );
}

function GroupSummary({
  availability,
}: {
  availability: AvailabilityResult<PublicCabin>;
}) {
  const { summary, guests } = availability;
  const title =
    summary.available_count === 0
      ? 'No hay cabañas libres en estas fechas'
      : summary.can_host_guests
        ? 'Hay espacio para tu grupo'
        : 'No hay espacio suficiente para todo el grupo';
  return (
    <div role="status">
      <Badge
        className={
          summary.can_host_guests
            ? 'bg-emerald-100 text-emerald-900'
            : 'bg-amber-100 text-amber-950'
        }
      >
        {summary.can_host_guests
          ? 'Capacidad suficiente'
          : 'Consulta alternativas'}
      </Badge>
      <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span>
          <strong>Llegada:</strong> {availability.check_in}
        </span>
        <span>
          <strong>Salida:</strong> {availability.check_out}
        </span>
        <span>
          <strong>Huéspedes:</strong> {guests}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-lg">
        <div className="rounded-md bg-stone-50 p-3">
          <p className="text-sm text-neutral-600">Capacidad libre total</p>
          <p className="mt-1 text-xl font-bold">
            {summary.available_capacity} personas
          </p>
        </div>
        <div className="rounded-md bg-stone-50 p-3">
          <p className="text-sm text-neutral-600">Cabañas libres</p>
          <p className="mt-1 text-xl font-bold">{summary.available_count}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-neutral-700">
        {summary.can_host_guests
          ? 'Escríbenos para conocer el valor de tu estadía.'
          : 'Escríbenos para consultar otras fechas u opciones.'}
      </p>
    </div>
  );
}
function AvailableCabinCard({
  entry,
  context,
}: {
  entry: CabinAvailabilityEntry<PublicCabin>;
  context: StayContext;
}) {
  const cabin = entry.cabin;
  return (
    <article className="grid overflow-hidden rounded-lg border bg-white shadow-sm lg:grid-cols-[280px_1fr]">
      <div
        role="img"
        aria-label={cabin.name}
        className="min-h-[200px] bg-cover bg-center"
        style={{ backgroundImage: `url(${getCabinCover(cabin)})` }}
      />
      <div className="p-5 sm:p-6">
        <Badge variant="outline">Libre en estas fechas</Badge>
        <h3 className="mt-3 text-2xl font-semibold">{cabin.name}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {cabin.short_description ?? cabin.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="inline-flex items-center gap-1">
            <Users className="size-4" /> Hasta {cabin.max_guests} personas
          </span>
          <span className="inline-flex items-center gap-1">
            <BedDouble className="size-4" /> {cabin.beds_count} camas
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath className="size-4" /> {cabin.bathrooms_count} baños
          </span>
        </div>
        <Button asChild variant="outline" className="mt-5 min-h-11">
          <Link href={stayHref(`/cabanas/${cabin.slug}`, context)}>
            Ver ficha de {cabin.name}
          </Link>
        </Button>
      </div>
    </article>
  );
}
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
