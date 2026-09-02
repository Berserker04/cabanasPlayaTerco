'use client';

import {
  Ban,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  LoaderCircle,
  LockKeyhole,
  MapPinned,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api } from '@/lib/api';
import { MAP_SLOT_LABELS } from '@/lib/cabin-utils';
import { cn } from '@/lib/utils';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  AdminAvailabilityCalendar,
  AdminAvailabilityCalendarEvent,
  AvailabilityBlock,
  AvailabilityResult,
  CabinAvailabilityEntry,
  MapSlot,
} from '@/types/cabin';
import type { Reservation, ReservationStatus } from '@/types/reservation';

const DEFAULT_COLORS = ['#0ea5e9', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6'];

const todayIso = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today.toISOString().slice(0, 10);
};

const addDaysIso = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);

  return value.toISOString().slice(0, 10);
};

const monthIso = () => todayIso().slice(0, 7);

const addHoursDateTimeLocal = (hours: number) => {
  const value = new Date();
  value.setHours(value.getHours() + hours, 0, 0, 0);

  return toDateTimeLocal(value);
};

const toDateTimeLocal = (date: Date) => {
  const pad = (part: number) => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const isoToDateTimeLocal = (value: string | null) => {
  if (!value) {
    return '';
  }

  return toDateTimeLocal(new Date(value));
};

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Sin vencimiento';
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);

  return new Intl.DateTimeFormat('es-CO', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthNumber - 1, 1));
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : '';
}

function cleanPayload(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== '' && value !== undefined),
  );
}

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'No pudimos completar la accion.';
}

function buildSlotStates(
  entries: CabinAvailabilityEntry[],
  selectedSlots: MapSlot[],
  draftColor: string,
) {
  return entries.reduce<Partial<Record<MapSlot, CabinMapSlotState>>>((states, entry) => {
    if (!entry.map_slot) {
      return states;
    }

    states[entry.map_slot] = {
      tone: entry.tone,
      label: entry.label,
      isAvailable: entry.is_available,
      leaderName: entry.leader_name,
      displayColor: selectedSlots.includes(entry.map_slot)
        ? draftColor
        : entry.display_color,
    };

    return states;
  }, {});
}

