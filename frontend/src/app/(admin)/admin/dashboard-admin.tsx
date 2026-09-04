'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  Clock3,
  Gauge,
  LoaderCircle,
  MessageCircleMore,
  RefreshCw,
  Star,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError, api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@/types/api';
import type {
  DashboardArrival,
  DashboardMonth,
  DashboardOperations,
} from '@/types/dashboard';

type Tone = 'cyan' | 'emerald' | 'amber' | 'violet';

const TONE_CLASSES: Record<Tone, { icon: string; value: string }> = {
  cyan: { icon: 'bg-cyan-50 text-cyan-700', value: 'text-cyan-800' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700', value: 'text-emerald-800' },
  amber: { icon: 'bg-amber-50 text-amber-700', value: 'text-amber-800' },
  violet: { icon: 'bg-violet-50 text-violet-700', value: 'text-violet-800' },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(`${value}T00:00:00Z`))
    .replace('.', '');
}

function formatGeneratedAt(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    })
      .format(new Date(value))
      .replace('.', '');
  } catch {
    return 'ahora';
  }
}

function formatRate(value: number) {
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)}%`;
}

function arrivalDateParts(value: string) {
  const date = new Date(`${value}T00:00:00Z`);

  return {
    day: new Intl.DateTimeFormat('es-CO', { day: '2-digit', timeZone: 'UTC' }).format(date),
    month: new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' })
      .format(date)
      .replace('.', ''),
  };
}

export function DashboardAdmin() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard-operations', year],
    queryFn: () =>
      api.get<ApiResponse<DashboardOperations>>(`/admin/dashboard/operations?year=${year}`),
    retry: 1,
  });

  const dashboard = dashboardQuery.data?.data;
  const availableYears = dashboard?.period.available_years ?? [year];

  return (
    <div className="space-y-8 pb-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Operación
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-neutral-950">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Estado del alojamiento, próximas llegadas y tareas que requieren atención.
          </p>
          {dashboard ? (
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              Actualizado {formatGeneratedAt(dashboard.period.generated_at, dashboard.period.timezone)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="bg-cyan-700 text-white hover:bg-cyan-800">
            <Link href="/admin/disponibilidad">
              <CalendarCheck2 aria-hidden="true" />
              Abrir disponibilidad
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void dashboardQuery.refetch()}
            disabled={dashboardQuery.isFetching}
          >
            {dashboardQuery.isFetching ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            Actualizar
          </Button>
        </div>
      </header>

      {dashboardQuery.isLoading ? <DashboardLoading /> : null}

      {dashboardQuery.isError && !dashboard ? (
        <DashboardError
          error={dashboardQuery.error}
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : null}

      {dashboard ? (
        <>
          <TodaySection dashboard={dashboard} />
          <AlertsSection dashboard={dashboard} />

          <section className="space-y-4" aria-labelledby="annual-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                  Tendencia anual
                </p>
                <h2 id="annual-title" className="mt-1 text-xl font-semibold text-neutral-950">
                  Comportamiento de la operación
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ocupación, reservas y huéspedes del año seleccionado.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="dashboard-year" className="text-sm font-medium text-neutral-700">
                  Año
                </label>
                <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                  <SelectTrigger id="dashboard-year" className="w-28 bg-white" aria-label="Año del dashboard">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((availableYear) => (
                      <SelectItem key={availableYear} value={String(availableYear)}>
                        {availableYear}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <OccupancyChart months={dashboard.months} />
              <VolumeChart months={dashboard.months} />
            </div>
          </section>

          <ArrivalsSection dashboard={dashboard} />
        </>
      ) : null}
    </div>
  );
}

function TodaySection({ dashboard }: { dashboard: DashboardOperations }) {
  const sellableCabins = Math.max(
    0,
    dashboard.today.operational_cabins - dashboard.today.blocked_cabins,
  );
  const occupancyHelper = dashboard.today.operational_cabins
    ? `${dashboard.today.occupied_cabins} de ${sellableCabins} cabañas utilizables${
        dashboard.today.blocked_cabins
          ? ` · ${dashboard.today.blocked_cabins} bloqueada${dashboard.today.blocked_cabins === 1 ? '' : 's'}`
          : ''
      }`
    : 'No hay cabañas operativas';
  const expiringQuotes = dashboard.alerts.expiring_quotes_next_12_hours;

  return (
    <section className="space-y-4" aria-labelledby="today-title">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Ahora</p>
        <h2 id="today-title" className="mt-1 text-xl font-semibold text-neutral-950">
          Operación de hoy
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ocupación"
          value={formatRate(dashboard.today.occupancy_rate)}
          helper={occupancyHelper}
          icon={Gauge}
          tone="cyan"
        />
        <KpiCard
          label="Próximas llegadas"
          value={String(dashboard.next_7_days.arrivals_count)}
          helper={`${formatDate(dashboard.next_7_days.from)} – ${formatDate(dashboard.next_7_days.to)}`}
          icon={CalendarCheck2}
          tone="emerald"
        />
        <KpiCard
          label="Huéspedes esperados"
          value={String(dashboard.next_7_days.guests_count)}
          helper="En las llegadas de los próximos 7 días"
          icon={UsersRound}
          tone="violet"
        />
        <KpiCard
          label="Cotizaciones activas"
          value={String(dashboard.alerts.active_quotes)}
          helper={
            expiringQuotes > 0
              ? `${expiringQuotes} vence${expiringQuotes === 1 ? '' : 'n'} en las próximas 12 h`
              : 'Ninguna vence en las próximas 12 h'
          }
          icon={Clock3}
          tone="amber"
        />
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const classes = TONE_CLASSES[tone];

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className={cn('mt-3 text-3xl font-bold tabular-nums', classes.value)}>{value}</p>
        </div>
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', classes.icon)}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function AlertsSection({ dashboard }: { dashboard: DashboardOperations }) {
  const pendingReviews = dashboard.alerts.pending_reviews;
  const unansweredLeads = dashboard.alerts.unanswered_leads;

  return (
    <section className="space-y-3" aria-labelledby="alerts-title">
      <div className="flex items-center gap-2">
        <MessageCircleMore className="size-5 text-neutral-600" aria-hidden="true" />
        <h2 id="alerts-title" className="text-lg font-semibold text-neutral-950">
          Tareas pendientes
        </h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Link
          href="/admin/resenas"
          className="group flex min-h-24 items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
            <Star className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-amber-950">Reseñas pendientes</span>
            <span className="mt-1 block text-sm text-amber-800">
              {pendingReviews === 0
                ? 'No hay reseñas por moderar.'
                : `${pendingReviews} reseña${pendingReviews === 1 ? '' : 's'} necesita${pendingReviews === 1 ? '' : 'n'} revisión.`}
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-amber-700 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>

        <div className="flex min-h-24 items-center gap-4 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-cyan-700 shadow-sm">
            <MessageCircleMore className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-cyan-950">Consultas nuevas</p>
            <p className="mt-1 text-sm text-cyan-800">
              {unansweredLeads === 0
                ? 'No hay contactos nuevos por atender.'
                : `${unansweredLeads} contacto${unansweredLeads === 1 ? '' : 's'} registrado${unansweredLeads === 1 ? '' : 's'} desde el sitio.`}
            </p>
          </div>
          <span className="text-2xl font-bold tabular-nums text-cyan-900">{unansweredLeads}</span>
        </div>
      </div>
    </section>
  );
}

function OccupancyChart({ months }: { months: DashboardMonth[] }) {
  const hasOccupancy = months.some((month) => month.occupied_nights > 0);

  return (
    <figure className="overflow-hidden rounded-xl border bg-white p-4 shadow-sm sm:p-6">
      <figcaption>
        <h3 className="font-semibold text-neutral-950">Ocupación mensual</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Noches ocupadas sobre noches-cabaña utilizables.
        </p>
      </figcaption>
      {!hasOccupancy ? (
        <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-muted-foreground">
          Sin noches ocupadas registradas para este año.
        </p>
      ) : null}
      <div className="mt-5 grid h-56 grid-cols-12 items-end gap-1 sm:gap-2" role="list" aria-label="Ocupación por mes">
        {months.map((month) => {
          const visibleHeight = month.occupancy_rate > 0 ? Math.max(month.occupancy_rate, 3) : 0;

          return (
            <div
              key={month.month}
              className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
              role="listitem"
              aria-label={`${month.label}: ${formatRate(month.occupancy_rate)}, ${month.occupied_nights} noches ocupadas de ${month.operational_nights}`}
            >
              <span className="text-[9px] font-semibold tabular-nums text-neutral-700 sm:text-[10px]">
                {formatRate(month.occupancy_rate)}
              </span>
              <span className="flex h-40 w-full max-w-8 items-end overflow-hidden rounded-t-md bg-neutral-100">
                <span
                  className="block w-full rounded-t-md bg-cyan-600 transition-[height]"
                  style={{ height: `${visibleHeight}%` }}
                  aria-hidden="true"
                />
              </span>
              <span className="text-[10px] font-medium uppercase text-muted-foreground sm:text-xs">
                <span className="sm:hidden">{month.label.slice(0, 1)}</span>
                <span className="hidden sm:inline">{month.label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

function VolumeChart({ months }: { months: DashboardMonth[] }) {
  const maxValue = Math.max(
    1,
    ...months.flatMap((month) => [month.reservations_count, month.guests_count]),
  );
  const hasActivity = months.some(
    (month) => month.reservations_count > 0 || month.guests_count > 0,
  );

  return (
    <figure className="overflow-hidden rounded-xl border bg-white p-4 shadow-sm sm:p-6">
      <figcaption>
        <h3 className="font-semibold text-neutral-950">Reservas y huéspedes</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Llegadas registradas según su mes de ingreso.
        </p>
      </figcaption>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground" aria-label="Leyenda">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-violet-500" aria-hidden="true" /> Reservas
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-emerald-500" aria-hidden="true" /> Huéspedes
        </span>
        {!hasActivity ? <span>Sin llegadas registradas para este año.</span> : null}
      </div>
      <div className="mt-5 grid h-56 grid-cols-12 items-end gap-1 sm:gap-2" role="list" aria-label="Reservas y huéspedes por mes">
        {months.map((month) => (
          <div
            key={month.month}
            className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
            role="listitem"
            aria-label={`${month.label}: ${month.reservations_count} reservas y ${month.guests_count} huéspedes`}
          >
            <span className="text-[9px] font-semibold tabular-nums text-neutral-700 sm:text-[10px]">
              {month.reservations_count}/{month.guests_count}
            </span>
            <span className="flex h-40 w-full max-w-9 items-end justify-center gap-px rounded-t-md bg-neutral-100 px-1">
              <span
                className="block w-2 rounded-t-sm bg-violet-500"
                style={{
                  height: month.reservations_count
                    ? `${Math.max((month.reservations_count / maxValue) * 100, 3)}%`
                    : '0%',
                }}
                aria-hidden="true"
              />
              <span
                className="block w-2 rounded-t-sm bg-emerald-500"
                style={{
                  height: month.guests_count
                    ? `${Math.max((month.guests_count / maxValue) * 100, 3)}%`
                    : '0%',
                }}
                aria-hidden="true"
              />
            </span>
            <span className="text-[10px] font-medium uppercase text-muted-foreground sm:text-xs">
              <span className="sm:hidden">{month.label.slice(0, 1)}</span>
              <span className="hidden sm:inline">{month.label}</span>
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

function ArrivalsSection({ dashboard }: { dashboard: DashboardOperations }) {
  const arrivals = dashboard.next_7_days.arrivals;

  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm" aria-labelledby="arrivals-title">
      <div className="flex flex-col gap-3 border-b px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 id="arrivals-title" className="text-lg font-semibold text-neutral-950">
            Próximas llegadas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(dashboard.next_7_days.from)} – {formatDate(dashboard.next_7_days.to)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link
            href={`/admin/disponibilidad?from=${dashboard.next_7_days.from}&to=${dashboard.next_7_days.to}`}
          >
            Ver en disponibilidad
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {arrivals.length > 0 ? (
        <div className="divide-y">
          {arrivals.map((arrival) => (
            <ArrivalRow key={arrival.id} arrival={arrival} />
          ))}
          {dashboard.next_7_days.arrivals_count > arrivals.length ? (
            <p className="bg-neutral-50 px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
              Mostrando {arrivals.length} de {dashboard.next_7_days.arrivals_count} llegadas. Abre
              Disponibilidad para revisar el resto.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CalendarCheck2 className="size-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-semibold text-neutral-950">No hay llegadas programadas</h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            No se encontraron reservas confirmadas dentro de los próximos siete días.
          </p>
        </div>
      )}
    </section>
  );
}

function ArrivalRow({ arrival }: { arrival: DashboardArrival }) {
  const date = arrivalDateParts(arrival.check_in);
  const cabinNames = arrival.cabin_names.length > 0
    ? arrival.cabin_names.join(', ')
    : 'Sin cabaña asignada';

  return (
    <Link
      href={`/admin/disponibilidad?from=${arrival.check_in}&to=${arrival.check_out}`}
      className="group grid gap-4 px-4 py-4 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center sm:px-6"
      aria-label={`Ver llegada de ${arrival.leader_name ?? 'titular sin nombre'} en disponibilidad`}
    >
      <span className="flex w-16 flex-col items-center justify-center rounded-lg bg-cyan-50 px-2 py-2 text-cyan-900">
        <span className="text-xl font-bold leading-none tabular-nums">{date.day}</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{date.month}</span>
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-neutral-950">
            {arrival.leader_name ?? 'Titular sin nombre'}
          </span>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            {arrival.status_label}
          </Badge>
        </span>
        <span className="mt-1 block truncate text-sm text-muted-foreground">{cabinNames}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          Sale el {formatDate(arrival.check_out)}
        </span>
      </span>
      <span className="flex items-center justify-between gap-4 sm:justify-end">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700">
          <UsersRound className="size-4 text-violet-600" aria-hidden="true" />
          {arrival.guests_count} {arrival.guests_count === 1 ? 'persona' : 'personas'}
        </span>
        <ArrowRight className="size-5 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-cyan-700" aria-hidden="true" />
      </span>
    </Link>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-8" aria-label="Cargando dashboard" aria-busy="true">
      <section className="space-y-4">
        <div className="h-6 w-44 animate-pulse rounded bg-neutral-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-xl border bg-neutral-100" />
          ))}
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl border bg-neutral-100" />
        <div className="h-80 animate-pulse rounded-xl border bg-neutral-100" />
      </div>
      <div className="h-72 animate-pulse rounded-xl border bg-neutral-100" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : 'No pudimos consultar la operación.';

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <AlertCircle className="mx-auto size-8 text-red-700" aria-hidden="true" />
      <h2 className="mt-3 font-semibold text-red-950">No pudimos cargar el Dashboard</h2>
      <p className="mt-1 text-sm text-red-800">{message}</p>
      <Button type="button" variant="outline" className="mt-4 border-red-300 bg-white" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Reintentar
      </Button>
    </div>
  );
}
