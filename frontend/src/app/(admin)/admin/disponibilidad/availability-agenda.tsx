'use client';

import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BedDouble,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit3,
  FileText,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import {
  agendaEvents,
  reservationSources,
  type AgendaEvent,
  type AgendaFilter,
  type ReservationEventKind,
} from './availability-model';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type {
  AvailabilityAgenda,
  AvailabilityAgendaBlock,
  AvailabilityAgendaReservation,
} from '@/types/cabin';

export type AgendaSelection =
  | {
      type: 'reservation';
      reservation: AvailabilityAgendaReservation;
      kind: ReservationEventKind;
    }
  | { type: 'block'; block: AvailabilityAgendaBlock };

const INITIAL_VISIBLE_RECORDS = 8;

const EVENT_META: Record<
  AgendaEvent['kind'],
  { label: string; className: string; icon: typeof ArrowDownToLine }
> = {
  arrival: {
    label: 'Llegada',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: ArrowDownToLine,
  },
  departure: {
    label: 'Salida',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
    icon: ArrowUpFromLine,
  },
  stay: {
    label: 'Estancia prevista',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    icon: BedDouble,
  },
  quote: {
    label: 'Cotización',
    className: 'border-violet-200 bg-violet-50 text-violet-800',
    icon: FileText,
  },
  block: {
    label: 'Bloqueo',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: LockKeyhole,
  },
};

function toDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function formatDateTile(value: string) {
  const date = toDate(value);
  return {
    day: new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      timeZone: 'UTC',
    }).format(date),
    month: new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' })
      .format(date)
      .replace('.', '')
      .toUpperCase(),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toDate(value));
}

function formatRange(checkIn: string, checkOut: string) {
  return `${formatDate(checkIn)} – ${formatDate(checkOut)}`;
}

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  }).format(new Date(value));
}

