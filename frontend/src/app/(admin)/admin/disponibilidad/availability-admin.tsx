'use client';

import {
  AlertCircle,
  Ban,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  LayoutGrid,
  LoaderCircle,
  LockKeyhole,
  Map as MapIcon,
  MessageCircle,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { CabinMap, type CabinMapSlotState } from '@/components/cabins/cabin-map';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@/types/api';
import type {
  AvailabilityBlock,
  MapSlot,
  PlannerCabin,
  PlannerReservation,
  PlannerResult,
  PlannerSegment,
} from '@/types/cabin';
import type { Reservation } from '@/types/reservation';

type ViewMode = 'matrix' | 'map';
type RecordKind = 'pending' | 'confirmed';

type Filters = {
  checkIn: string;
  checkOut: string;
  guests: string;
};

type SelectedCell = {
  cabin: PlannerCabin;
  segment: PlannerSegment;
  date: string;
};

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 31;

function toDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function addDaysIso(value: string, days: number) {
  const date = toDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function rangeLength(checkIn: string, checkOut: string) {
  return Math.round((toDate(checkOut).getTime() - toDate(checkIn).getTime()) / DAY_MS);
}

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toDate(value).getTime()));
}

function datesForRange(checkIn: string, checkOut: string) {
  const length = Math.max(0, rangeLength(checkIn, checkOut));
  return Array.from({ length }, (_, index) => addDaysIso(checkIn, index));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(toDate(value))
    .replace('.', '');
}

