'use client';

import { useEffect, useRef, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  CheckCircle2,
  Eye,
  LoaderCircle,
  MessageSquareQuote,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ReviewPhotos } from '@/components/reviews/review-photos';
import {
  FieldError,
  ReviewDeleteDialog,
  ReviewLoadState,
  ReviewPagination,
  ReviewResponse,
  ReviewStars,
  ReviewStatusBadge,
} from '@/components/reviews/review-ui';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import { refreshReviews } from '@/lib/review-queries';
import { formatReviewDate, reviewPageAfterRemoval } from '@/lib/review-utils';
import type { Review, ReviewListResponse, ReviewStatus } from '@/types/review';

type UpdateReview = { review: Review; status: ReviewStatus; response?: string };

export default function AdminReviewsPage() {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    page: 1,
  });
  const [selected, setSelected] = useState<Review | null>(null);
  const [status, setStatus] = useState<ReviewStatus>('approved');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Review | null>(null);
  const editingTrigger = useRef<HTMLButtonElement | null>(null);
  const saving = useRef(false);
  useEffect(() => {
    const timeout = setTimeout(
      () =>
        setFilters((current) =>
          current.search === search.trim()
            ? current
            : { ...current, search: search.trim(), page: 1 },
        ),
      300,
    );
    return () => clearTimeout(timeout);
  }, [search]);

  const query = useQuery({
    queryKey: ['admin-reviews', filters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        per_page: '20',
      });
      if (filters.search) params.set('search', filters.search);
      if (filters.status !== 'all') params.set('status', filters.status);
      return api.get<ReviewListResponse>(`/admin/reviews?${params}`);
    },
    retry: 1,
    placeholderData: keepPreviousData,
  });
  const reviews = query.data?.data ?? [];
  const meta = query.data?.meta;
  const counts = meta?.status_counts;
  const update = useMutation({
    mutationFn: async (values: UpdateReview) => {
      await fetchCsrfCookie();
      return api.put(`/admin/reviews/${values.review.id}`, {
        status: values.status,
        ...(values.response !== undefined
          ? { admin_response: values.response.trim() }
          : {}),
      });
    },
    onSuccess: async (_result, values) => {
      if (filters.status !== 'all' && filters.status !== values.status) {
        setFilters((current) => ({
          ...current,
          page: reviewPageAfterRemoval(current.page, reviews.length),
        }));
      }
      toast.success('Reseña actualizada.');
      await refreshReviews(client);
      setSelected(null);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? (err.errors?.admin_response?.[0] ?? err.message)
          : 'No pudimos guardar los cambios. Inténtalo de nuevo.';
      setError(message);
      toast.error('No pudimos actualizar la reseña', { description: message });
    },
  });
  const remove = useMutation({
    mutationFn: async (review: Review) => {
      await fetchCsrfCookie();
      return api.delete(`/admin/reviews/${review.id}`);
    },
    onSuccess: async () => {
      setFilters((current) => ({
        ...current,
        page: reviewPageAfterRemoval(current.page, reviews.length),
      }));
      toast.success('Reseña eliminada.');
      await refreshReviews(client);
    },
  });
  const busy = update.isPending || remove.isPending || query.isPlaceholderData;
  async function save(values: UpdateReview) {
    if (saving.current) return;
    saving.current = true;
    setError('');
    try {
      await update.mutateAsync(values);
    } catch {
      /* The current view displays the error. */
    } finally {
      saving.current = false;
    }
  }
  function openDetail(review: Review, trigger: HTMLButtonElement) {
    editingTrigger.current = trigger;
    setSelected(review);
    setStatus(review.status);
    setResponse(review.admin_response ?? '');
    setError('');
  }
  function actions(review: Review) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={(e) => openDetail(review, e.currentTarget)}
        >
          <Eye className="size-4" />
          Ver detalle
        </Button>
        <Button
          size="icon"
          variant="outline"
          disabled={busy || review.status === 'approved'}
          aria-label={`Aprobar reseña de ${review.author_name}`}
          title="Aprobar reseña"
          onClick={() => void save({ review, status: 'approved' })}
        >
          <CheckCircle2 className="size-4 text-emerald-700" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          disabled={busy || review.status === 'rejected'}
          aria-label={`Rechazar reseña de ${review.author_name}`}
          title="Rechazar reseña"
          onClick={() => void save({ review, status: 'rejected' })}
        >
          <XCircle className="size-4 text-red-700" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          disabled={busy}
          aria-label={`Eliminar reseña de ${review.author_name}`}
          title="Eliminar reseña"
          onClick={() => setDeleting(review)}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    );
  }
  function excerpt(review: Review) {
    return (
      <div className="space-y-3">
        <div>
          <p className="break-words font-medium">
            {review.title || 'Sin título'}
          </p>
          <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
            {review.body}
          </p>
        </div>
        <ReviewPhotos photos={review.media ?? []} compact />
        {review.admin_response && (
          <p className="flex items-center gap-1.5 text-xs text-cyan-800">
            <MessageSquareQuote className="size-3.5" />
            Con respuesta del alojamiento
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
          Moderación
        </p>
        <h1 className="mt-2 text-2xl font-bold">Reseñas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Las reseñas se publican automáticamente. Puedes responderlas, rechazar
          contenido ofensivo o eliminarlo.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          [
            'Total de reseñas',
            counts ? counts.pending + counts.approved + counts.rejected : '—',
            'text-neutral-950',
          ],
          ['Rechazadas', counts?.rejected ?? '—', 'text-red-700'],
          ['Publicadas', counts?.approved ?? '—', 'text-emerald-700'],
          [
            'Promedio general',
            meta?.average_rating?.toFixed(1) ?? '—',
            'text-neutral-950',
          ],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-between gap-4 rounded-xl border bg-white p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="w-full space-y-2 sm:max-w-sm">
            <Label htmlFor="review-search">Buscar reseñas</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="review-search"
                placeholder="Autor, título o comentario"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-status-filter">Estado</Label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  status: value,
                  page: 1,
                }))
              }
            >
              <SelectTrigger
                id="review-status-filter"
                className="w-full sm:w-48"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="approved">Publicadas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {query.isFetching && <LoaderCircle className="size-4 animate-spin" />}
          {meta
            ? `${meta.total} ${meta.total === 1 ? 'resultado' : 'resultados'}`
            : 'Cargando…'}
        </p>
      </div>
      <ReviewLoadState
        loading={query.isLoading}
        error={query.isError}
        onRetry={() => void query.refetch()}
      >
        {reviews.length ? (
          <>
            <div className="hidden overflow-hidden rounded-xl border bg-white xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Viajero</TableHead>
                    <TableHead>Reseña y fotos</TableHead>
                    <TableHead>Calificación / Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="max-w-56 whitespace-normal align-top">
                        <p className="break-words font-medium">
                          {review.author_name}
                        </p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {review.author_email}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatReviewDate(review.created_at)}
                        </p>
                      </TableCell>
                      <TableCell className="w-[35%] max-w-md whitespace-normal align-top py-4">
                        {excerpt(review)}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-3">
                          <ReviewStars rating={review.rating} />
                          <div>
                            <ReviewStatusBadge status={review.status} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {actions(review)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid items-start gap-4 lg:grid-cols-2 xl:hidden">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="min-w-0 space-y-4 rounded-xl border bg-white p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <ReviewStatusBadge status={review.status} />
                    <ReviewStars rating={review.rating} />
                  </div>
                  <div>
                    <p className="break-words font-semibold">
                      {review.author_name}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">
                      {review.author_email}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatReviewDate(review.created_at)}
                    </p>
                  </div>
                  {excerpt(review)}
                  <div className="border-t pt-4">{actions(review)}</div>
                </article>
              ))}
            </div>
            <ReviewPagination
              page={filters.page}
              lastPage={meta?.last_page ?? 1}
              total={meta?.total ?? 0}
              disabled={query.isFetching}
              onChange={(page) =>
                setFilters((current) => ({ ...current, page }))
              }
            />
          </>
        ) : (
          <div className="space-y-3 rounded-xl border bg-white p-10 text-center">
            <MessageSquareQuote className="mx-auto size-8 text-cyan-700" />
            <h2 className="font-semibold">
              {filters.search || filters.status !== 'all'
                ? 'No encontramos reseñas con estos filtros'
                : 'Todavía no hay reseñas'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filters.search || filters.status !== 'all'
                ? 'Prueba otra búsqueda o consulta todos los estados.'
                : 'Las experiencias que envíen los viajeros aparecerán aquí.'}
            </p>
            {(filters.search || filters.status !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setFilters({ search: '', status: 'all', page: 1 });
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </ReviewLoadState>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !update.isPending) setSelected(null);
        }}
      >
        <DialogContent
          closeLabel="Cerrar"
          className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl"
          showCloseButton={!update.isPending}
          onEscapeKeyDown={(e) => {
            if (update.isPending) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (update.isPending) e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            requestAnimationFrame(() => editingTrigger.current?.focus());
          }}
        >
          <DialogHeader className="pr-6">
            <DialogTitle>Detalle de la reseña</DialogTitle>
            <DialogDescription>
              Revisa el comentario y las fotos, cambia su estado o responde al
              viajero.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="space-y-4 border-b pb-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="break-words font-semibold">
                      {selected.author_name}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">
                      {selected.author_email} ·{' '}
                      {formatReviewDate(selected.created_at)}
                    </p>
                  </div>
                  <ReviewStars rating={selected.rating} />
                </div>
                <ReviewStatusBadge status={selected.status} />
                {selected.title && (
                  <h3 className="break-words text-lg font-semibold">
                    {selected.title}
                  </h3>
                )}
                <p className="whitespace-pre-line break-words text-sm leading-7">
                  {selected.body}
                </p>
                <ReviewPhotos photos={selected.media ?? []} />
                <ReviewResponse review={selected} />
              </div>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (response.trim().length > 2000) {
                    setError(
                      'La respuesta no puede superar los 2000 caracteres.',
                    );
                    return;
                  }
                  void save({ review: selected, status, response });
                }}
              >
                <FieldError>{error}</FieldError>
                <div className="space-y-2">
                  <Label htmlFor="moderation-status">
                    Estado de publicación
                  </Label>
                  <Select
                    value={status}
                    disabled={update.isPending}
                    onValueChange={(value) => setStatus(value as ReviewStatus)}
                  >
                    <SelectTrigger id="moderation-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        Pendiente de revisión
                      </SelectItem>
                      <SelectItem value="approved">Publicada</SelectItem>
                      <SelectItem value="rejected">Rechazada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-response">
                    Respuesta del alojamiento{' '}
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </Label>
                  <Textarea
                    id="admin-response"
                    rows={4}
                    className="min-h-28"
                    value={response}
                    maxLength={2000}
                    disabled={update.isPending}
                    onChange={(e) => {
                      setResponse(e.target.value);
                      setError('');
                    }}
                    aria-describedby="admin-response-help"
                    placeholder="Agradece la visita o responde a su experiencia…"
                  />
                  <div
                    id="admin-response-help"
                    className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"
                  >
                    <span>
                      La respuesta será pública cuando la reseña esté publicada.
                    </span>
                    <span>{response.length}/2000</span>
                  </div>
                </div>
                <div className="flex justify-end gap-3 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={update.isPending}
                    onClick={() => setSelected(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-cyan-700 text-white hover:bg-cyan-800"
                    disabled={update.isPending}
                  >
                    {update.isPending && (
                      <LoaderCircle className="size-4 animate-spin" />
                    )}
                    {update.isPending ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
      <ReviewDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="¿Eliminar esta reseña?"
        onConfirm={async () => {
          if (deleting) await remove.mutateAsync(deleting);
        }}
      >
        Se eliminará definitivamente «{deleting?.title || 'Sin título'}», de{' '}
        {deleting?.author_name}, junto con sus fotos y la respuesta del
        alojamiento. Esta acción no se puede deshacer.
      </ReviewDeleteDialog>
    </div>
  );
}
