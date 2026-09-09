'use client';

import { useRef, useState, type FormEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  addDaysIso,
  formatDate,
  formatRange,
  isIsoDate,
  MAX_RANGE_DAYS,
  operationWeek,
  rangeLength,
  todayIso,
  type OperationPeriod,
} from './availability-model';

export function OperationPeriodSelector({
  period,
  onChange,
}: {
  period: OperationPeriod;
  onChange: (period: OperationPeriod) => void;
}) {
  const today = todayIso();
  const source = `${period.preset}/${period.from}/${period.to}`;
  const [editor, setEditor] = useState<{
    source: string;
    from: string;
    to: string;
    submitted: boolean;
  } | null>(null);
  const customButton = useRef<HTMLButtonElement>(null);
  const fromInput = useRef<HTMLInputElement>(null);
  const toInput = useRef<HTMLInputElement>(null);
  const editing = editor?.source === source ? editor : null;
  const isToday = period.preset === 'day' && period.from === today;
  const isWeek =
    period.preset === 'week' &&
    period.from === today &&
    period.to === addDaysIso(today, 6);
  const daily = period.from === period.to;
  const fromError =
    editing && !isIsoDate(editing.from)
      ? 'Elige una fecha de inicio válida.'
      : '';
  const toError = editing
    ? !isIsoDate(editing.to)
      ? 'Elige una fecha final válida.'
      : !fromError && editing.to < editing.from
        ? 'La fecha final debe ser igual o posterior al inicio.'
        : !fromError && rangeLength(editing.from, editing.to) > MAX_RANGE_DAYS
          ? 'Elige un rango de máximo 31 días entre ambas fechas.'
          : ''
    : '';

  function select(next: OperationPeriod) {
    setEditor(null);
    onChange(next);
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    if (fromError || toError) {
      setEditor({ ...editing, submitted: true });
      (fromError ? fromInput : toInput).current?.focus();
      return;
    }
    select({ from: editing.from, to: editing.to, preset: 'range' });
    customButton.current?.focus();
  }

  return (
    <section className="min-w-0 space-y-3" aria-label="Periodo de operación">
      <div
        className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
        role="group"
        aria-label="Elegir periodo"
      >
        <Button
          type="button"
          variant={isToday ? 'default' : 'outline'}
          className="min-h-11"
          aria-pressed={isToday}
          onClick={() =>
            select({ from: todayIso(), to: todayIso(), preset: 'day' })
          }
        >
          Hoy
        </Button>
        <Button
          type="button"
          variant={isWeek ? 'default' : 'outline'}
          className="min-h-11"
          aria-pressed={isWeek}
          onClick={() => select(operationWeek())}
        >
          Próximos 7 días
        </Button>
        <Button
          ref={customButton}
          type="button"
          variant={!isToday && !isWeek ? 'default' : 'outline'}
          className="col-span-2 min-h-11"
          aria-pressed={!isToday && !isWeek}
          aria-expanded={Boolean(editing)}
          aria-controls="operation-range-editor"
          onClick={() => {
            setEditor({
              source,
              from: period.from,
              to: period.to,
              submitted: false,
            });
            requestAnimationFrame(() => fromInput.current?.focus());
          }}
        >
          <CalendarDays className="size-4" aria-hidden="true" />
          Rango personalizado
        </Button>
      </div>

      <p className="text-sm font-medium" aria-live="polite" aria-atomic="true">
        {daily ? formatDate(period.from) : formatRange(period.from, period.to)}
        {!daily && (
          <span className="ml-2 inline-block font-normal text-muted-foreground">
            Ambas fechas incluidas
          </span>
        )}
      </p>

      {editing ? (
        <form
          id="operation-range-editor"
          onSubmit={apply}
          noValidate
          className="min-w-0 rounded-xl border bg-white p-3"
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-start">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="operation-from" className="text-sm font-medium">
                Desde
              </label>
              <Input
                ref={fromInput}
                id="operation-from"
                type="date"
                required
                className="h-11 min-w-0 text-base md:text-base"
                value={editing.from}
                aria-invalid={editing.submitted && Boolean(fromError)}
                aria-describedby={
                  editing.submitted && fromError
                    ? 'operation-from-error'
                    : undefined
                }
                onChange={(event) =>
                  setEditor({ ...editing, from: event.target.value })
                }
              />
              {editing.submitted && fromError && (
                <p
                  id="operation-from-error"
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {fromError}
                </p>
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="operation-to" className="text-sm font-medium">
                Hasta
              </label>
              <Input
                ref={toInput}
                id="operation-to"
                type="date"
                required
                className="h-11 min-w-0 text-base md:text-base"
                min={isIsoDate(editing.from) ? editing.from : undefined}
                max={
                  isIsoDate(editing.from)
                    ? addDaysIso(editing.from, MAX_RANGE_DAYS)
                    : undefined
                }
                value={editing.to}
                aria-invalid={editing.submitted && Boolean(toError)}
                aria-describedby={
                  editing.submitted && toError
                    ? 'operation-to-error'
                    : undefined
                }
                onChange={(event) =>
                  setEditor({ ...editing, to: event.target.value })
                }
              />
              {editing.submitted && toError && (
                <p
                  id="operation-to-error"
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {toError}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1 lg:pt-6">
              <Button type="submit" className="min-h-11">
                Aplicar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setEditor(null);
                  customButton.current?.focus();
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Pulsa Aplicar para consultar las fechas elegidas.
          </p>
        </form>
      ) : daily ? (
        <div className="flex min-w-0 items-center gap-2 sm:max-w-80">
          <Button
            type="button"
            variant="outline"
            className="size-11 shrink-0"
            aria-label="Día anterior"
            onClick={() => {
              const date = addDaysIso(period.from, -1);
              select({ from: date, to: date, preset: 'day' });
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Día de operación</span>
            <Input
              type="date"
              className="h-11 min-w-0 text-base md:text-base"
              value={period.from}
              onChange={(event) => {
                const date = event.currentTarget.value;
                if (isIsoDate(date))
                  select({ from: date, to: date, preset: 'day' });
              }}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            className="size-11 shrink-0"
            aria-label="Día siguiente"
            onClick={() => {
              const date = addDaysIso(period.from, 1);
              select({ from: date, to: date, preset: 'day' });
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </section>
  );
}
