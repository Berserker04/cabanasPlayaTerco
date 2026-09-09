'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { AlertDialog, RadioGroup } from 'radix-ui';
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MessageSquareQuote,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  formatReviewDate,
  reviewStatusClasses,
  reviewStatusLabels,
  type ReviewErrors,
  type ReviewValues,
} from '@/lib/review-utils';
import type { Review, ReviewStatus } from '@/types/review';

export function ReviewStars({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-0.5', className)}
      role="img"
      aria-label={`${rating} de 5 estrellas`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn(
            'size-4',
            i < Math.round(rating)
              ? 'fill-amber-400 text-amber-500'
              : 'text-neutral-300',
          )}
        />
      ))}
    </span>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <Badge variant="outline" className={reviewStatusClasses[status]}>
      {reviewStatusLabels[status]}
    </Badge>
  );
}

export function ReviewResponse({ review }: { review: Review }) {
  if (!review.admin_response) return null;
  return (
    <div className="rounded-lg border-l-2 border-cyan-600 bg-cyan-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-cyan-950">
        <MessageSquareQuote className="size-4 shrink-0" aria-hidden="true" />
        Respuesta de Cabañas Playa Terco
      </p>
      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-cyan-900">
        {review.admin_response}
      </p>
      {review.responded_at && (
        <p className="mt-2 text-xs text-cyan-800">
          {formatReviewDate(review.responded_at)}
        </p>
      )}
    </div>
  );
}

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children?: ReactNode;
}) {
  return children ? (
    <p id={id} role="alert" className="text-sm text-destructive">
      {children}
    </p>
  ) : null;
}

export function ReviewFields({
  values,
  onChange,
  errors,
  disabled,
}: {
  values: ReviewValues;
  onChange: (values: ReviewValues) => void;
  errors: ReviewErrors;
  disabled?: boolean;
}) {
  const id = useId();
  const ratings = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-5">
      <div className="space-y-2">
        <Label id={`${id}-rating-label`}>Tu calificación</Label>
        <RadioGroup.Root
          className="flex flex-wrap items-center gap-1"
          value={String(values.rating)}
          onValueChange={(rating) =>
            onChange({ ...values, rating: Number(rating) })
          }
          aria-labelledby={`${id}-rating-label`}
          aria-describedby={errors.rating ? `${id}-rating-error` : undefined}
          disabled={disabled}
        >
          {ratings.map((label, i) => (
            <RadioGroup.Item
              key={label}
              value={String(i + 1)}
              aria-label={`${i + 1} ${i === 0 ? 'estrella' : 'estrellas'}: ${label}`}
              className="flex size-11 items-center justify-center rounded-md outline-none hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-cyan-700 disabled:opacity-50"
            >
              <Star
                aria-hidden="true"
                className={cn(
                  'size-7',
                  i < values.rating
                    ? 'fill-amber-400 text-amber-500'
                    : 'text-neutral-300',
                )}
              />
            </RadioGroup.Item>
          ))}
          <span className="ml-2 text-sm text-neutral-600" aria-live="polite">
            {ratings[values.rating - 1]}
          </span>
        </RadioGroup.Root>
        <FieldError id={`${id}-rating-error`}>{errors.rating}</FieldError>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-title`}>
          Título{' '}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id={`${id}-title`}
          value={values.title}
          maxLength={255}
          onChange={(e) => onChange({ ...values, title: e.target.value })}
          placeholder="Lo que más disfrutaste de tu visita"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
        />
        <FieldError id={`${id}-title-error`}>{errors.title}</FieldError>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-body`}>Tu experiencia</Label>
        <Textarea
          id={`${id}-body`}
          rows={5}
          className="min-h-32"
          value={values.body}
          maxLength={5000}
          onChange={(e) => onChange({ ...values, body: e.target.value })}
          placeholder="Cuéntanos cómo fue tu estancia y qué recomendarías a otros viajeros."
          aria-invalid={Boolean(errors.body)}
          aria-describedby={`${id}-body-help${errors.body ? ` ${id}-body-error` : ''}`}
        />
        <div
          id={`${id}-body-help`}
          className="flex justify-between gap-2 text-xs text-muted-foreground"
        >
          <span>Mínimo 20 caracteres</span>
          <span>{values.body.length}/5000</span>
        </div>
        <FieldError id={`${id}-body-error`}>{errors.body}</FieldError>
      </div>
    </fieldset>
  );
}

export function ReviewPagination({
  page,
  lastPage,
  total,
  disabled,
  onChange,
}: {
  page: number;
  lastPage: number;
  total: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;
  return (
    <nav
      aria-label="Páginas de reseñas"
      className="flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-sm"
    >
      <p className="text-muted-foreground" aria-live="polite">
        Página {page} de {lastPage} · {total} reseñas
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={disabled || page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

export function ReviewDeleteDialog({
  open,
  onOpenChange,
  title,
  children,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      setError(
        'No pudimos eliminarlo. Inténtalo de nuevo; el contenido se mantiene hasta confirmar el borrado.',
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setError('');
          onOpenChange(value);
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content
          onOpenAutoFocus={() => {
            trigger.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(e) => {
            if (trigger.current?.isConnected) {
              e.preventDefault();
              trigger.current.focus();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (pending) e.preventDefault();
          }}
          className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 space-y-4 overflow-y-auto rounded-xl border bg-white p-6 shadow-xl"
        >
          <AlertDialog.Title className="text-lg font-semibold">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="break-words text-sm leading-6 text-muted-foreground">
            {children}
          </AlertDialog.Description>
          <FieldError>{error}</FieldError>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={pending}>
                Cancelar
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => void confirm()}
            >
              {pending && <LoaderCircle className="size-4 animate-spin" />}
              {pending ? 'Eliminando…' : 'Eliminar definitivamente'}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function ReviewLoadState({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-3 rounded-lg border bg-white p-10 text-sm text-muted-foreground"
      >
        <LoaderCircle className="size-5 animate-spin" />
        Cargando reseñas…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="space-y-3 rounded-lg border bg-white p-8 text-center"
      >
        <p>No pudimos cargar las reseñas.</p>
        <Button variant="outline" onClick={onRetry}>
          Volver a intentar
        </Button>
      </div>
    );
  return children;
}
