'use client';

import {
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, LoaderCircle, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { MAX_GROUP_GUESTS } from '@/lib/stay-context';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@/types/api';
import type {
  AvailabilityAgendaReservation,
  PlannerResult,
} from '@/types/cabin';
import {
  addDaysIso,
  buildQuery,
  dateTimeBogota,
  formatDate,
  MAX_RANGE_DAYS,
  rangeLength,
  validRange,
  validContactPhone,
  reservationSources,
  type AvailabilityFilters,
} from './availability-model';

export function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError)
    return Object.values(error.errors ?? {}).flat()[0] ?? error.message;
  return 'No pudimos completar la acción. Intenta de nuevo.';
}

const subscribeViewport = (callback: () => void) => {
  window.visualViewport?.addEventListener('resize', callback);
  window.visualViewport?.addEventListener('scroll', callback);
  return () => {
    window.visualViewport?.removeEventListener('resize', callback);
    window.visualViewport?.removeEventListener('scroll', callback);
  };
};
const viewportSnapshot = () =>
  window.visualViewport
    ? `${window.visualViewport.height}:${window.visualViewport.offsetTop}`
    : '';
const serverViewport = () => '';

export function AvailabilitySheetContent({
  children,
  className,
  ...props
}: ComponentProps<typeof SheetContent>) {
  const viewport = useSyncExternalStore(
    subscribeViewport,
    viewportSnapshot,
    serverViewport,
  );
  const [height, top] = viewport.split(':').map(Number);
  return (
    <SheetContent
      {...props}
      className={cn(
        'h-dvh w-full gap-0 overflow-hidden sm:max-w-lg [&>button]:right-1 [&>button]:top-1 [&>button]:grid [&>button]:size-11 [&>button]:place-items-center',
        className,
      )}
      style={viewport ? { height, top, bottom: 'auto' } : undefined}
    >
      {children}
    </SheetContent>
  );
}

export function Field({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'min-w-0 space-y-1.5 [&_input]:h-11 [&_input]:min-w-0 [&_input]:text-base [&_textarea]:text-base',
        className,
      )}
    >
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export type RecordDraft = {
  record?: AvailabilityAgendaReservation;
  filters: AvailabilityFilters;
  cabinIds: number[];
};

