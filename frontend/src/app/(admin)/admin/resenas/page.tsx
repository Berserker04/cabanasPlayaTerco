'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  LoaderCircle,
  MessageSquareReply,
  Search,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import type { Review, ReviewListResponse, ReviewStatus } from '@/types/review';

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : '';
}

function formatDate(value?: string | null) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function statusClass(status: ReviewStatus) {
  return {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rejected: 'border-red-200 bg-red-50 text-red-800',
  }[status];
}

function statusLabel(status: ReviewStatus) {
  return {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  }[status];
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index < rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReviewStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [dialogStatus, setDialogStatus] = useState<ReviewStatus>('approved');
  const [responseText, setResponseText] = useState('');

  const reviewsQuery = useQuery({
    queryKey: ['admin-reviews', status, search],
    queryFn: () =>
      api.get<ReviewListResponse>(
        `/admin/reviews${buildQuery({
          status: status === 'all' ? undefined : status,
          search,
          per_page: 50,
        })}`,
      ),
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      review,
      nextStatus,
      adminResponse,
    }: {
      review: Review;
      nextStatus: ReviewStatus;
      adminResponse?: string;
    }) => {
      await fetchCsrfCookie();

      return api.put<{ data: Review; message: string }>(`/admin/reviews/${review.id}`, {
        status: nextStatus,
        admin_response: adminResponse ?? review.admin_response ?? '',
      });
    },
    onSuccess: (response) => {
      setSelectedReview(null);
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
    },
    onError: (error) => {
      toast.error('No pudimos actualizar la resena', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (review: Review) => {
      await fetchCsrfCookie();
      return api.delete<{ message: string }>(`/admin/reviews/${review.id}`);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
    },
    onError: (error) => {
      toast.error('No pudimos eliminar la resena', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const reviews = reviewsQuery.data?.data ?? [];
  const meta = reviewsQuery.data?.meta;
  const counts = meta?.status_counts ?? { pending: 0, approved: 0, rejected: 0 };

  function openResponseDialog(review: Review) {
    setSelectedReview(review);
    setDialogStatus(review.status === 'rejected' ? 'rejected' : 'approved');
    setResponseText(review.admin_response ?? '');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Moderacion</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-neutral-950">Resenas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aprueba, rechaza, responde y elimina resenas enviadas por usuarios registrados.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[220px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as ReviewStatus | 'all')}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="approved">Aprobadas</SelectItem>
              <SelectItem value="rejected">Rechazadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total</p>
          <p className="mt-2 text-3xl font-bold">{meta?.total ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pendientes</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{counts.pending}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Aprobadas</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{counts.approved}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Promedio</p>
          <p className="mt-2 text-3xl font-bold">{(meta?.average_rating ?? 0).toFixed(1)}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Autor</TableHead>
              <TableHead>Resena</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviewsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="align-top">
                    <div className="font-medium">{review.author_name}</div>
                    <div className="text-xs text-muted-foreground">{review.author_email}</div>
                  </TableCell>
                  <TableCell className="max-w-[360px] whitespace-normal align-top">
                    <div className="font-medium">{review.title || 'Sin titulo'}</div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{review.body}</p>
                    {(review.media ?? []).length > 0 ? (
                      <div className="mt-2 text-xs text-cyan-700">{review.media?.length} foto(s)</div>
                    ) : null}
                    {review.admin_response ? (
                      <div className="mt-2 rounded-md bg-cyan-50 p-2 text-xs leading-5 text-cyan-900">
                        {review.admin_response}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <Stars rating={review.rating} />
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline" className={statusClass(review.status)}>
                      {statusLabel(review.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">{formatDate(review.created_at)}</TableCell>
                  <TableCell className="align-top">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label="Aprobar"
                        onClick={() => updateMutation.mutate({ review, nextStatus: 'approved' })}
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label="Rechazar"
                        onClick={() => updateMutation.mutate({ review, nextStatus: 'rejected' })}
                      >
                        <XCircle className="h-4 w-4 text-red-700" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label="Responder"
                        onClick={() => openResponseDialog(review)}
                      >
                        <MessageSquareReply className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="destructive"
                        aria-label="Eliminar"
                        onClick={() => deleteMutation.mutate(review)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No hay resenas con estos filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(selectedReview)} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Responder resena</DialogTitle>
            <DialogDescription>
              La respuesta se mostrara publicamente cuando la resena este aprobada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={dialogStatus} onValueChange={(value) => setDialogStatus(value as ReviewStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Aprobada</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-response">Respuesta publica</Label>
              <Textarea
                id="admin-response"
                rows={6}
                value={responseText}
                onChange={(event) => setResponseText(event.target.value)}
                placeholder="Gracias por compartir tu experiencia..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedReview(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-cyan-700 text-white hover:bg-cyan-800"
              disabled={!selectedReview || updateMutation.isPending}
              onClick={() => {
                if (selectedReview) {
                  updateMutation.mutate({
                    review: selectedReview,
                    nextStatus: dialogStatus,
                    adminResponse: responseText,
                  });
                }
              }}
            >
              {updateMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageSquareReply className="h-4 w-4" />}
              Guardar respuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