export function AvailabilityAdmin() {
  const queryClient = useQueryClient();
  const defaultCheckIn = todayIso();
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(addDaysIso(defaultCheckIn, 1));
  const [guests, setGuests] = useState('4');
  const [selectedCabinIds, setSelectedCabinIds] = useState<number[]>([]);
  const [leaderName, setLeaderName] = useState('');
  const [displayColor, setDisplayColor] = useState(DEFAULT_COLORS[0]);
  const [reservationStatus, setReservationStatus] = useState<ReservationStatus>('pending');
  const [expiresAt, setExpiresAt] = useState(addHoursDateTimeLocal(48));
  const [totalPrice, setTotalPrice] = useState('');
  const [reservationNotes, setReservationNotes] = useState('');
  const [editingReservationId, setEditingReservationId] = useState<number | null>(null);
  const [blockAll, setBlockAll] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockNotes, setBlockNotes] = useState('');
  const [agendaMode, setAgendaMode] = useState<'month' | 'year'>('month');
  const [agendaMonth, setAgendaMonth] = useState(monthIso());
  const [agendaYear, setAgendaYear] = useState(String(new Date().getFullYear()));

  const availabilityQuery = useQuery({
    queryKey: ['admin-availability', checkIn, checkOut, guests],
    queryFn: () =>
      api.get<ApiResponse<AvailabilityResult>>(
        `/admin/availability${buildQuery({
          check_in: checkIn,
          check_out: checkOut,
          guests,
        })}`,
      ),
    enabled: Boolean(checkIn && checkOut && checkOut > checkIn),
  });

  const blocksQuery = useQuery({
    queryKey: ['admin-availability-blocks', checkIn, checkOut],
    queryFn: () =>
      api.get<ApiListResponse<AvailabilityBlock>>(
        `/admin/availability-blocks${buildQuery({ from: checkIn, to: checkOut })}`,
      ),
    enabled: Boolean(checkIn && checkOut && checkOut > checkIn),
  });

  const calendarQuery = useQuery({
    queryKey: ['admin-availability-calendar', agendaMode, agendaMonth, agendaYear],
    queryFn: () =>
      api.get<ApiResponse<AdminAvailabilityCalendar>>(
        `/admin/availability/calendar${buildQuery(
          agendaMode === 'month'
            ? { month: agendaMonth }
            : { year: Number(agendaYear) || new Date().getFullYear() },
        )}`,
      ),
    enabled: agendaMode === 'month' ? Boolean(agendaMonth) : Boolean(agendaYear),
  });

  const availability = availabilityQuery.data?.data;
  const entries = useMemo(() => availability?.cabins ?? [], [availability?.cabins]);
  const blocks = useMemo(() => blocksQuery.data?.data ?? [], [blocksQuery.data?.data]);
  const calendar = calendarQuery.data?.data;
  const reservationEvents = useMemo(
    () => calendar?.events.filter((event) => event.type === 'reservation') ?? [],
    [calendar?.events],
  );
  const quoteAlerts = useMemo(
    () =>
      reservationEvents.filter(
        (event) => event.status === 'pending' && (event.is_expired_quote || event.expires_soon),
      ),
    [reservationEvents],
  );
  const monthSummaries = useMemo(() => {
    const grouped = new Map<string, { available: number; limited: number; full: number; total: number }>();

    for (const day of calendar?.days ?? []) {
      const key = day.date.slice(0, 7);
      const summary = grouped.get(key) ?? { available: 0, limited: 0, full: 0, total: 0 };
      summary[day.status] += 1;
      summary.total += 1;
      grouped.set(key, summary);
    }

    return Array.from(grouped.entries());
  }, [calendar?.days]);
  const mapCabins = useMemo(() => entries.map((entry) => entry.cabin), [entries]);
  const selectedSlots = useMemo(
    () =>
      entries
        .filter((entry) => selectedCabinIds.includes(entry.cabin_id) && entry.map_slot)
        .map((entry) => entry.map_slot as MapSlot),
    [entries, selectedCabinIds],
  );
  const slotStates = useMemo(
    () => buildSlotStates(entries, selectedSlots, displayColor),
    [displayColor, entries, selectedSlots],
  );
  const selectedEntries = entries.filter((entry) => selectedCabinIds.includes(entry.cabin_id));
  const isBusy =
    availabilityQuery.isLoading ||
    blocksQuery.isLoading ||
    availabilityQuery.isFetching;

  const saveReservationMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: Record<string, unknown> }) =>
      id
        ? api.put<ApiResponse<Reservation>>(`/admin/reservations/${id}`, payload)
        : api.post<ApiResponse<Reservation>>('/admin/reservations', payload),
    onSuccess: () => {
      toast.success(editingReservationId ? 'Reserva/cotizacion actualizada' : 'Reserva/cotizacion creada');
      resetReservationForm();
      setDisplayColor((current) => {
        const currentIndex = DEFAULT_COLORS.indexOf(current);

        return DEFAULT_COLORS[(currentIndex + 1) % DEFAULT_COLORS.length];
      });
      void queryClient.invalidateQueries({ queryKey: ['admin-availability'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-availability-blocks'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-availability-calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-reservations'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const reservationActionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      api.put<ApiResponse<Reservation>>(`/admin/reservations/${id}`, payload),
    onSuccess: () => {
      toast.success('Reserva actualizada');
      void queryClient.invalidateQueries({ queryKey: ['admin-availability'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-availability-calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-reservations'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const saveBlockMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<ApiResponse<AvailabilityBlock>>('/admin/availability-blocks', payload),
    onSuccess: () => {
      toast.success('Bloqueo creado');
      setBlockReason('');
      setBlockNotes('');
      setBlockAll(false);
      setSelectedCabinIds([]);
      void queryClient.invalidateQueries({ queryKey: ['admin-availability'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-availability-blocks'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-availability-calendar'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/availability-blocks/${id}`),
    onSuccess: () => {
      toast.success('Bloqueo eliminado');
      void queryClient.invalidateQueries({ queryKey: ['admin-availability'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-availability-blocks'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-availability-calendar'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  function toggleCabin(entry: CabinAvailabilityEntry) {
    const isSelected = selectedCabinIds.includes(entry.cabin_id);

    if (!entry.is_available && !isSelected) {
      toast.info(`${entry.cabin.name}: ${entry.label}`);
      return;
    }

    setSelectedCabinIds((current) =>
      current.includes(entry.cabin_id)
        ? current.filter((id) => id !== entry.cabin_id)
        : [...current, entry.cabin_id],
    );
  }

  function handleMapSelect(slot: MapSlot) {
    const entry = entries.find((item) => item.map_slot === slot);

    if (!entry) {
      toast.info('No hay cabana registrada en este punto.');
      return;
    }

    toggleCabin(entry);
  }

  function handleReservationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedCabinIds.length === 0) {
      toast.error('Selecciona al menos una cabana disponible.');
      return;
    }

    saveReservationMutation.mutate({
      id: editingReservationId,
      payload: cleanPayload({
        cabin_ids: selectedCabinIds,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: Number(guests || 1),
        leader_name: leaderName,
        display_color: displayColor,
        status: reservationStatus,
        expires_at: reservationStatus === 'pending' ? expiresAt : undefined,
        source: 'admin',
        total_price: totalPrice ? Number(totalPrice) : undefined,
        notes: reservationNotes,
      }),
    });
  }

  function resetReservationForm() {
    setEditingReservationId(null);
    setSelectedCabinIds([]);
    setLeaderName('');
    setReservationNotes('');
    setTotalPrice('');
    setReservationStatus('pending');
    setExpiresAt(addHoursDateTimeLocal(48));
  }

  function editReservation(event: AdminAvailabilityCalendarEvent) {
    setEditingReservationId(event.id);
    setCheckIn(event.check_in);
    setCheckOut(event.check_out);
    setGuests(String(event.guests_count ?? 1));
    setSelectedCabinIds(event.cabin_ids);
    setLeaderName(event.leader_name ?? '');
    setDisplayColor(event.display_color ?? DEFAULT_COLORS[0]);
    setReservationStatus(event.status as ReservationStatus);
    setExpiresAt(isoToDateTimeLocal(event.expires_at) || addHoursDateTimeLocal(48));
    setTotalPrice(event.total_price ? String(event.total_price) : '');
    setReservationNotes(event.notes ?? '');
  }

  function quickUpdateReservation(id: number, payload: Record<string, unknown>) {
    reservationActionMutation.mutate({ id, payload });
  }

  function handleBlockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!blockReason.trim()) {
      toast.error('Indica una razon para el bloqueo.');
      return;
    }

    if (!blockAll && selectedCabinIds.length === 0) {
      toast.error('Selecciona cabanas o marca bloqueo general.');
      return;
    }

    saveBlockMutation.mutate(
      cleanPayload({
        check_in: checkIn,
        check_out: checkOut,
        reason: blockReason,
        notes: blockNotes,
        applies_to_all: blockAll,
        cabin_ids: blockAll ? undefined : selectedCabinIds,
      }),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Operacion
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">Disponibilidad</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Consulta fechas, selecciona cabanas en el mapa y registra cotizaciones, reservas o
            bloqueos manuales sin crear una reserva.
          </p>
        </div>
        <div className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-[160px_160px_120px]">
          <Field label="Llegada">
            <Input
              type="date"
              value={checkIn}
              onChange={(event) => {
                const next = event.target.value;
                setCheckIn(next);
                if (checkOut <= next) {
                  setCheckOut(addDaysIso(next, 1));
                }
              }}
            />
          </Field>
          <Field label="Salida">
            <Input
              type="date"
              min={addDaysIso(checkIn, 1)}
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </Field>
          <Field label="Personas">
            <Input
              type="number"
              min={1}
              max={50}
              value={guests}
              onChange={(event) => setGuests(event.target.value)}
            />
          </Field>
        </div>
      </div>

      {availability ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Cabanas" value={availability.summary.total_cabins} />
          <Metric label="Disponibles" value={availability.summary.available_count} />
          <Metric label="Cotizadas/reservadas" value={availability.summary.reserved_count} />
          <Metric label="Bloqueadas" value={availability.summary.blocked_count} />
          <Metric label="Capacidad libre" value={availability.summary.available_capacity} />
        </div>
      ) : null}

      <OperationalCalendar
        calendar={calendar}
        isLoading={calendarQuery.isLoading || calendarQuery.isFetching}
        mode={agendaMode}
        month={agendaMonth}
        year={agendaYear}
        quoteAlerts={quoteAlerts}
        monthSummaries={monthSummaries}
        onModeChange={setAgendaMode}
        onMonthChange={setAgendaMonth}
        onYearChange={setAgendaYear}
        onEdit={editReservation}
        onConfirm={(event) => quickUpdateReservation(event.id, { status: 'confirmed' })}
        onRenew={(event) =>
          quickUpdateReservation(event.id, {
            status: 'pending',
            expires_at: addHoursDateTimeLocal(48),
          })
        }
        onCancel={(event) => quickUpdateReservation(event.id, { status: 'cancelled' })}
        actionPending={reservationActionMutation.isPending}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <div className="space-y-5">
          {availabilityQuery.isError ? (
            <ErrorState message="No pudimos cargar disponibilidad para esas fechas." />
          ) : (
            <CabinMap
              cabins={mapCabins}
              selectedSlots={selectedSlots}
              slotStates={slotStates}
              onSelectSlot={handleMapSelect}
            />
          )}

          <section className="rounded-lg border bg-white p-4">
            <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Cabanas del rango</h2>
                <p className="text-sm text-muted-foreground">Tambien puedes seleccionar por lista.</p>
              </div>
              {isBusy ? (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Actualizando
                </span>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {entries.map((entry) => (
                <button
                  key={entry.cabin_id}
                  type="button"
                  onClick={() => toggleCabin(entry)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition hover:border-cyan-700 hover:bg-cyan-50/50',
                    selectedCabinIds.includes(entry.cabin_id) ? 'border-cyan-700 bg-cyan-50' : 'bg-white',
                    !entry.is_available ? 'cursor-not-allowed opacity-80 hover:border-border hover:bg-white' : '',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-950">{entry.cabin.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.map_slot ? MAP_SLOT_LABELS[entry.map_slot] : 'Sin punto'}
                      </p>
                    </div>
                    <StateBadge entry={entry} />
                  </div>
                  {entry.leader_name ? (
                    <p className="mt-2 text-xs font-medium text-neutral-700">{entry.leader_name}</p>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border bg-white p-5">
            <MapPinned className="h-6 w-6 text-cyan-700" />
            <h2 className="mt-4 text-lg font-semibold">Seleccion actual</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {selectedEntries.length > 0
                ? `${selectedEntries.length} cabanas seleccionadas para ${guests || 0} personas.`
                : 'Selecciona cabanas verdes desde el mapa o la lista.'}
            </p>
            {selectedEntries.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedEntries.map((entry) => (
                  <Badge key={entry.cabin_id} variant="outline">
                    {entry.cabin.name}
                  </Badge>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border bg-white p-5">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-700" />
              <h2 className="text-lg font-semibold">
                {editingReservationId ? 'Editar cotizacion/reserva' : 'Nueva cotizacion/reserva'}
              </h2>
            </div>
            {editingReservationId ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
                <span>Editando reserva #{editingReservationId}</span>
                <Button type="button" size="sm" variant="ghost" onClick={resetReservationForm}>
                  Cancelar edicion
                </Button>
              </div>
            ) : null}
            <form onSubmit={handleReservationSubmit} className="mt-5 space-y-4">
              <Field label="Lider del grupo">
                <Input value={leaderName} onChange={(event) => setLeaderName(event.target.value)} />
              </Field>
              <div className="grid grid-cols-[1fr_72px] gap-3">
                <Field label="Estado">
                  <Select
                    value={reservationStatus}
                    onValueChange={(value) => setReservationStatus(value as ReservationStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Cotizada</SelectItem>
                      <SelectItem value="confirmed">Confirmada</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Color">
                  <Input
                    type="color"
                    value={displayColor}
                    onChange={(event) => setDisplayColor(event.target.value)}
                    className="h-10 p-1"
                  />
                </Field>
              </div>
              {reservationStatus === 'pending' ? (
                <Field label="Vence cotizacion">
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                  />
                </Field>
              ) : null}
              <Field label="Valor total opcional">
                <Input
                  type="number"
                  min={0}
                  value={totalPrice}
                  onChange={(event) => setTotalPrice(event.target.value)}
                />
              </Field>
              <Field label="Notas internas">
                <Textarea
                  value={reservationNotes}
                  onChange={(event) => setReservationNotes(event.target.value)}
                  rows={3}
                />
              </Field>
              <Button type="submit" disabled={saveReservationMutation.isPending} className="w-full">
                {saveReservationMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {editingReservationId ? 'Actualizar cotizacion/reserva' : 'Guardar cotizacion/reserva'}
              </Button>
            </form>
          </section>

          <section className="rounded-lg border bg-white p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Bloquear disponibilidad</h2>
            </div>
            <form onSubmit={handleBlockSubmit} className="mt-5 space-y-4">
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={blockAll}
                  onChange={(event) => setBlockAll(event.target.checked)}
                />
                Aplicar a todas las cabanas
              </label>
              <Field label="Razon">
                <Input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} />
              </Field>
              <Field label="Notas internas">
                <Textarea
                  value={blockNotes}
                  onChange={(event) => setBlockNotes(event.target.value)}
                  rows={3}
                />
              </Field>
              <Button
                type="submit"
                variant="outline"
                disabled={saveBlockMutation.isPending}
                className="w-full border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                {saveBlockMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Crear bloqueo
              </Button>
            </form>
          </section>

          <section className="rounded-lg border bg-white p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-cyan-700" />
              <h2 className="text-lg font-semibold">Bloqueos del rango</h2>
            </div>
            <div className="mt-4 space-y-3">
              {blocks.length > 0 ? (
                blocks.map((block) => (
                  <div key={block.id} className="rounded-md border bg-stone-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{block.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {block.check_in} a {block.check_out}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {block.applies_to_all ? 'Todas las cabanas' : `${block.cabin_ids?.length ?? 0} cabanas`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBlockMutation.mutate(block.id)}
                        disabled={deleteBlockMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar bloqueo</span>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay bloqueos manuales en este rango.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function StateBadge({ entry }: { entry: CabinAvailabilityEntry }) {
  if (entry.tone === 'green') {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        <CheckCircle2 className="h-3 w-3" />
        Disponible
      </Badge>
    );
  }

  if (entry.tone === 'red') {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        <Ban className="h-3 w-3" />
        {entry.label}
      </Badge>
    );
  }

  if (entry.tone === 'orange') {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        <LockKeyhole className="h-3 w-3" />
        {entry.label}
      </Badge>
    );
  }

  return <Badge variant="outline">Inactiva</Badge>;
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
      {message}
    </div>
  );
}

function OperationalCalendar({
  calendar,
  isLoading,
  mode,
  month,
  year,
  quoteAlerts,
  monthSummaries,
  onModeChange,
  onMonthChange,
  onYearChange,
  onEdit,
  onConfirm,
  onRenew,
  onCancel,
  actionPending,
}: {
  calendar: AdminAvailabilityCalendar | undefined;
  isLoading: boolean;
  mode: 'month' | 'year';
  month: string;
  year: string;
  quoteAlerts: AdminAvailabilityCalendarEvent[];
  monthSummaries: Array<[string, { available: number; limited: number; full: number; total: number }]>;
  onModeChange: (mode: 'month' | 'year') => void;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  onEdit: (event: AdminAvailabilityCalendarEvent) => void;
  onConfirm: (event: AdminAvailabilityCalendarEvent) => void;
  onRenew: (event: AdminAvailabilityCalendarEvent) => void;
  onCancel: (event: AdminAvailabilityCalendarEvent) => void;
  actionPending: boolean;
}) {
  const days = calendar?.days ?? [];
  const events = calendar?.events ?? [];
  const firstDayOffset = days.length > 0 ? new Date(`${days[0].date}T00:00:00`).getDay() : 0;

  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-cyan-700" />
            <h2 className="text-lg font-semibold">Calendario operativo</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista de ocupacion futura por rango, cotizaciones vigentes y alertas de vencimiento.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[auto_160px_110px]">
          <div className="inline-flex rounded-md border bg-stone-50 p-1">
            <Button
              type="button"
              size="sm"
              variant={mode === 'month' ? 'default' : 'ghost'}
              onClick={() => onModeChange('month')}
            >
              Mes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'year' ? 'default' : 'ghost'}
              onClick={() => onModeChange('year')}
            >
              Ano
            </Button>
          </div>
          {mode === 'month' ? (
            <Input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} />
          ) : (
            <Input
              type="number"
              min={2026}
              max={2100}
              value={year}
              onChange={(event) => onYearChange(event.target.value)}
            />
          )}
          <div className="inline-flex items-center justify-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
            {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            {calendar?.summary.events_count ?? 0} eventos
          </div>
        </div>
      </div>

      {quoteAlerts.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {quoteAlerts.map((event) => (
            <div
              key={`alert-${event.id}`}
              className={cn(
                'rounded-md border px-3 py-2 text-sm',
                event.is_expired_quote
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900',
              )}
            >
              <p className="font-medium">
                {event.is_expired_quote ? 'Cotizacion vencida' : 'Cotizacion por vencer'}: {event.leader_name ?? 'Sin lider'}
              </p>
              <p className="mt-1 text-xs">
                {event.cabin_names.join(', ')} - vence {formatDateTime(event.expires_at)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_390px]">
        <div>
          {mode === 'month' ? (
            <div className="grid grid-cols-7 gap-1 text-xs">
              {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map((label) => (
                <div key={label} className="px-2 py-1 font-medium text-muted-foreground">
                  {label}
                </div>
              ))}
              {Array.from({ length: firstDayOffset }).map((_, index) => (
                <div key={`offset-${index}`} className="min-h-20 rounded-md bg-stone-50" />
              ))}
              {days.map((day) => (
                <CalendarDay key={day.date} day={day} />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {monthSummaries.map(([key, summary]) => (
                <div key={key} className="rounded-md border bg-stone-50 p-3">
                  <p className="font-medium capitalize">{monthLabel(key)}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <MiniMetric label="Libres" value={summary.available} />
                    <MiniMetric label="Limit." value={summary.limited} />
                    <MiniMetric label="Llenos" value={summary.full} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Agenda del periodo</h3>
          <div className="max-h-[460px] space-y-2 overflow-auto pr-1">
            {events.length > 0 ? (
              events.map((event) => (
                <AgendaEvent
                  key={`${event.type}-${event.id}`}
                  event={event}
                  onEdit={onEdit}
                  onConfirm={onConfirm}
                  onRenew={onRenew}
                  onCancel={onCancel}
                  actionPending={actionPending}
                />
              ))
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No hay reservas, cotizaciones o bloqueos en este periodo.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarDay({ day }: { day: AdminAvailabilityCalendar['days'][number] }) {
  return (
    <div
      className={cn(
        'min-h-20 rounded-md border p-2',
        day.status === 'full'
          ? 'border-red-200 bg-red-50'
          : day.status === 'limited'
            ? 'border-amber-200 bg-amber-50'
            : 'border-emerald-100 bg-emerald-50',
      )}
    >
      <p className="font-medium">{Number(day.date.slice(8, 10))}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        {day.available}/{day.total} libres
      </p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white px-2 py-2">
      <p className="font-bold">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

function AgendaEvent({
  event,
  onEdit,
  onConfirm,
  onRenew,
  onCancel,
  actionPending,
}: {
  event: AdminAvailabilityCalendarEvent;
  onEdit: (event: AdminAvailabilityCalendarEvent) => void;
  onConfirm: (event: AdminAvailabilityCalendarEvent) => void;
  onRenew: (event: AdminAvailabilityCalendarEvent) => void;
  onCancel: (event: AdminAvailabilityCalendarEvent) => void;
  actionPending: boolean;
}) {
  const isReservation = event.type === 'reservation';
  const isPending = event.status === 'pending';

  return (
    <article className="rounded-md border bg-stone-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: event.display_color ?? (event.type === 'block' ? '#f59e0b' : '#0ea5e9') }}
            />
            <p className="text-sm font-medium">{event.leader_name ?? event.status_label}</p>
            <EventBadge event={event} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {event.check_in} a {event.check_out} - {event.cabin_names.join(', ')}
          </p>
          {isPending ? (
            <p className="mt-1 text-xs text-muted-foreground">Vence {formatDateTime(event.expires_at)}</p>
          ) : null}
        </div>
      </div>
      {isReservation ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(event)} disabled={actionPending}>
            <Edit3 className="h-3.5 w-3.5" />
            Editar
          </Button>
          {isPending ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => onConfirm(event)} disabled={actionPending}>
                <Check className="h-3.5 w-3.5" />
                Confirmar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onRenew(event)} disabled={actionPending}>
                <RefreshCw className="h-3.5 w-3.5" />
                Renovar 48h
              </Button>
            </>
          ) : null}
          {event.status !== 'cancelled' ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onCancel(event)} disabled={actionPending}>
              <XCircle className="h-3.5 w-3.5" />
              Cancelar
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function EventBadge({ event }: { event: AdminAvailabilityCalendarEvent }) {
  if (event.type === 'block') {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Bloqueo</Badge>;
  }

  if (event.is_expired_quote || event.status === 'expired') {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Vencida</Badge>;
  }

  if (event.expires_soon) {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Por vencer</Badge>;
  }

  if (event.status === 'pending') {
    return <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">Cotizada</Badge>;
  }

  return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">{event.status_label}</Badge>;
}
