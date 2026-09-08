'use client';

import { useState, useSyncExternalStore } from 'react';
import {
  Check,
  CheckCircle2,
  BedDouble,
  CalendarDays,
  LayoutGrid,
  List,
  LockKeyhole,
  Map as MapIcon,
  MessageCircle,
  Search,
  Users,
} from 'lucide-react';
import {
  CabinMap,
  type CabinMapSlotState,
} from '@/components/cabins/cabin-map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type {
  MapSlot,
  PlannerCabin,
  PlannerReservation,
  PlannerResult,
  PlannerSegment,
} from '@/types/cabin';
import {
  addDaysIso,
  formatDate,
  formatRange,
  freeRanges,
  matrixSegments,
  normalizeSearch,
  rangeLength,
  type AvailabilityFilters,
  type AvailabilityView,
} from './availability-model';

const tones = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  reserved: 'border-red-200 bg-red-50 text-red-900',
  blocked: 'border-amber-200 bg-amber-50 text-amber-900',
  maintenance: 'border-amber-200 bg-amber-50 text-amber-900',
  inactive: 'border-stone-200 bg-stone-100 text-stone-600',
};
const stateLabels = {
  available: 'Libre',
  reserved: 'Ocupada',
  blocked: 'Bloqueo',
  maintenance: 'Mantenimiento',
  inactive: 'Inactiva',
};

type ResultsProps = {
  planner: PlannerResult;
  filters: AvailabilityFilters;
  view: AvailabilityView;
  onView: (view: AvailabilityView) => void;
  selected: number[];
  onSelect: (ids: number[]) => void;
  onInspect: (cabin: PlannerCabin, date?: string) => void;
};