function formatRange(checkIn: string, checkOut: string) {
  const formatter = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${formatter.format(toDate(checkIn))} – ${formatter.format(toDate(checkOut))}`;
}

function dateTimeLocal(hoursAhead = 48) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function isoToDateTimeLocal(value: string | null) {
  if (!value) return dateTimeLocal();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return dateTimeLocal();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const fieldMessage = error.errors ? Object.values(error.errors).flat()[0] : undefined;
    return fieldMessage ?? error.message;
  }
  return 'No pudimos completar la accion. Intenta de nuevo.';
}

function segmentForDate(cabin: PlannerCabin, date: string) {
  return cabin.segments.find((segment) => date >= segment.check_in && date < segment.check_out);
}

function initialFilters(searchParams: URLSearchParams): Filters {
  const today = todayIso();
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const from = isIsoDate(fromParam) ? fromParam : today;
  const requestedTo = isIsoDate(toParam) ? toParam : addDaysIso(from, 14);
  const length = rangeLength(from, requestedTo);
  const to = length > 0 && length <= MAX_RANGE_DAYS ? requestedTo : addDaysIso(from, 14);
  const guestsParam = searchParams.get('guests');
  const guests = guestsParam && Number(guestsParam) > 0 ? guestsParam : '4';

  return { checkIn: from, checkOut: to, guests };
}

export function AvailabilityAdmin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startingFilters = useMemo(() => initialFilters(new URLSearchParams(searchParams.toString())), [searchParams]);

  const [draftFilters, setDraftFilters] = useState<Filters>(startingFilters);
  const [filters, setFilters] = useState<Filters>(startingFilters);
  const [filterError, setFilterError] = useState('');
  const [view, setView] = useState<ViewMode>(searchParams.get('view') === 'map' ? 'map' : 'matrix');
  const [selectedCabinIds, setSelectedCabinIds] = useState<number[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PlannerReservation | null>(null);
  const [recordKind, setRecordKind] = useState<RecordKind>('pending');
  const [recordCheckIn, setRecordCheckIn] = useState(filters.checkIn);
  const [recordCheckOut, setRecordCheckOut] = useState(filters.checkOut);
  const [recordGuests, setRecordGuests] = useState(filters.guests);
  const [recordLeader, setRecordLeader] = useState('');
  const [recordNotes, setRecordNotes] = useState('');
  const [recordExpiresAt, setRecordExpiresAt] = useState(dateTimeLocal());
  const [recordCabinIds, setRecordCabinIds] = useState<number[]>([]);
  const [recordError, setRecordError] = useState('');
  const [blockOpen, setBlockOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
  const [blockCheckIn, setBlockCheckIn] = useState(filters.checkIn);
  const [blockCheckOut, setBlockCheckOut] = useState(filters.checkOut);
  const [blockReason, setBlockReason] = useState('');
  const [blockNotes, setBlockNotes] = useState('');
  const [blockAll, setBlockAll] = useState(false);
  const [blockCabinIds, setBlockCabinIds] = useState<number[]>([]);
  const [blockError, setBlockError] = useState('');
  const [detail, setDetail] = useState<SelectedCell | null>(null);

  const plannerQuery = useQuery({
    queryKey: ['admin-availability-planner', filters.checkIn, filters.checkOut, filters.guests],
    queryFn: () =>
      api.get<ApiResponse<PlannerResult>>(
        `/admin/availability/planner${buildQuery({
          check_in: filters.checkIn,
          check_out: filters.checkOut,
          guests: Number(filters.guests) || undefined,
        })}`,
      ),
  });

  const planner = plannerQuery.data?.data;
  const cabins = useMemo(() => planner?.cabins ?? [], [planner?.cabins]);
  const dates = useMemo(() => datesForRange(filters.checkIn, filters.checkOut), [filters]);
  const selectedCabins = cabins.filter((cabin) => selectedCabinIds.includes(cabin.cabin_id));
  const selectedCapacity = selectedCabins.reduce((total, cabin) => total + cabin.max_guests, 0);

  function refreshPlanner() {
    void queryClient.invalidateQueries({ queryKey: ['admin-availability-planner'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-availability'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-availability-calendar'] });
  }

  function syncUrl(nextFilters: Filters, nextView = view) {
    const query = new URLSearchParams();
    query.set('from', nextFilters.checkIn);
    query.set('to', nextFilters.checkOut);
    query.set('guests', nextFilters.guests);
    if (nextView === 'map') query.set('view', 'map');
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const length = rangeLength(draftFilters.checkIn, draftFilters.checkOut);
    if (length <= 0) {
      setFilterError('La salida debe ser posterior a la llegada.');
      return;
    }
    if (length > MAX_RANGE_DAYS) {
      setFilterError(`El rango no puede superar ${MAX_RANGE_DAYS} dias.`);
      return;
    }
    if (Number(draftFilters.guests) < 1) {
      setFilterError('Ingresa al menos una persona.');
      return;
    }

    setFilterError('');
    setFilters(draftFilters);
    setSelectedCabinIds([]);
    syncUrl(draftFilters);
  }

  function setViewMode(next: string) {
    const nextView = next as ViewMode;
    setView(nextView);
    syncUrl(filters, nextView);
  }

  function toggleCabin(cabin: PlannerCabin) {
    if (!cabin.available_for_range) {
      toast.info(`${cabin.name} no esta disponible durante todo el rango.`);
      return;
    }

    const hasQuotes = cabin.segments.some((segment) => segment.quotes.length > 0);
    if (hasQuotes && !selectedCabinIds.includes(cabin.cabin_id)) {
      toast.info(`${cabin.name} tiene cotizaciones, pero sigue disponible.`);
    }

    setSelectedCabinIds((current) =>
      current.includes(cabin.cabin_id)
        ? current.filter((id) => id !== cabin.cabin_id)
        : [...current, cabin.cabin_id],
    );
  }

  function openNewRecord() {
    if (selectedCabinIds.length === 0) {
      toast.error('Selecciona al menos una cabana disponible.');
      return;
    }
    setEditingRecord(null);
    setRecordKind('pending');
    setRecordCheckIn(filters.checkIn);
    setRecordCheckOut(filters.checkOut);
    setRecordGuests(filters.guests);
    setRecordLeader('');
    setRecordNotes('');
    setRecordExpiresAt(dateTimeLocal());
    setRecordCabinIds(selectedCabinIds);
    setRecordError('');
    setRecordOpen(true);
  }

  function openEditRecord(record: PlannerReservation) {
    setDetail(null);
    setEditingRecord(record);
    setRecordKind(record.status === 'pending' ? 'pending' : 'confirmed');
    setRecordCheckIn(record.check_in);
    setRecordCheckOut(record.check_out);
    setRecordGuests(String(record.guests_count || 1));
    setRecordLeader(record.leader_name ?? '');
    setRecordNotes(record.notes ?? '');
    setRecordExpiresAt(isoToDateTimeLocal(record.expires_at));
    setRecordCabinIds(record.cabin_ids);
    setRecordError('');
    setRecordOpen(true);
  }

  const saveRecordMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: Record<string, unknown> }) =>
      id
        ? api.put<ApiResponse<Reservation>>(`/admin/reservations/${id}`, payload)
        : api.post<ApiResponse<Reservation>>('/admin/reservations', payload),
    onSuccess: () => {
      toast.success(editingRecord ? 'Registro actualizado.' : 'Registro guardado.');
      setRecordOpen(false);
      setSelectedCabinIds([]);
      setEditingRecord(null);
      setRecordError('');
      refreshPlanner();
    },
    onError: (error) => setRecordError(apiErrorMessage(error)),
  });

  function handleRecordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const length = rangeLength(recordCheckIn, recordCheckOut);
    if (!recordLeader.trim()) {
      setRecordError('Escribe el nombre del turista o grupo.');
      return;
    }
    if (recordCabinIds.length === 0) {
      setRecordError('Selecciona al menos una cabana.');
      return;
    }
    if (length <= 0 || length > MAX_RANGE_DAYS) {
      setRecordError(`El rango debe tener entre 1 y ${MAX_RANGE_DAYS} noches.`);
      return;
    }
    const expiresAt = recordKind === 'pending' ? new Date(recordExpiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      setRecordError('Selecciona una fecha y hora de vencimiento validas.');
      return;
    }

    setRecordError('');
    saveRecordMutation.mutate({
      id: editingRecord?.id ?? null,
      payload: {
        cabin_ids: recordCabinIds,
        check_in: recordCheckIn,
        check_out: recordCheckOut,
        guests_count: Number(recordGuests) || 1,
        leader_name: recordLeader.trim(),
        status: recordKind,
        expires_at: expiresAt?.toISOString() ?? null,
        source: 'whatsapp',
        notes: recordNotes.trim() || null,
      },
    });
  }

  const recordActionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      api.put<ApiResponse<Reservation>>(`/admin/reservations/${id}`, payload),
    onSuccess: () => {
      toast.success('Registro actualizado.');
      setDetail(null);
      refreshPlanner();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  function openNewBlock() {
    setEditingBlockId(null);
    setBlockCheckIn(filters.checkIn);
    setBlockCheckOut(filters.checkOut);
    setBlockReason('');
    setBlockNotes('');
    setBlockAll(false);
    setBlockCabinIds(selectedCabinIds);
    setBlockError('');
    setBlockOpen(true);
  }

  async function openEditBlock(blockId: number) {
    try {
      const response = await api.get<ApiResponse<AvailabilityBlock>>(`/admin/availability-blocks/${blockId}`);
      const block = response.data;
      setDetail(null);
      setEditingBlockId(block.id);
      setBlockCheckIn(block.check_in);
      setBlockCheckOut(block.check_out);
      setBlockReason(block.reason);
      setBlockNotes(block.notes ?? '');
      setBlockAll(block.applies_to_all);
      setBlockCabinIds(block.cabin_ids ?? block.cabins?.map((cabin) => cabin.id) ?? []);
      setBlockError('');
      setBlockOpen(true);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  const saveBlockMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: Record<string, unknown> }) =>
      id
        ? api.put<ApiResponse<AvailabilityBlock>>(`/admin/availability-blocks/${id}`, payload)
        : api.post<ApiResponse<AvailabilityBlock>>('/admin/availability-blocks', payload),
    onSuccess: () => {
      toast.success(editingBlockId ? 'Bloqueo actualizado.' : 'Bloqueo creado.');
      setBlockOpen(false);
      setSelectedCabinIds([]);
      setBlockError('');
      refreshPlanner();
    },
    onError: (error) => setBlockError(apiErrorMessage(error)),
  });

  function handleBlockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const length = rangeLength(blockCheckIn, blockCheckOut);
    if (!blockReason.trim()) {
      setBlockError('Indica el motivo del bloqueo.');
      return;
    }
    if (!blockAll && blockCabinIds.length === 0) {
      setBlockError('Selecciona cabanas o aplica el bloqueo a todas.');
      return;
    }
    if (length <= 0 || length > MAX_RANGE_DAYS) {
      setBlockError(`El rango debe tener entre 1 y ${MAX_RANGE_DAYS} noches.`);
      return;
    }

    setBlockError('');
    saveBlockMutation.mutate({
      id: editingBlockId,
      payload: {
        check_in: blockCheckIn,
        check_out: blockCheckOut,
        reason: blockReason.trim(),
        notes: blockNotes.trim() || null,
        applies_to_all: blockAll,
        cabin_ids: blockAll ? [] : blockCabinIds,
      },
    });
  }

  const deleteBlockMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/availability-blocks/${id}`),
    onSuccess: () => {
      toast.success('Bloqueo eliminado.');
      setDetail(null);
      refreshPlanner();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const selectedSlots = selectedCabins
    .map((cabin) => cabin.map_slot)
    .filter((slot): slot is MapSlot => Boolean(slot));
  const slotStates = useMemo(() => {
    const states: Partial<Record<MapSlot, CabinMapSlotState>> = {};
    for (const cabin of cabins) {
      if (!cabin.map_slot) continue;
      const unavailable = cabin.segments.find((segment) => !segment.is_available);
      const quoteCount = cabin.segments.reduce((total, segment) => Math.max(total, segment.quotes.length), 0);
      states[cabin.map_slot] = unavailable
        ? { tone: unavailable.tone, label: unavailable.label, isAvailable: false }
        : {
            tone: 'green',
            label: quoteCount > 0 ? `Disponible con ${quoteCount} cotizaciones` : 'Disponible',
            isAvailable: true,
            displayColor: selectedCabinIds.includes(cabin.cabin_id) ? '#0891b2' : undefined,
          };
    }
    return states;
  }, [cabins, selectedCabinIds]);

  function handleMapSelect(slot: MapSlot) {
    const cabin = cabins.find((item) => item.map_slot === slot);
    if (cabin) toggleCabin(cabin);
  }

  return (
    <div className="space-y-5 pb-24">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Operacion diaria</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Disponibilidad</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Consulta un rango, revisa cada cabana y registra lo acordado por WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={openNewBlock}>
            <LockKeyhole className="size-4" />
            Bloquear fechas
          </Button>
          <Button type="button" onClick={openNewRecord} disabled={selectedCabinIds.length === 0}>
            <Plus className="size-4" />
            Registrar
            {selectedCabinIds.length > 0 ? ` (${selectedCabinIds.length})` : ''}
          </Button>
        </div>
      </header>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <form onSubmit={handleFilterSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_140px_auto] md:items-end">
          <Field id="availability-check-in" label="Llegada">
            <Input
              id="availability-check-in"
              type="date"
              value={draftFilters.checkIn}
              onChange={(event) => {
                const checkIn = event.target.value;
                setDraftFilters((current) => ({
                  ...current,
                  checkIn,
                  checkOut: current.checkOut <= checkIn ? addDaysIso(checkIn, 1) : current.checkOut,
                }));
              }}
            />
          </Field>
          <Field id="availability-check-out" label="Salida">
            <Input
              id="availability-check-out"
              type="date"
              min={addDaysIso(draftFilters.checkIn, 1)}
              max={addDaysIso(draftFilters.checkIn, MAX_RANGE_DAYS)}
              value={draftFilters.checkOut}
              onChange={(event) => setDraftFilters((current) => ({ ...current, checkOut: event.target.value }))}
            />
          </Field>
          <Field id="availability-guests" label="Personas">
            <Input
              id="availability-guests"
              type="number"
              min={1}
              max={50}
              value={draftFilters.guests}
              onChange={(event) => setDraftFilters((current) => ({ ...current, guests: event.target.value }))}
            />
          </Field>
          <Button type="submit" disabled={plannerQuery.isFetching}>
            {plannerQuery.isFetching ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
            Consultar
          </Button>
        </form>
        {filterError ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-red-700" role="alert">
            <AlertCircle className="size-4" /> {filterError}
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Mostrando {rangeLength(filters.checkIn, filters.checkOut)} noches: {formatRange(filters.checkIn, filters.checkOut)}.
          </p>
        )}
      </section>

      {planner ? <AvailabilityMetrics planner={planner} /> : null}

      <section className="rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold">Ocupacion por cabana y dia</h2>
            <p className="mt-1 text-sm text-muted-foreground">Selecciona una cabana libre para todo el rango o abre una celda para ver su detalle.</p>
          </div>
          <Tabs value={view} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="matrix"><LayoutGrid className="size-4" /> Matriz</TabsTrigger>
              <TabsTrigger value="map"><MapIcon className="size-4" /> Mapa</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <StatusLegend />

        {plannerQuery.isLoading ? (
          <LoadingState />
        ) : plannerQuery.isError ? (
          <ErrorState message={apiErrorMessage(plannerQuery.error)} onRetry={() => void plannerQuery.refetch()} />
        ) : cabins.length === 0 ? (
          <EmptyState />
        ) : view === 'matrix' ? (
          <AvailabilityMatrix
            cabins={cabins}
            dates={dates}
            selectedCabinIds={selectedCabinIds}
            onToggleCabin={toggleCabin}
            onOpenCell={(cell) => setDetail(cell)}
          />
        ) : (
          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <CabinMap
              cabins={cabins.map((cabin) => cabin.cabin)}
              selectedSlots={selectedSlots}
              slotStates={slotStates}
              onSelectSlot={handleMapSelect}
            />
            <div className="rounded-lg border bg-stone-50 p-4">
              <h3 className="font-semibold">Seleccion del rango</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Los puntos verdes se pueden seleccionar. Abre la matriz para revisar cada dia.
              </p>
              <SelectedSummary cabins={selectedCabins} capacity={selectedCapacity} guests={Number(filters.guests)} />
            </div>
          </div>
        )}
      </section>

      {planner?.suggestions.length ? (
        <section className="rounded-xl border bg-cyan-50/60 p-4">
          <div className="flex items-center gap-2 text-cyan-950">
            <Users className="size-5" />
            <h2 className="font-semibold">Combinaciones sugeridas</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {planner.suggestions.slice(0, 4).map((suggestion) => (
              <Button
                key={suggestion.cabin_ids.join('-')}
                type="button"
                variant="outline"
                className="bg-white"
                onClick={() => setSelectedCabinIds(suggestion.cabin_ids)}
              >
                {suggestion.cabins.map((cabin) => cabin.name).join(' + ')} · {suggestion.capacity} personas
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedCabins.length > 0 ? (
        <div className="fixed inset-x-4 bottom-4 z-30 ml-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border bg-neutral-950 p-3 text-white shadow-xl md:left-auto md:right-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{selectedCabins.map((cabin) => cabin.name).join(', ')}</p>
            <p className="text-xs text-white/70">Capacidad {selectedCapacity} · {rangeLength(filters.checkIn, filters.checkOut)} noches</p>
          </div>
          <Button type="button" variant="secondary" onClick={openNewRecord}>
            Registrar
          </Button>
        </div>
      ) : null}

      <RecordSheet
        open={recordOpen}
        onOpenChange={setRecordOpen}
        editing={Boolean(editingRecord)}
        kind={recordKind}
        onKindChange={setRecordKind}
        checkIn={recordCheckIn}
        checkOut={recordCheckOut}
        guests={recordGuests}
        leader={recordLeader}
        notes={recordNotes}
        expiresAt={recordExpiresAt}
        cabins={cabins}
        cabinIds={recordCabinIds}
        onCheckInChange={setRecordCheckIn}
        onCheckOutChange={setRecordCheckOut}
        onGuestsChange={setRecordGuests}
        onLeaderChange={setRecordLeader}
        onNotesChange={setRecordNotes}
        onExpiresAtChange={setRecordExpiresAt}
        onCabinIdsChange={setRecordCabinIds}
        error={recordError}
        isPending={saveRecordMutation.isPending}
        onSubmit={handleRecordSubmit}
      />

      <BlockSheet
        open={blockOpen}
        onOpenChange={setBlockOpen}
        editing={editingBlockId !== null}
        checkIn={blockCheckIn}
        checkOut={blockCheckOut}
        reason={blockReason}
        notes={blockNotes}
        appliesToAll={blockAll}
        cabinIds={blockCabinIds}
        cabins={cabins}
        onCheckInChange={setBlockCheckIn}
        onCheckOutChange={setBlockCheckOut}
        onReasonChange={setBlockReason}
        onNotesChange={setBlockNotes}
        onAppliesToAllChange={setBlockAll}
        onCabinIdsChange={setBlockCabinIds}
        error={blockError}
        isPending={saveBlockMutation.isPending}
        onSubmit={handleBlockSubmit}
      />

      <DetailSheet
        detail={detail}
        onClose={() => setDetail(null)}
        onEditRecord={openEditRecord}
        onConfirm={(record) => recordActionMutation.mutate({ id: record.id, payload: { status: 'confirmed' } })}
        onRenew={(record) =>
          recordActionMutation.mutate({
            id: record.id,
            payload: { status: 'pending', expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() },
          })
        }
        onCancel={(record) => recordActionMutation.mutate({ id: record.id, payload: { status: 'cancelled' } })}
        onEditBlock={openEditBlock}
        onDeleteBlock={(id) => deleteBlockMutation.mutate(id)}
        isPending={recordActionMutation.isPending || deleteBlockMutation.isPending}
      />
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function AvailabilityMetrics({ planner }: { planner: PlannerResult }) {
  const metrics = [
    { label: 'Disponibles', value: planner.summary.available_count, icon: CheckCircle2, tone: 'text-emerald-700' },
    { label: 'Ocupadas', value: planner.summary.reserved_count, icon: BedDouble, tone: 'text-red-700' },
    { label: 'Con cotizaciones', value: planner.summary.quoted_count ?? 0, icon: MessageCircle, tone: 'text-violet-700' },
    { label: 'Bloqueadas', value: planner.summary.blocked_count + planner.summary.maintenance_count, icon: LockKeyhole, tone: 'text-amber-700' },
    { label: 'Capacidad libre', value: planner.summary.available_capacity, icon: Users, tone: 'text-cyan-700' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.label} className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
            <div className={cn('rounded-lg bg-stone-100 p-2', metric.tone)}><Icon className="size-5" /></div>
            <div>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusLegend() {
  const items = [
    ['bg-emerald-500', 'Disponible'],
    ['bg-violet-500', 'Cotizacion (no bloquea)'],
    ['bg-red-500', 'Ocupada'],
    ['bg-amber-500', 'Bloqueo / mantenimiento'],
    ['bg-stone-400', 'Inactiva'],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 border-b px-4 py-3 text-xs text-muted-foreground" aria-label="Leyenda de disponibilidad">
      {items.map(([color, label]) => (
        <span key={label} className="inline-flex items-center gap-2"><span className={cn('size-2.5 rounded-full', color)} />{label}</span>
      ))}
    </div>
  );
}

function AvailabilityMatrix({
  cabins,
  dates,
  selectedCabinIds,
  onToggleCabin,
  onOpenCell,
}: {
  cabins: PlannerCabin[];
  dates: string[];
  selectedCabinIds: number[];
  onToggleCabin: (cabin: PlannerCabin) => void;
  onOpenCell: (cell: SelectedCell) => void;
}) {
  return (
    <div className="max-h-[620px] overflow-auto" tabIndex={0} aria-label="Matriz desplazable de disponibilidad">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 w-48 min-w-48 border-b border-r bg-stone-50 p-3 text-left">Cabana</th>
            {dates.map((date) => (
              <th key={date} className="sticky top-0 z-20 w-24 min-w-24 border-b bg-stone-50 p-2 text-center font-medium capitalize">
                {formatDay(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cabins.map((cabin) => {
            const selected = selectedCabinIds.includes(cabin.cabin_id);
            return (
              <tr key={cabin.cabin_id}>
                <th className="sticky left-0 z-10 border-b border-r bg-white p-2 text-left">
                  <button
                    type="button"
                    onClick={() => onToggleCabin(cabin)}
                    disabled={!cabin.available_for_range}
                    aria-pressed={selected}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600',
                      selected ? 'bg-cyan-50 text-cyan-950' : 'hover:bg-stone-50',
                      !cabin.available_for_range && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <span className={cn('grid size-5 shrink-0 place-items-center rounded border', selected ? 'border-cyan-700 bg-cyan-700 text-white' : 'bg-white')}>
                      {selected ? <Check className="size-3.5" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{cabin.name}</span>
                      <span className="block text-xs font-normal text-muted-foreground">Max. {cabin.max_guests}</span>
                    </span>
                  </button>
                </th>
                {dates.map((date) => {
                  const segment = segmentForDate(cabin, date);
                  return (
                    <td key={date} className="border-b p-1">
                      {segment ? (
                        <MatrixCell
                          cabin={cabin}
                          segment={segment}
                          date={date}
                          onToggle={() => onToggleCabin(cabin)}
                          onOpen={() => onOpenCell({ cabin, segment, date })}
                        />
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MatrixCell({
  cabin,
  segment,
  date,
  onToggle,
  onOpen,
}: {
  cabin: PlannerCabin;
  segment: PlannerSegment;
  date: string;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const hasDetail = Boolean(segment.reservation || segment.block || segment.quotes.length > 0 || !segment.is_available);
  const label = segment.state === 'reserved'
    ? 'Ocupada'
    : segment.state === 'blocked'
      ? 'Bloqueo'
      : segment.state === 'maintenance'
        ? 'Mantenimiento'
        : segment.state === 'inactive'
          ? 'Inactiva'
          : 'Disponible';
  const Icon = segment.state === 'reserved'
    ? BedDouble
    : segment.state === 'blocked' || segment.state === 'maintenance'
      ? LockKeyhole
      : segment.state === 'inactive'
        ? Ban
        : CheckCircle2;

  return (
    <button
      type="button"
      onClick={hasDetail ? onOpen : onToggle}
      aria-label={`${cabin.name}, ${formatDay(date)}: ${label}${segment.quotes.length ? `, ${segment.quotes.length} cotizaciones` : ''}`}
      className={cn(
        'relative flex h-16 w-full min-w-20 flex-col items-center justify-center gap-1 rounded-md border px-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700',
        segment.state === 'reserved' && 'border-red-200 bg-red-50 text-red-900 hover:bg-red-100',
        (segment.state === 'blocked' || segment.state === 'maintenance') && 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
        segment.state === 'inactive' && 'border-stone-200 bg-stone-100 text-stone-600',
        segment.state === 'available' && 'border-emerald-100 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
      )}
    >
      <Icon className="size-4" />
      <span>{label}</span>
      {segment.quotes.length > 0 ? (
        <span className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] leading-4 text-white" title="Cotizaciones vigentes">
          {segment.quotes.length}
        </span>
      ) : null}
    </button>
  );
}

function SelectedSummary({ cabins, capacity, guests }: { cabins: PlannerCabin[]; capacity: number; guests: number }) {
  if (cabins.length === 0) {
    return <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Aun no seleccionas cabanas.</p>;
  }
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">{cabins.map((cabin) => <Badge key={cabin.cabin_id} variant="outline">{cabin.name}</Badge>)}</div>
      <p className={cn('text-sm font-medium', capacity >= guests ? 'text-emerald-700' : 'text-amber-700')}>
        Capacidad {capacity} para {guests} personas.
      </p>
    </div>
  );
}

function LoadingState() {
  return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" /> Consultando disponibilidad...</div>;
}

function EmptyState() {
  return <div className="grid min-h-64 place-items-center p-6 text-center"><div><BedDouble className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">No hay cabanas configuradas</p><p className="mt-1 text-sm text-muted-foreground">Agrega cabanas activas con ubicacion en el mapa.</p></div></div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="grid min-h-64 place-items-center p-6 text-center"><div><AlertCircle className="mx-auto size-8 text-red-600" /><p className="mt-3 font-semibold">No pudimos cargar la disponibilidad</p><p className="mt-1 text-sm text-muted-foreground">{message}</p><Button type="button" variant="outline" className="mt-4" onClick={onRetry}><RefreshCw className="size-4" /> Reintentar</Button></div></div>;
}

function RecordSheet({
  open,
  onOpenChange,
  editing,
  kind,
  onKindChange,
  checkIn,
  checkOut,
  guests,
  leader,
  notes,
  expiresAt,
  cabins,
  cabinIds,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onLeaderChange,
  onNotesChange,
  onExpiresAtChange,
  onCabinIdsChange,
  error,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  kind: RecordKind;
  onKindChange: (kind: RecordKind) => void;
  checkIn: string;
  checkOut: string;
  guests: string;
  leader: string;
  notes: string;
  expiresAt: string;
  cabins: PlannerCabin[];
  cabinIds: number[];
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onGuestsChange: (value: string) => void;
  onLeaderChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onExpiresAtChange: (value: string) => void;
  onCabinIdsChange: (ids: number[]) => void;
  error: string;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{editing ? 'Editar registro' : 'Registrar desde WhatsApp'}</SheetTitle>
          <SheetDescription>Guarda lo necesario para mantener clara la ocupacion. La conversacion sigue en WhatsApp.</SheetDescription>
        </SheetHeader>
        <form id="record-form" onSubmit={onSubmit} className="space-y-5 px-4 pb-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-stone-100 p-1">
            <button type="button" onClick={() => onKindChange('pending')} className={cn('rounded-md px-3 py-2 text-sm font-medium', kind === 'pending' ? 'bg-white text-violet-800 shadow-sm' : 'text-muted-foreground')}>Cotizacion</button>
            <button type="button" onClick={() => onKindChange('confirmed')} className={cn('rounded-md px-3 py-2 text-sm font-medium', kind === 'confirmed' ? 'bg-white text-red-800 shadow-sm' : 'text-muted-foreground')}>Ocupacion confirmada</button>
          </div>
          <div className={cn('rounded-lg border p-3 text-sm', kind === 'pending' ? 'border-violet-200 bg-violet-50 text-violet-950' : 'border-red-200 bg-red-50 text-red-950')}>
            {kind === 'pending' ? 'La cotizacion quedara visible, pero no bloqueara la cabana.' : 'La ocupacion bloqueara estas fechas para nuevas reservas.'}
          </div>
          <Field id="record-leader" label="Turista o grupo">
            <Input id="record-leader" autoFocus value={leader} onChange={(event) => onLeaderChange(event.target.value)} placeholder="Ej. Familia Rivas" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="record-check-in" label="Llegada"><Input id="record-check-in" type="date" value={checkIn} onChange={(event) => onCheckInChange(event.target.value)} /></Field>
            <Field id="record-check-out" label="Salida"><Input id="record-check-out" type="date" min={addDaysIso(checkIn, 1)} max={addDaysIso(checkIn, MAX_RANGE_DAYS)} value={checkOut} onChange={(event) => onCheckOutChange(event.target.value)} /></Field>
          </div>
          <Field id="record-guests" label="Personas"><Input id="record-guests" type="number" min={1} max={50} value={guests} onChange={(event) => onGuestsChange(event.target.value)} /></Field>
          <div>
            <Label>Cabanas</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {cabins.map((cabin) => {
                const checked = cabinIds.includes(cabin.cabin_id);
                const disabled = !cabin.available_for_range && !checked;

                return (
                  <label key={cabin.cabin_id} className={cn('flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm', disabled && 'cursor-not-allowed opacity-50')}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) => onCabinIdsChange(
                        event.target.checked
                          ? [...cabinIds, cabin.cabin_id]
                          : cabinIds.filter((id) => id !== cabin.cabin_id),
                      )}
                    />
                    <span><span className="block font-medium">{cabin.name}</span><span className="text-xs text-muted-foreground">{disabled ? 'No libre en todo el rango' : 'Disponible para seleccionar'}</span></span>
                  </label>
                );
              })}
            </div>
          </div>
          {kind === 'pending' ? <Field id="record-expires" label="Vigente hasta"><Input id="record-expires" type="datetime-local" required value={expiresAt} onChange={(event) => onExpiresAtChange(event.target.value)} /></Field> : null}
          <Field id="record-notes" label="Notas opcionales"><Textarea id="record-notes" value={notes} onChange={(event) => onNotesChange(event.target.value)} rows={4} placeholder="Acuerdos o referencia de la conversacion" /></Field>
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        </form>
        <SheetFooter className="border-t">
          <Button type="submit" form="record-form" disabled={isPending}>{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{editing ? 'Guardar cambios' : 'Guardar registro'}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function BlockSheet({
  open,
  onOpenChange,
  editing,
  checkIn,
  checkOut,
  reason,
  notes,
  appliesToAll,
  cabinIds,
  cabins,
  onCheckInChange,
  onCheckOutChange,
  onReasonChange,
  onNotesChange,
  onAppliesToAllChange,
  onCabinIdsChange,
  error,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  checkIn: string;
  checkOut: string;
  reason: string;
  notes: string;
  appliesToAll: boolean;
  cabinIds: number[];
  cabins: PlannerCabin[];
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onAppliesToAllChange: (value: boolean) => void;
  onCabinIdsChange: (ids: number[]) => void;
  error: string;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{editing ? 'Editar bloqueo' : 'Bloquear fechas'}</SheetTitle><SheetDescription>Úsalo para mantenimiento, eventos privados o cierres operativos.</SheetDescription></SheetHeader>
        <form id="block-form" onSubmit={onSubmit} className="space-y-5 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Field id="block-check-in" label="Desde"><Input id="block-check-in" type="date" value={checkIn} onChange={(event) => onCheckInChange(event.target.value)} /></Field>
            <Field id="block-check-out" label="Hasta"><Input id="block-check-out" type="date" min={addDaysIso(checkIn, 1)} max={addDaysIso(checkIn, MAX_RANGE_DAYS)} value={checkOut} onChange={(event) => onCheckOutChange(event.target.value)} /></Field>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm font-medium"><input type="checkbox" checked={appliesToAll} onChange={(event) => onAppliesToAllChange(event.target.checked)} /> Aplicar a todas las cabanas</label>
          {!appliesToAll ? (
            <Field id="block-cabins" label="Cabanas">
              <Select value="" onValueChange={(value) => { const id = Number(value); if (id && !cabinIds.includes(id)) onCabinIdsChange([...cabinIds, id]); }}>
                <SelectTrigger id="block-cabins"><SelectValue placeholder="Agregar cabana" /></SelectTrigger>
                <SelectContent>{cabins.filter((cabin) => !cabinIds.includes(cabin.cabin_id)).map((cabin) => <SelectItem key={cabin.cabin_id} value={String(cabin.cabin_id)}>{cabin.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          ) : null}
          {!appliesToAll && cabinIds.length > 0 ? <div className="flex flex-wrap gap-2">{cabinIds.map((id) => { const cabin = cabins.find((item) => item.cabin_id === id); return <button key={id} type="button" onClick={() => onCabinIdsChange(cabinIds.filter((item) => item !== id))}><Badge variant="outline">{cabin?.name ?? `Cabana ${id}`} <XCircle className="ml-1 size-3" /></Badge></button>; })}</div> : null}
          <Field id="block-reason" label="Motivo"><Input id="block-reason" value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Ej. Mantenimiento de techo" /></Field>
          <Field id="block-notes" label="Notas opcionales"><Textarea id="block-notes" value={notes} onChange={(event) => onNotesChange(event.target.value)} rows={4} /></Field>
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        </form>
        <SheetFooter className="border-t"><Button type="submit" form="block-form" disabled={isPending}>{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}{editing ? 'Guardar cambios' : 'Crear bloqueo'}</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DetailSheet({
  detail,
  onClose,
  onEditRecord,
  onConfirm,
  onRenew,
  onCancel,
  onEditBlock,
  onDeleteBlock,
  isPending,
}: {
  detail: SelectedCell | null;
  onClose: () => void;
  onEditRecord: (record: PlannerReservation) => void;
  onConfirm: (record: PlannerReservation) => void;
  onRenew: (record: PlannerReservation) => void;
  onCancel: (record: PlannerReservation) => void;
  onEditBlock: (id: number) => void;
  onDeleteBlock: (id: number) => void;
  isPending: boolean;
}) {
  if (!detail) return null;
  const { cabin, segment, date } = detail;
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{cabin.name} · {formatDay(date)}</SheetTitle><SheetDescription>{segment.label}</SheetDescription></SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {segment.reservation ? <RecordDetail title="Ocupacion confirmada" record={segment.reservation} tone="red" actions={<><Button type="button" size="sm" variant="outline" onClick={() => onEditRecord(segment.reservation!)}><Edit3 className="size-3.5" /> Editar</Button><Button type="button" size="sm" variant="ghost" onClick={() => onCancel(segment.reservation!)} disabled={isPending}><XCircle className="size-3.5" /> Cancelar</Button></>} /> : null}
          {segment.quotes.map((quote) => <RecordDetail key={quote.id} title="Cotizacion vigente" record={quote} tone="violet" actions={<><Button type="button" size="sm" variant="outline" onClick={() => onEditRecord(quote)}><Edit3 className="size-3.5" /> Editar</Button><Button type="button" size="sm" onClick={() => onConfirm(quote)} disabled={isPending}><Check className="size-3.5" /> Confirmar</Button><Button type="button" size="sm" variant="outline" onClick={() => onRenew(quote)} disabled={isPending}><Clock3 className="size-3.5" /> Renovar 48h</Button><Button type="button" size="sm" variant="ghost" onClick={() => onCancel(quote)} disabled={isPending}><XCircle className="size-3.5" /> Cancelar</Button></>} />)}
          {segment.block ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"><div className="flex items-center gap-2 font-semibold"><LockKeyhole className="size-4" /> Bloqueo</div><p className="mt-2 text-sm">{segment.block.reason}</p>{segment.block.notes ? <p className="mt-1 text-xs text-amber-800">{segment.block.notes}</p> : null}<div className="mt-4 flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => onEditBlock(segment.block!.id)}><Edit3 className="size-3.5" /> Editar</Button><Button type="button" size="sm" variant="ghost" onClick={() => onDeleteBlock(segment.block!.id)} disabled={isPending}><Trash2 className="size-3.5" /> Eliminar</Button></div></div> : null}
          {!segment.reservation && !segment.block && segment.quotes.length === 0 ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Esta cabana esta disponible para la fecha seleccionada.</p> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RecordDetail({ title, record, tone, actions }: { title: string; record: PlannerReservation; tone: 'red' | 'violet'; actions: ReactNode }) {
  return (
    <div className={cn('rounded-lg border p-4', tone === 'red' ? 'border-red-200 bg-red-50 text-red-950' : 'border-violet-200 bg-violet-50 text-violet-950')}>
      <div className="flex items-center justify-between gap-2"><p className="font-semibold">{title}</p><Badge variant="outline">{record.status_label}</Badge></div>
      <p className="mt-3 font-medium">{record.leader_name ?? 'Sin nombre'}</p>
      <p className="mt-1 text-sm">{formatRange(record.check_in, record.check_out)} · {record.guests_count} personas</p>
      <p className="mt-1 text-sm">{record.cabin_names.join(', ')}</p>
      {record.expires_at ? <p className="mt-2 flex items-center gap-1 text-xs"><Clock3 className="size-3.5" /> Vence {new Date(record.expires_at).toLocaleString('es-CO')}</p> : null}
      {record.notes ? <p className="mt-2 text-sm opacity-80">{record.notes}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}
