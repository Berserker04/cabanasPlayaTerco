'use client';

import {
  Ban,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  MapPinned,
  Plus,
  Trash2,
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
  const [totalPrice, setTotalPrice] = useState('');
  const [reservationNotes, setReservationNotes] = useState('');
  const [blockAll, setBlockAll] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockNotes, setBlockNotes] = useState('');

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

  const availability = availabilityQuery.data?.data;
  const entries = useMemo(() => availability?.cabins ?? [], [availability?.cabins]);
  const blocks = useMemo(() => blocksQuery.data?.data ?? [], [blocksQuery.data?.data]);
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
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<ApiResponse<Reservation>>('/admin/reservations', payload),
    onSuccess: () => {
      toast.success('Reserva/cotizacion creada');
      setSelectedCabinIds([]);
      setLeaderName('');
      setReservationNotes('');
      setTotalPrice('');
      setDisplayColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
      void queryClient.invalidateQueries({ queryKey: ['admin-availability'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-availability-blocks'] });
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
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/availability-blocks/${id}`),
    onSuccess: () => {
      toast.success('Bloqueo eliminado');
      void queryClient.invalidateQueries({ queryKey: ['admin-availability'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-availability-blocks'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  function toggleCabin(entry: CabinAvailabilityEntry) {
    if (!entry.is_available) {
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

    saveReservationMutation.mutate(
      cleanPayload({
        cabin_ids: selectedCabinIds,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: Number(guests || 1),
        leader_name: leaderName,
        display_color: displayColor,
        status: reservationStatus,
        source: 'admin',
        total_price: totalPrice ? Number(totalPrice) : undefined,
        notes: reservationNotes,
      }),
    );
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
              <h2 className="text-lg font-semibold">Nueva cotizacion/reserva</h2>
            </div>
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
                Guardar cotizacion/reserva
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