const subscribeWidth = (callback: () => void) => {
  const query = window.matchMedia('(min-width: 1024px)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const desktopSnapshot = () => window.matchMedia('(min-width: 1024px)').matches;
const serverDesktop = () => false;

export function AvailabilityResults({
  planner,
  filters,
  view,
  onView,
  selected,
  onSelect,
  onInspect,
}: ResultsProps) {
  const [search, setSearch] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const desktop = useSyncExternalStore(
    subscribeWidth,
    desktopSnapshot,
    serverDesktop,
  );
  const activeView = view === 'auto' ? (desktop ? 'matrix' : 'list') : view;
  const cabins = planner.cabins.filter(
    (cabin) =>
      normalizeSearch(cabin.name).includes(normalizeSearch(search)) &&
      (!onlyFree || cabin.available_for_range),
  );
  const toggle = (cabin: PlannerCabin) =>
    onSelect(
      selected.includes(cabin.cabin_id)
        ? selected.filter((id) => id !== cabin.cabin_id)
        : [...selected, cabin.cabin_id],
    );
  const quotes = planner.summary.quoted_count ?? 0;
  const selectedCabins = planner.cabins.filter((cabin) =>
    selected.includes(cabin.cabin_id),
  );
  const slots: Partial<Record<MapSlot, CabinMapSlotState>> = {};
  for (const cabin of cabins) {
    if (!cabin.map_slot) continue;
    const segment = cabin.segments.find((item) => !item.is_available);
    slots[cabin.map_slot] = {
      tone: segment?.tone ?? 'green',
      label: cabin.available_for_range
        ? 'Libre toda la estancia'
        : 'Ver fechas y detalle',
      isAvailable: true,
    };
  }

  return (
    <section
      className="min-w-0 space-y-3"
      aria-label="Resultados de disponibilidad"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            {planner.summary.available_count} cabañas libres durante toda la
            estancia
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {rangeLength(filters.checkIn, filters.checkOut)} noches · Capacidad
            libre: {planner.summary.available_capacity} personas
            {quotes > 0 ? ` · ${quotes} con cotizaciones (no bloquean)` : ''}
          </p>
        </div>
        <div
          className="flex rounded-lg border bg-white p-1"
          role="group"
          aria-label="Presentación de disponibilidad"
        >
          {(
            [
              { value: 'list', label: 'Lista', Icon: List },
              { value: 'matrix', label: 'Matriz', Icon: LayoutGrid },
              { value: 'map', label: 'Mapa', Icon: MapIcon },
            ] as const
          ).map(({ value, label, Icon }) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              className={cn(
                'min-h-11 px-3',
                view === value && 'bg-cyan-50 text-cyan-900',
                view === 'auto' &&
                  value === 'list' &&
                  'bg-cyan-50 text-cyan-900 lg:bg-transparent lg:text-foreground',
                view === 'auto' &&
                  value === 'matrix' &&
                  'lg:bg-cyan-50 lg:text-cyan-900',
              )}
              aria-label={`Ver ${label.toLowerCase()}`}
              aria-pressed={activeView === value}
              onClick={() => onView(value)}
            >
              <Icon className="size-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-3.5 size-4 text-muted-foreground"
          />
          <span className="sr-only">Filtrar cabañas</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cabaña"
            className="h-11 pl-9"
          />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyFree}
            onChange={(event) => setOnlyFree(event.target.checked)}
            className="size-4 accent-cyan-700"
          />
          Solo libres
        </label>
      </div>
      {planner.suggestions.length > 0 && (
        <div className="rounded-lg border border-cyan-100 bg-cyan-50/60 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold text-cyan-950">
              <Users className="size-4" />
              Combinaciones para {filters.guests} personas
            </p>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 shrink-0 px-2 text-xs lg:hidden"
              aria-expanded={showSuggestions}
              aria-controls="availability-suggestions"
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              {showSuggestions ? 'Ocultar' : 'Ver opciones'}
            </Button>
          </div>
          <div
            id="availability-suggestions"
            className={cn(
              'mt-1 flex-wrap gap-2 lg:flex',
              showSuggestions ? 'flex' : 'hidden',
            )}
          >
            {planner.suggestions.slice(0, 4).map((suggestion) => (
              <Button
                type="button"
                key={suggestion.cabin_ids.join('-')}
                variant="outline"
                className="h-auto min-h-11 max-w-full whitespace-normal bg-white py-2 text-left text-xs"
                onClick={() => onSelect(suggestion.cabin_ids)}
              >
                {suggestion.cabins.map((cabin) => cabin.name).join(' + ')} ·{' '}
                {suggestion.capacity} plazas
              </Button>
            ))}
          </div>
        </div>
      )}
      {cabins.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm">
          No hay cabañas para estos filtros.
          {(search || onlyFree) && (
            <Button
              type="button"
              className="ml-2 min-h-11"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setOnlyFree(false);
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          {(view === 'list' || view === 'auto') && (
            <div
              className={cn(
                'divide-y overflow-hidden rounded-xl border bg-white',
                view === 'auto' && 'lg:hidden',
              )}
            >
              {cabins.map((cabin) => (
                <div
                  key={cabin.cabin_id}
                  className={cn(
                    'p-3',
                    selected.includes(cabin.cabin_id) && 'bg-cyan-50/60',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{cabin.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Hasta {cabin.max_guests} personas
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-md border px-2 py-1 text-xs font-medium',
                        cabin.available_for_range
                          ? tones.available
                          : 'border-stone-200 bg-stone-50 text-stone-700',
                      )}
                    >
                      {cabin.available_for_range
                        ? 'Libre toda la estancia'
                        : 'No libre toda la estancia'}
                    </span>
                  </div>
                  {cabin.segments.some(
                    (segment) => segment.quotes.length > 0,
                  ) && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-violet-700">
                      <MessageCircle className="size-3.5" />
                      Con cotizaciones · no bloquean
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      className="min-h-11 flex-1"
                      variant={
                        selected.includes(cabin.cabin_id)
                          ? 'default'
                          : 'outline'
                      }
                      disabled={!cabin.available_for_range}
                      aria-pressed={selected.includes(cabin.cabin_id)}
                      aria-label={`Seleccionar ${cabin.name} para la estancia`}
                      onClick={() => toggle(cabin)}
                    >
                      {selected.includes(cabin.cabin_id) ? (
                        <>
                          <Check className="size-4" />
                          Seleccionada
                        </>
                      ) : (
                        'Seleccionar'
                      )}
                    </Button>
                    <Button
                      type="button"
                      className="min-h-11"
                      variant="ghost"
                      onClick={() => onInspect(cabin)}
                    >
                      Ver fechas
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {(view === 'matrix' || view === 'auto') && (
            <div className={cn(view === 'auto' && 'hidden lg:block')}>
              <AvailabilityMatrix
                cabins={cabins}
                filters={filters}
                selected={selected}
                onToggle={toggle}
                onInspect={onInspect}
              />
            </div>
          )}
          {view === 'map' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Toca una cabaña para revisar sus fechas, registros y selección.
              </p>
              <div className="overflow-auto rounded-xl">
                <CabinMap
                  cabins={cabins.map((cabin) => cabin.cabin)}
                  slotStates={slots}
                  selectedSlots={selectedCabins.flatMap((cabin) =>
                    cabin.map_slot ? [cabin.map_slot] : [],
                  )}
                  onSelectSlot={(slot) => {
                    const cabin = cabins.find((item) => item.map_slot === slot);
                    if (cabin) onInspect(cabin);
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function AvailabilityMatrix({
  cabins,
  filters,
  selected,
  onToggle,
  onInspect,
}: {
  cabins: PlannerCabin[];
  filters: AvailabilityFilters;
  selected: number[];
  onToggle: (cabin: PlannerCabin) => void;
  onInspect: ResultsProps['onInspect'];
}) {
  const dates = Array.from(
    { length: rangeLength(filters.checkIn, filters.checkOut) },
    (_, index) => addDaysIso(filters.checkIn, index),
  );
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div
        className="flex flex-wrap gap-3 border-b px-3 py-2 text-xs"
        aria-label="Leyenda de disponibilidad"
      >
        <span className="flex items-center gap-1 text-emerald-800">
          <CheckCircle2 className="size-4" />
          Libre
        </span>
        <span className="flex items-center gap-1 text-red-800">
          <BedDouble className="size-4" />
          Ocupada
        </span>
        <span className="flex items-center gap-1 text-amber-800">
          <LockKeyhole className="size-4" />
          Bloqueo
        </span>
        <span className="flex items-center gap-1 text-violet-800">
          <MessageCircle className="size-4" />
          Cotización · no bloquea
        </span>
      </div>
      <div
        className="max-h-[min(620px,65dvh)] overflow-auto"
        tabIndex={0}
        role="region"
        aria-label="Matriz desplazable de disponibilidad"
      >
        <table
          className="w-full table-fixed border-separate border-spacing-0 text-xs"
          style={{ minWidth: 156 + dates.length * 64 }}
        >
          <colgroup>
            <col style={{ width: 156 }} />
            {dates.map((date) => (
              <col key={date} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 top-0 z-30 border-b border-r bg-stone-50 p-3 text-left"
              >
                Cabaña / capacidad
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  scope="col"
                  className="sticky top-0 z-20 border-b bg-stone-50 px-1 py-3 text-center font-medium"
                >
                  <span className="block">
                    {new Intl.DateTimeFormat('es-CO', {
                      weekday: 'short',
                      timeZone: 'UTC',
                    }).format(new Date(`${date}T00:00:00Z`))}
                  </span>
                  <span className="block">{formatDate(date, true)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cabins.map((cabin) => (
              <tr key={cabin.cabin_id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-r bg-white p-1 text-left"
                >
                  <button
                    type="button"
                    className={cn(
                      'flex min-h-14 w-full items-center gap-2 rounded-lg p-2 focus-visible:outline-2 focus-visible:outline-cyan-700',
                      selected.includes(cabin.cabin_id) &&
                        'bg-cyan-50 text-cyan-950',
                    )}
                    aria-label={`Seleccionar ${cabin.name} para toda la estancia`}
                    aria-pressed={selected.includes(cabin.cabin_id)}
                    disabled={!cabin.available_for_range}
                    onClick={() => onToggle(cabin)}
                  >
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded border',
                        selected.includes(cabin.cabin_id) &&
                          'border-cyan-700 bg-cyan-700 text-white',
                        !cabin.available_for_range && 'bg-stone-100',
                      )}
                    >
                      {selected.includes(cabin.cabin_id) && (
                        <Check className="size-4" />
                      )}
                    </span>
                    <span>
                      <span className="block">{cabin.name}</span>
                      <span className="block font-normal text-muted-foreground">
                        {cabin.max_guests} personas
                      </span>
                    </span>
                  </button>
                </th>
                {matrixSegments(cabin.segments).flatMap((segment) => {
                  const count = rangeLength(
                    segment.check_in,
                    segment.check_out,
                  );
                  // Free nights stay individually actionable; occupied stays form a continuous bar.
                  const pieces =
                    segment.state === 'available'
                      ? Array.from({ length: count }, (_, index) => ({
                          ...segment,
                          check_in: addDaysIso(segment.check_in, index),
                          check_out: addDaysIso(segment.check_in, index + 1),
                        }))
                      : [segment];
                  return pieces.map((piece) => (
                    <td
                      key={piece.check_in}
                      colSpan={rangeLength(piece.check_in, piece.check_out)}
                      className="border-b p-1"
                    >
                      <button
                        type="button"
                        className={cn(
                          'relative flex min-h-12 w-full min-w-0 flex-col justify-center rounded-md border px-2 py-1 text-left focus-visible:outline-2 focus-visible:outline-cyan-700',
                          tones[piece.state],
                        )}
                        title={`${cabin.name}: ${piece.label}. ${formatRange(piece.check_in, piece.check_out)}`}
                        aria-label={`${cabin.name}, ${formatDate(piece.check_in)}: ${piece.reservation?.leader_name ?? piece.block?.reason ?? stateLabels[piece.state]}. Ver detalle`}
                        onClick={() => onInspect(cabin, piece.check_in)}
                      >
                        <span className="block truncate font-semibold">
                          {piece.reservation?.leader_name ??
                            piece.block?.reason ??
                            stateLabels[piece.state]}
                        </span>
                        {piece.reservation && (
                          <span className="block truncate text-[10px]">
                            {piece.reservation.status_label}
                          </span>
                        )}
                        {piece.quotes.length > 0 && (
                          <span className="block text-[10px] text-violet-800">
                            {piece.quotes.length} cot.
                          </span>
                        )}
                      </button>
                    </td>
                  ));
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Selecciona una cabaña para toda la estancia o abre una fecha para ver su
        detalle. La salida no ocupa esa noche.
      </p>
    </div>
  );
}

export function CabinAvailabilityDetail({
  cabin,
  date,
  filters,
  selected,
  onClose,
  onToggle,
  onUseRange,
  onRecord,
  onBlock,
}: {
  cabin: PlannerCabin;
  date?: string;
  filters: AvailabilityFilters;
  selected: boolean;
  onClose: () => void;
  onToggle: () => void;
  onUseRange: (from: string, to: string) => void;
  onRecord: (record: PlannerReservation) => void;
  onBlock: (id: number) => void;
}) {
  const segments = date
    ? cabin.segments.filter(
        (segment) => date >= segment.check_in && date < segment.check_out,
      )
    : cabin.segments;
  const records = new Map<number, PlannerReservation>();
  const blocks = new Map<number, NonNullable<PlannerSegment['block']>>();
  for (const segment of segments) {
    if (segment.reservation)
      records.set(segment.reservation.id, segment.reservation);
    for (const quote of segment.quotes) records.set(quote.id, quote);
    if (segment.block) blocks.set(segment.block.id, segment.block);
  }
  const ranges = freeRanges(cabin).filter(
    (range) => !date || (date >= range.check_in && date < range.check_out),
  );
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="h-dvh w-full overflow-y-auto sm:max-w-lg [&>button]:size-11 [&>button]:right-1 [&>button]:top-1 [&>button]:grid [&>button]:place-items-center">
        <SheetHeader className="pr-12">
          <SheetTitle>
            {cabin.name}
            {date ? ` · ${formatDate(date, true)}` : ''}
          </SheetTitle>
          <SheetDescription>
            Hasta {cabin.max_guests} personas ·{' '}
            {formatRange(filters.checkIn, filters.checkOut)}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-8">
          <div
            className={cn(
              'rounded-lg border p-3 text-sm',
              cabin.available_for_range
                ? tones.available
                : 'border-stone-200 bg-stone-50',
            )}
          >
            <p className="font-medium">
              {cabin.available_for_range
                ? 'Libre durante toda la estancia consultada'
                : 'No está libre durante toda la estancia consultada'}
            </p>
            {cabin.available_for_range && (
              <Button
                className="mt-3 min-h-11 w-full"
                type="button"
                variant="outline"
                onClick={onToggle}
              >
                {selected
                  ? 'Quitar de la selección'
                  : 'Seleccionar para toda la estancia'}
              </Button>
            )}
          </div>
          {ranges.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">
                Tramos libres dentro del período
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Usa estas fechas para consultar y preparar un nuevo registro.
              </p>
              <div className="mt-2 space-y-2">
                {ranges.map((range) => (
                  <Button
                    key={range.check_in}
                    type="button"
                    variant="outline"
                    className="h-auto min-h-11 w-full justify-start whitespace-normal py-3 text-left text-sm"
                    onClick={() => onUseRange(range.check_in, range.check_out)}
                  >
                    <CalendarDays className="size-4 shrink-0" />
                    Usar {formatDate(range.check_in, true)} –{' '}
                    {formatDate(range.check_out, true)} ·{' '}
                    {rangeLength(range.check_in, range.check_out)} noches
                  </Button>
                ))}
              </div>
            </div>
          )}
          {[...records.values()].map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => onRecord(record)}
              className={cn(
                'block min-h-11 w-full rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-cyan-700',
                record.status === 'pending'
                  ? 'border-violet-200 bg-violet-50 text-violet-950'
                  : tones.reserved,
              )}
            >
              <span className="block text-xs">{record.status_label}</span>
              <span className="block font-semibold">
                {record.leader_name ?? 'Sin titular'}
              </span>
              <span className="block text-xs">
                {formatRange(record.check_in, record.check_out)}
              </span>
              <span className="mt-2 block text-xs underline">
                Abrir registro
              </span>
            </button>
          ))}
          {[...blocks.values()].map((block) => (
            <Button
              key={block.id}
              type="button"
              variant="outline"
              className="h-auto min-h-11 w-full justify-start whitespace-normal py-3 text-left"
              onClick={() => onBlock(block.id)}
            >
              <LockKeyhole className="size-4" />
              {block.reason} · Ver bloqueo
            </Button>
          ))}
          {!ranges.length && !records.size && !blocks.size && (
            <p className="text-sm text-muted-foreground">
              {segments[0]?.label ?? 'No hay disponibilidad para estas fechas.'}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
