import type { FormEvent } from 'react';
import { LoaderCircle, LockKeyhole, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { PlannerCabin } from '@/types/cabin';
import { addDaysIso, MAX_RANGE_DAYS } from './availability-model';
import { AvailabilitySheetContent, Field } from './availability-record-form';

export function BlockSheet({
  open,
  onOpenChange,
  editing,
  checkIn,
  checkOut,
  reason,
  notes,
  appliesToAll,
  cabinIds,
  cabinNames,
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
  cabinNames: Record<number, string>;
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
      <AvailabilitySheetContent>
        <SheetHeader className="shrink-0 border-b py-3 pr-12">
          <SheetTitle>
            {editing ? 'Editar bloqueo' : 'Bloquear fechas'}
          </SheetTitle>
          <SheetDescription>
            Úsalo para mantenimiento, eventos privados o cierres operativos.
          </SheetDescription>
        </SheetHeader>
        <form
          id="block-form"
          onSubmit={onSubmit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4"
        >
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
            <Field id="block-check-in" label="Desde">
              <Input
                id="block-check-in"
                type="date"
                value={checkIn}
                onInput={(event) => onCheckInChange(event.currentTarget.value)}
              />
            </Field>
            <Field id="block-check-out" label="Hasta">
              <Input
                id="block-check-out"
                type="date"
                min={addDaysIso(checkIn, 1)}
                max={addDaysIso(checkIn, MAX_RANGE_DAYS)}
                value={checkOut}
                onInput={(event) => onCheckOutChange(event.currentTarget.value)}
              />
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={appliesToAll}
              onChange={(event) => onAppliesToAllChange(event.target.checked)}
            />{' '}
            Aplicar a todas las cabañas
          </label>
          {!appliesToAll ? (
            <Field id="block-cabins" label="Cabañas">
              <Select
                value=""
                onValueChange={(value) => {
                  const id = Number(value);
                  if (id && !cabinIds.includes(id))
                    onCabinIdsChange([...cabinIds, id]);
                }}
              >
                <SelectTrigger className="min-h-11" id="block-cabins">
                  <SelectValue placeholder="Agregar cabaña" />
                </SelectTrigger>
                <SelectContent>
                  {cabins
                    .filter((cabin) => !cabinIds.includes(cabin.cabin_id))
                    .map((cabin) => (
                      <SelectItem
                        key={cabin.cabin_id}
                        value={String(cabin.cabin_id)}
                      >
                        {cabin.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          {!appliesToAll && cabinIds.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cabinIds.map((id) => {
                const cabin = cabins.find((item) => item.cabin_id === id);
                return (
                  <button
                    key={id}
                    type="button"
                    className="min-h-11"
                    aria-label={`Quitar ${cabin?.name ?? cabinNames[id] ?? `cabaña ${id}`}`}
                    onClick={() =>
                      onCabinIdsChange(cabinIds.filter((item) => item !== id))
                    }
                  >
                    <Badge variant="outline">
                      {cabin?.name ?? `${cabinNames[id] ?? `Cabaña ${id}`} · Eliminada`}{' '}
                      <XCircle className="ml-1 size-3" />
                    </Badge>
                  </button>
                );
              })}
            </div>
          ) : null}
          <Field id="block-reason" label="Motivo">
            <Input
              id="block-reason"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Ej. Mantenimiento de techo"
            />
          </Field>
          <Field id="block-notes" label="Notas opcionales">
            <Textarea
              id="block-notes"
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={4}
            />
          </Field>
          {error ? (
            <p
              className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </form>
        <SheetFooter className="shrink-0 border-t bg-white pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button
            className="min-h-11"
            type="submit"
            form="block-form"
            disabled={isPending}
          >
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <LockKeyhole className="size-4" />
            )}
            {editing ? 'Guardar cambios' : 'Crear bloqueo'}
          </Button>
        </SheetFooter>
      </AvailabilitySheetContent>
    </Sheet>
  );
}