export function AvailabilityRecordForm({
  draft,
  onClose,
  onSaved,
}: {
  draft: RecordDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const record = draft.record;
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<'pending' | 'confirmed'>(
    record?.status === 'confirmed' ? 'confirmed' : 'pending',
  );
  const [checkIn, setCheckIn] = useState(
    record?.check_in ?? draft.filters.checkIn,
  );
  const [checkOut, setCheckOut] = useState(
    record?.check_out ?? draft.filters.checkOut,
  );
  const [guests, setGuests] = useState(
    String(record?.guests_count ?? draft.filters.guests),
  );
  const [leader, setLeader] = useState(record?.leader_name ?? '');
  const [phone, setPhone] = useState(record?.leader_phone ?? '');
  const [whatsapp, setWhatsapp] = useState(record?.leader_whatsapp ?? '');
  const [sameWhatsapp, setSameWhatsapp] = useState(
    (record?.leader_phone ?? '').replace(/\D/g, '') ===
      (record?.leader_whatsapp ?? '').replace(/\D/g, ''),
  );
  const [source, setSource] = useState(
    record ? (record.source ?? '') : 'whatsapp',
  );
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [expires, setExpires] = useState(
    dateTimeBogota(
      record?.expires_at ? new Date(record.expires_at) : undefined,
    ),
  );
  const [cabinIds, setCabinIds] = useState(record?.cabin_ids ?? draft.cabinIds);
  const [error, setError] = useState('');
  const rangeIsValid = validRange(checkIn, checkOut);
  const availability = useQuery({
    queryKey: ['admin-availability-record', checkIn, checkOut, record?.id],
    queryFn: () =>
      api.get<ApiResponse<PlannerResult>>(
        `/admin/availability/planner${buildQuery({ check_in: checkIn, check_out: checkOut, exclude_reservation_id: record?.id })}`,
      ),
    enabled: rangeIsValid,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const cabins = availability.data?.data.cabins ?? [];
  const chosen = cabins.filter((cabin) => cabinIds.includes(cabin.cabin_id));
  const capacity = chosen.reduce((sum, cabin) => sum + cabin.max_guests, 0);
  const conflicts = cabinIds.filter(
    (id) => !cabins.find((cabin) => cabin.cabin_id === id)?.available_for_range,
  );
  const unchangedQuote =
    record?.status === 'pending' &&
    kind === 'pending' &&
    checkIn === record.check_in &&
    checkOut === record.check_out &&
    [...cabinIds].sort().join(',') === [...record.cabin_ids].sort().join(',');
  const checking = availability.isFetching || !availability.data;
  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      record
        ? api.put(`/admin/reservations/${record.id}`, payload)
        : api.post('/admin/reservations', payload),
    onSuccess: () => {
      toast.success(record ? 'Registro actualizado.' : 'Registro guardado.');
      onSaved();
      onClose();
    },
    onError: (failure) => {
      setError(apiErrorMessage(failure));
      void queryClient.invalidateQueries({
        queryKey: ['admin-availability-record'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['admin-availability-planner'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['admin-availability-agenda'],
      });
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rangeIsValid || checking || availability.isError) {
      setError('Espera a que se comprueben las fechas válidas.');
      return;
    }
    if (!leader.trim() || !cabinIds.length) {
      setError('Escribe el titular y selecciona al menos una cabaña.');
      return;
    }
    if (
      !Number.isInteger(Number(guests)) ||
      Number(guests) < 1 ||
      Number(guests) > MAX_GROUP_GUESTS
    ) {
      setError(`Ingresa entre 1 y ${MAX_GROUP_GUESTS} personas.`);
      return;
    }
    if (conflicts.length && !unchangedQuote) {
      setError(
        'Revisa las cabañas marcadas: no están libres para estas fechas.',
      );
      return;
    }
    const expiry = kind === 'pending' ? new Date(`${expires}:00-05:00`) : null;
    if (
      expiry &&
      (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now())
    ) {
      setError('La vigencia debe ser una fecha futura, en hora de Colombia.');
      return;
    }
    setError('');
    if (
      !validContactPhone(phone) ||
      !validContactPhone(sameWhatsapp ? phone : whatsapp)
    ) {
      setError(
        'Revisa el celular y WhatsApp: deben contener entre 7 y 15 dígitos, con indicativo de país opcional.',
      );
      return;
    }
    save.mutate({
      cabin_ids: cabinIds,
      check_in: checkIn,
      check_out: checkOut,
      guests_count: Number(guests),
      leader_name: leader.trim(),
      leader_phone: phone.trim() || null,
      leader_whatsapp: (sameWhatsapp ? phone : whatsapp).trim() || null,
      status: kind,
      expires_at: expiry?.toISOString() ?? null,
      source: source || null,
      notes: notes.trim() || null,
    });
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <AvailabilitySheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader className="shrink-0 border-b py-3 pr-12">
          <SheetTitle>
            {record ? 'Editar registro' : 'Nuevo registro'}
          </SheetTitle>
          <SheetDescription>
            Datos del encargado, contacto y estancia.
          </SheetDescription>
        </SheetHeader>
        <div
          className="shrink-0 border-b bg-cyan-50/60 px-4 py-2 text-xs"
          aria-live="polite"
        >
          <p className="font-semibold">
            {formatDate(checkIn, true)} → {formatDate(checkOut, true)} ·{' '}
            {rangeIsValid ? rangeLength(checkIn, checkOut) : '—'} noches ·{' '}
            {guests || '—'} personas
          </p>
          <p
            className="mt-1 truncate"
            title={chosen.map((cabin) => cabin.name).join(', ')}
          >
            {chosen.length
              ? chosen.map((cabin) => cabin.name).join(', ')
              : 'Selecciona las cabañas'}{' '}
            · Capacidad: {checking ? '…' : capacity}
          </p>
        </div>
        <form
          id="availability-record-form"
          onSubmit={submit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
        >
          <fieldset disabled={save.isPending} className="space-y-4">
            <div
              className="grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1"
              role="group"
              aria-label="Tipo de registro"
            >
              <Button
                type="button"
                className={cn(
                  'min-h-11',
                  kind === 'pending' && 'bg-white text-violet-800 shadow-sm',
                )}
                variant="ghost"
                aria-pressed={kind === 'pending'}
                onClick={() => setKind('pending')}
              >
                Cotización
              </Button>
              <Button
                type="button"
                className={cn(
                  'min-h-11',
                  kind === 'confirmed' && 'bg-white text-red-800 shadow-sm',
                )}
                variant="ghost"
                aria-pressed={kind === 'confirmed'}
                onClick={() => setKind('confirmed')}
              >
                Confirmada
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {kind === 'pending'
                ? 'La cotización no bloquea disponibilidad.'
                : 'La reserva confirmada bloqueará las noches seleccionadas.'}
            </p>
            <Field id="record-source" label="Origen de la reserva">
              <select
                id="record-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-base focus-visible:outline-2 focus-visible:outline-ring"
                aria-describedby="record-source-help"
              >
                <option value="">Sin especificar</option>
                {source && !reservationSources[source] && (
                  <option value={source}>{source}</option>
                )}
                {Object.entries(reservationSources).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p
                id="record-source-help"
                className="text-xs text-muted-foreground"
              >
                Canal por el que llegó la reserva.
              </p>
            </Field>
            <Field id="record-leader" label="Nombre del encargado o titular">
              <Input
                id="record-leader"
                required
                maxLength={255}
                value={leader}
                onChange={(event) => setLeader(event.target.value)}
                placeholder="Nombre del titular"
              />
            </Field>
            <Field id="record-phone" label="Celular del encargado (opcional)">
              <Input
                id="record-phone"
                type="tel"
                autoComplete="tel"
                maxLength={40}
                value={phone}
                onInput={(event) => setPhone(event.currentTarget.value)}
                placeholder="Ej. +57 300 123 4567"
                aria-describedby="record-phone-help"
              />
              <p
                id="record-phone-help"
                className="text-xs text-muted-foreground"
              >
                Incluye el indicativo del país para números internacionales.
              </p>
            </Field>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-cyan-700"
                checked={sameWhatsapp}
                onChange={(event) => setSameWhatsapp(event.target.checked)}
              />
              Usar el mismo número para WhatsApp
            </label>
            {!sameWhatsapp && (
              <div id="record-whatsapp-field">
                <Field
                  id="record-whatsapp"
                  label="WhatsApp del encargado (opcional)"
                >
                  <Input
                    id="record-whatsapp"
                    type="tel"
                    autoComplete="off"
                    maxLength={40}
                    value={whatsapp}
                    onInput={(event) => setWhatsapp(event.currentTarget.value)}
                    placeholder="Ej. +57 310 123 4567"
                    aria-describedby="record-whatsapp-help"
                  />
                  <p
                    id="record-whatsapp-help"
                    className="text-xs text-muted-foreground"
                  >
                    Indica el número diferente o déjalo vacío si no usa
                    WhatsApp.
                  </p>
                </Field>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
              <Field id="record-check-in" label="Llegada">
                <Input
                  id="record-check-in"
                  type="date"
                  required
                  value={checkIn}
                  onInput={(event) => {
                    const next = event.currentTarget.value;
                    setCheckIn(next);
                    if (next && checkOut <= next)
                      setCheckOut(addDaysIso(next, 1));
                  }}
                />
              </Field>
              <Field id="record-check-out" label="Salida">
                <Input
                  id="record-check-out"
                  type="date"
                  required
                  min={addDaysIso(checkIn, 1)}
                  max={addDaysIso(checkIn, MAX_RANGE_DAYS)}
                  value={checkOut}
                  onInput={(event) => setCheckOut(event.currentTarget.value)}
                />
              </Field>
            </div>
            {!rangeIsValid && (
              <p className="text-sm text-red-700" role="alert">
                Elige una estancia de 1 a 31 noches.
              </p>
            )}
            <Field id="record-guests" label="Personas">
              <Input
                id="record-guests"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_GROUP_GUESTS}
                step={1}
                required
                value={guests}
                onChange={(event) => setGuests(event.target.value)}
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Cabañas para estas fechas
              </legend>
              {rangeIsValid && checking && !availability.isError && (
                <p
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  role="status"
                >
                  <LoaderCircle className="size-4 animate-spin" />
                  Comprobando disponibilidad…
                </p>
              )}
              {availability.isError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 p-3 text-sm"
                >
                  <p>{apiErrorMessage(availability.error)}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 min-h-11"
                    onClick={() => void availability.refetch()}
                  >
                    <RefreshCw className="size-4" />
                    Reintentar
                  </Button>
                </div>
              )}
              {rangeIsValid &&
                !availability.isError &&
                cabins.map((cabin) => {
                  const checked = cabinIds.includes(cabin.cabin_id);
                  const unavailable = !cabin.available_for_range;
                  const reason = cabin.segments.find(
                    (segment) => !segment.is_available,
                  );
                  return (
                    <label
                      key={cabin.cabin_id}
                      className={cn(
                        'flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm',
                        checked && 'border-cyan-600 bg-cyan-50/50',
                        unavailable && checked && 'border-red-300 bg-red-50',
                        unavailable && !checked && 'bg-stone-50 text-stone-500',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-cyan-700"
                        checked={checked}
                        disabled={checking || (unavailable && !checked)}
                        onChange={(event) =>
                          setCabinIds(
                            event.target.checked
                              ? [...cabinIds, cabin.cabin_id]
                              : cabinIds.filter((id) => id !== cabin.cabin_id),
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">
                          {cabin.name}{cabin.cabin.deleted_at ? ' · Eliminada (reserva existente)' : ''} · {cabin.max_guests} personas
                        </span>
                        <span className="mt-0.5 block text-xs">
                          {checking
                            ? 'Comprobando…'
                            : unavailable
                              ? `${reason?.label ?? 'No disponible'}${reason ? ` · ${formatDate(reason.check_in, true)} – ${formatDate(reason.check_out, true)}` : ''}`
                              : 'Libre durante toda la estancia'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              {rangeIsValid &&
                !checking &&
                !availability.isError &&
                !cabins.length && (
                  <p className="text-sm">No hay cabañas configuradas.</p>
                )}
              {!checking &&
                cabinIds
                  .filter(
                    (id) => !cabins.some((cabin) => cabin.cabin_id === id),
                  )
                  .map((id) => (
                    <Button
                      key={id}
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() =>
                        setCabinIds(cabinIds.filter((value) => value !== id))
                      }
                    >
                      Quitar cabaña {id} no disponible
                    </Button>
                  ))}
            </fieldset>
            {!checking && chosen.length > 0 && capacity < Number(guests) && (
              <p
                role="status"
                className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
              >
                <Users className="size-4 shrink-0" />
                Capacidad insuficiente: {capacity} plazas para {guests}{' '}
                personas. Agrega otra cabaña o revisa el grupo.
              </p>
            )}
            {kind === 'pending' && (
              <Field
                id="record-expires"
                label="Vigente hasta · hora de Colombia"
              >
                <Input
                  id="record-expires"
                  type="datetime-local"
                  required
                  value={expires}
                  onChange={(event) => setExpires(event.target.value)}
                />
              </Field>
            )}
            <Field id="record-notes" label="Notas opcionales">
              <Textarea
                id="record-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Acuerdos o referencia de la conversación"
              />
            </Field>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
          </fieldset>
        </form>
        <SheetFooter className="shrink-0 border-t bg-white py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {!checking && conflicts.length > 0 && !unchangedQuote && (
            <p className="text-xs text-red-700" role="status">
              Cambia las fechas o quita las cabañas en conflicto.
            </p>
          )}
          <Button
            type="submit"
            form="availability-record-form"
            className="min-h-11"
            disabled={
              save.isPending ||
              checking ||
              availability.isError ||
              !rangeIsValid ||
              (!unchangedQuote && conflicts.length > 0) ||
              !cabinIds.length
            }
          >
            {save.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {record ? 'Guardar cambios' : 'Guardar registro'}
          </Button>
        </SheetFooter>
      </AvailabilitySheetContent>
    </Sheet>
  );
}
