'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/types/api';
import { commentStatusLabels, postStatusLabels } from '@/lib/blog-utils';
import type { PostStatus } from '@/types/blog';

export function BlogStatus({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={
        ['published', 'approved'].includes(status)
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : ['draft', 'pending'].includes(status)
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : status === 'rejected'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'bg-neutral-100 text-neutral-700'
      }
    >
      {postStatusLabels[status as PostStatus] ??
        commentStatusLabels[status] ??
        status}
    </Badge>
  );
}

export function BlogPagination({
  meta,
  page,
  onPage,
  busy,
}: {
  meta?: PaginationMeta;
  page: number;
  onPage: (page: number) => void;
  busy?: boolean;
}) {
  if (!meta) return null;
  const last = Math.max(1, meta.last_page);
  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 py-3"
    >
      <p className="text-sm text-muted-foreground">
        {meta.total} {meta.total === 1 ? 'resultado' : 'resultados'} · Página{' '}
        {page} de {last}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || page >= last}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}

export function BlogLoading() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 rounded-lg border bg-white p-8 text-sm text-muted-foreground"
    >
      <LoaderCircle className="size-5 animate-spin" />
      Cargando publicaciones…
    </div>
  );
}

export function BlogError({
  retry,
  message = 'No pudimos cargar la información.',
}: {
  retry: () => void;
  message?: string;
}) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-5 text-red-900"
    >
      <p>{message}</p>
      <Button variant="outline" onClick={retry}>
        Reintentar
      </Button>
    </div>
  );
}

export function useBlogSearch(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

export function useBlogFilters() {
  const params = useSearchParams();
  const pathname = usePathname();
  function update(values: Record<string, string | number | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (
        value === null ||
        value === '' ||
        value === 'all' ||
        (value === 1 && /(^|_)page$/.test(key))
      )
        next.delete(key);
      else next.set(key, String(value));
    }
    window.history.replaceState(
      null,
      '',
      pathname + (next.size ? `?${next}` : ''),
    );
  }
  return { params, update };
}

export function useBlogDialogFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      opener.current = document.activeElement as HTMLElement | null;
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      requestAnimationFrame(() => {
        if (
          opener.current?.isConnected &&
          opener.current !== document.body &&
          opener.current.getClientRects().length &&
          !opener.current.matches(':disabled')
        )
          opener.current.focus();
        else {
          const fallback =
            document.querySelector<HTMLElement>('[role="tabpanel"] button') ??
            document.querySelector<HTMLElement>(
              'main button:not([role="tab"])',
            );
          fallback?.focus();
        }
      });
    },
  };
}

export type BlogAction = {
  title: string;
  description: string;
  label: string;
  destructive?: boolean;
  run: () => Promise<unknown>;
};
export function BlogActionDialog({
  action,
  onClose,
}: {
  action: BlogAction | null;
  onClose: () => void;
}) {
  const focus = useBlogDialogFocus();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function run() {
    if (!action || pending) return;
    setPending(true);
    setError('');
    try {
      await action.run();
      onClose();
    } catch (error) {
      setError(
        error instanceof ApiError
          ? Object.values(error.errors ?? {})
              .flat()
              .join(' ') || error.message
          : 'No pudimos completar la acción. Reintenta.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog
      open={!!action}
      onOpenChange={(open) => {
        if (!open && !pending) {
          setError('');
          onClose();
        }
      }}
    >
      <DialogContent
        {...focus}
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault();
        }}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <DialogTitle>{action?.title}</DialogTitle>
        <DialogDescription className="whitespace-pre-line break-words leading-6">
          {action?.description}
        </DialogDescription>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setError('');
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button
            variant={action?.destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={() => void run()}
          >
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            {pending ? 'Procesando…' : action?.label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