export function AvailabilityAgendaSection({
  agenda,
  isLoading,
  isFetching,
  errorMessage,
  onRetry,
  onSelect,
  day,
}: {
  agenda: AvailabilityAgenda | undefined;
  isLoading: boolean;
  isFetching: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onSelect: (selection: AgendaSelection) => void;
  day?: string;
}) {
  const [filter, setFilter] = useState<AgendaFilter>('all');
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const events = useMemo(
    () => (agenda ? agendaEvents(agenda, filter, day, search) : []),
    [agenda, filter, day, search],
  );
  const visibleEvents = expanded
    ? events
    : events.slice(0, INITIAL_VISIBLE_RECORDS);
  const allEvents = agenda ? agendaEvents(agenda, 'all', day) : [];
  const recordCount = new Set(
    allEvents
      .filter((event) => event.kind !== 'block')
      .map((event) => event.reservation.id),
  ).size;
  const filters: Array<{ value: AgendaFilter; label: string; count: number }> =
    (
      [
        ['all', 'Todo'],
        ['arrivals', 'Llegadas'],
        ['departures', 'Salidas'],
        ['stays', 'Estancias'],
        ['quotes', 'Cotizaciones'],
        ['blocks', 'Bloqueos'],
      ] as const
    ).map(([value, label]) => ({
      value,
      label,
      count: agenda ? agendaEvents(agenda, value, day, search).length : 0,
    }));

  return (
    <section
      id="agenda"
      className="scroll-mt-4 overflow-hidden rounded-xl border bg-white shadow-sm"
      aria-labelledby="availability-agenda-title"
    >
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-cyan-700" />
            <h2 id="availability-agenda-title" className="font-semibold">
              {day ? 'Movimientos del día' : 'Agenda del rango'}
            </h2>
            {isFetching && !isLoading ? (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                aria-live="polite"
              >
                <LoaderCircle className="size-3.5 animate-spin" /> Actualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {agenda
              ? day
                ? formatDate(day)
                : `${formatDate(agenda.period.from)} – ${formatDate(agenda.period.to)}`
              : 'Movimientos y pendientes operativos del periodo consultado.'}
          </p>
        </div>
        {agenda ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{allEvents.length}</strong>{' '}
              movimientos y pendientes
            </span>
            <span>
              <strong className="text-foreground">{recordCount}</strong>{' '}
              reservas / cotizaciones únicas
            </span>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <AgendaSkeleton />
      ) : errorMessage ? (
        <div className="grid min-h-56 place-items-center p-6 text-center">
          <div>
            <CalendarClock className="mx-auto size-8 text-red-600" />
            <p className="mt-3 font-semibold">No pudimos cargar la agenda</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {errorMessage}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-11"
              onClick={onRetry}
            >
              <RefreshCw className="size-4" /> Reintentar
            </Button>
          </div>
        </div>
      ) : agenda ? (
        <>
          <div className="px-4 pt-3">
            <label className="relative block">
              <Search
                className="absolute left-3 top-3.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="sr-only">Buscar titular o cabaña en agenda</span>
              <Input
                className="h-11 pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setExpanded(false);
                }}
                placeholder="Buscar titular o cabaña"
              />
            </label>
          </div>
          <div
            className="overflow-x-auto border-b px-4 py-3"
            role="toolbar"
            aria-label="Filtros de la agenda"
          >
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  className="min-h-11"
                  variant={filter === item.value ? 'default' : 'outline'}
                  aria-pressed={filter === item.value}
                  onClick={() => {
                    setFilter(item.value);
                    setExpanded(false);
                  }}
                >
                  {item.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[11px] leading-none',
                      filter === item.value
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-100 text-muted-foreground',
                    )}
                  >
                    {item.count}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {events.length === 0 ? (
            <div className="grid min-h-48 place-items-center p-6 text-center">
              <div>
                <CalendarClock className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">
                  No hay movimientos en este filtro
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prueba otra categoría o consulta un rango diferente.
                </p>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'divide-y transition-opacity',
                isFetching && 'opacity-60',
              )}
              aria-busy={isFetching}
            >
              {visibleEvents.map((event) => (
                <AgendaRow
                  key={event.key}
                  event={event}
                  onSelect={() =>
                    onSelect(
                      event.kind === 'block'
                        ? { type: 'block', block: event.block }
                        : {
                            type: 'reservation',
                            reservation: event.reservation,
                            kind: event.kind,
                          },
                    )
                  }
                />
              ))}
            </div>
          )}

          {events.length > INITIAL_VISIBLE_RECORDS ? (
            <div className="border-t p-3 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((current) => !current)}
              >
                {expanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                {expanded ? 'Ver menos' : `Mostrar todos (${events.length})`}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function AgendaRow({
  event,
  onSelect,
}: {
  event: AgendaEvent;
  onSelect: () => void;
}) {
  const meta = EVENT_META[event.kind];
  const Icon = meta.icon;
  const { day, month } = formatDateTile(event.date);
  const isBlock = event.kind === 'block';
  const record = isBlock ? event.block : event.reservation;
  const title = isBlock
    ? event.block.reason
    : (event.reservation.leader_name ?? 'Sin titular');
  const range = formatRange(record.check_in, record.check_out);
  const cabinNames = isBlock
    ? event.block.cabin_names
    : event.reservation.cabin_names;
  const notes = isBlock ? event.block.notes : event.reservation.notes;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative grid w-full min-w-0 grid-cols-[44px_minmax(0,1fr)] items-start gap-3 p-3 pr-8 text-left transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-700 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center sm:pr-4"
      aria-label={`${meta.label}: ${title}, ${range}. Abrir detalle`}
    >
      <div className="block">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-950 sm:size-11">
          <span className="text-lg font-bold leading-none">{day}</span>
          <span className="text-[9px] font-semibold tracking-wide">
            {month}
          </span>
        </div>
        <Badge variant="outline" className={cn('hidden', meta.className)}>
          <Icon className="size-3" /> {meta.label}
        </Badge>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 break-words font-semibold">{title}</p>
          <Badge
            variant="outline"
            className={cn('inline-flex gap-1', meta.className)}
          >
            <Icon className="size-3" /> {meta.label}
          </Badge>
          {!isBlock ? (
            <Badge variant="outline">{event.reservation.status_label}</Badge>
          ) : null}
        </div>
        <p className="mt-1 break-words text-xs text-muted-foreground">
          {range}
        </p>
        <div className="mt-1 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="break-words">
            {cabinNames.length ? cabinNames.join(', ') : 'Sin cabaña asignada'}
          </span>
          {!isBlock ? (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" /> {event.reservation.guests_count}{' '}
              personas
            </span>
          ) : null}
          {!isBlock && event.reservation.expires_at ? (
            <span className="inline-flex items-center gap-1 text-violet-700">
              <Clock3 className="size-3.5" /> Vence{' '}
              {formatExpiry(event.reservation.expires_at)}
            </span>
          ) : null}
          {!isBlock && event.reservation.assigned_staff ? (
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" />{' '}
              {event.reservation.assigned_staff.full_name}
            </span>
          ) : null}
        </div>
        {notes ? (
          <p className="mt-2 line-clamp-1 break-words text-xs text-muted-foreground">
            {notes}
          </p>
        ) : null}
      </div>

      <span
        className="absolute right-4 top-5 text-muted-foreground sm:static"
        aria-hidden="true"
      >
        <ArrowRight className="size-4" />
      </span>
    </button>
  );
}

function AgendaSkeleton() {
  return (
    <div
      className="animate-pulse"
      aria-label="Cargando agenda"
      aria-busy="true"
    >
      <div className="flex gap-2 border-b p-4">
        {[74, 92, 82, 110, 84].map((width) => (
          <div
            key={width}
            className="h-8 rounded-md bg-stone-100"
            style={{ width }}
          />
        ))}
      </div>
      {[1, 2, 3, 4].map((row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-b p-4 last:border-b-0"
        >
          <div className="size-14 shrink-0 rounded-lg bg-stone-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-48 max-w-full rounded bg-stone-100" />
            <div className="h-3 w-72 max-w-full rounded bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AvailabilityAgendaDetail({
  canOperate,
  selection,
  onClose,
  onEditReservation,
  onConfirm,
  onRenew,
  onCancel,
  onEditBlock,
  onDeleteBlock,
  isPending,
}: {
  canOperate: boolean;
  selection: AgendaSelection | null;
  onClose: () => void;
  onEditReservation: (reservation: AvailabilityAgendaReservation) => void;
  onConfirm: (reservation: AvailabilityAgendaReservation) => void;
  onRenew: (reservation: AvailabilityAgendaReservation) => void;
  onCancel: (reservation: AvailabilityAgendaReservation) => void;
  onEditBlock: (id: number) => void;
  onDeleteBlock: (id: number) => void;
  isPending: boolean;
}) {
  if (!selection) return null;

  if (selection.type === 'block') {
    const { block } = selection;
    return (
      <AgendaSheet
        open
        onClose={onClose}
        title={block.reason}
        description="Detalle del bloqueo operativo"
      >
        <DetailGrid
          items={[
            [
              'Estado',
              block.applies_to_all ? 'Bloqueo global' : 'Bloqueo específico',
            ],
            ['Rango', formatRange(block.check_in, block.check_out)],
            ['Cabañas', block.cabin_names.join(', ') || 'Sin cabañas'],
          ]}
        />
        {block.notes ? <DetailNotes>{block.notes}</DetailNotes> : null}
        {canOperate && <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onEditBlock(block.id)}
          >
            <Edit3 className="size-4" /> Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDeleteBlock(block.id)}
            disabled={isPending}
          >
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}{' '}
            Eliminar
          </Button>
        </div>}
      </AgendaSheet>
    );
  }

  const { reservation, kind } = selection;
  const meta = EVENT_META[kind];
  const readOnly =
    reservation.status === 'checked_in' || reservation.status === 'checked_out';
  const isQuote = reservation.status === 'pending';

  return (
    <AgendaSheet
      open
      onClose={onClose}
      title={reservation.leader_name ?? 'Sin titular'}
      description={`${meta.label} · ${reservation.status_label}`}
    >
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className={meta.className}>
          {meta.label}
        </Badge>
        <Badge variant="outline">{reservation.status_label}</Badge>
      </div>
      <DetailGrid
        items={[
          ['Rango', formatRange(reservation.check_in, reservation.check_out)],
          [
            'Cabañas',
            reservation.cabin_names.join(', ') || 'Sin cabaña asignada',
          ],
          ['Personas', String(reservation.guests_count)],
          ...(reservation.expires_at
            ? [
                ['Vigente hasta', formatExpiry(reservation.expires_at)] as [
                  string,
                  string,
                ],
              ]
            : []),
          ...(reservation.assigned_staff
            ? [
                [
                  'Responsable',
                  `${reservation.assigned_staff.full_name} · ${reservation.assigned_staff.role_label}`,
                ] as [string, string],
              ]
            : []),
          [
            'Celular del encargado',
            reservation.leader_phone || 'Sin registrar',
          ],
          ['WhatsApp', reservation.leader_whatsapp || 'Sin registrar'],
          [
            'Origen',
            reservation.source
              ? (reservationSources[reservation.source] ?? reservation.source)
              : 'Sin especificar',
          ],
        ]}
      />
      {reservation.notes ? (
        <DetailNotes>{reservation.notes}</DetailNotes>
      ) : null}
      {readOnly ? (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950">
          Este registro ya tiene{' '}
          {reservation.status === 'checked_in' ? 'check-in' : 'check-out'} y
          está disponible solo para consulta.
        </div>
      ) : canOperate ? (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onEditReservation(reservation)}
          >
            <Edit3 className="size-4" /> Editar
          </Button>
          {isQuote ? (
            <>
              <Button
                type="button"
                onClick={() => onConfirm(reservation)}
                disabled={isPending}
              >
                <Check className="size-4" /> Confirmar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onRenew(reservation)}
                disabled={isPending}
              >
                <Clock3 className="size-4" /> Renovar 48 horas
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            onClick={() => onCancel(reservation)}
            disabled={isPending}
          >
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <XCircle className="size-4" />
            )}{' '}
            Cancelar
          </Button>
        </div>
      ) : null}
    </AgendaSheet>
  );
}

function AgendaSheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent className="h-dvh w-full overflow-y-auto sm:max-w-lg [&_button]:min-h-11 [&>button]:size-11 [&>button]:top-1 [&>button]:right-1 [&>button]:grid [&>button]:place-items-center">
        <SheetHeader>
          <SheetTitle className="break-words">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

function DetailGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-4 rounded-lg border bg-stone-50 p-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </dt>
          <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailNotes({ children }: { children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Notas
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
        {children}
      </p>
    </div>
  );
}
