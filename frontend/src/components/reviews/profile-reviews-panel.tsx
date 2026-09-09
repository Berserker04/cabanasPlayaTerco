'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Edit,
  LoaderCircle,
  MessageSquareQuote,
  Save,
  Trash2,
  Upload,
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
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import { refreshReviews } from '@/lib/review-queries';
import {
  formatReviewDate,
  reviewEditNotice,
  reviewApiErrors,
  reviewPageAfterRemoval,
  validateReview,
  validateReviewImages,
  type ReviewErrors,
  type ReviewValues,
} from '@/lib/review-utils';
import type { Review, ReviewListResponse, ReviewMedia } from '@/types/review';
import { ReviewImagePicker, ReviewPhotos } from './review-photos';
import {
  FieldError,
  ReviewDeleteDialog,
  ReviewFields,
  ReviewLoadState,
  ReviewPagination,
  ReviewResponse,
  ReviewStars,
  ReviewStatusBadge,
} from './review-ui';

function OwnReviewCard({
  review,
  onDelete,
}: {
  review: Review;
  onDelete: (review: Review) => Promise<void>;
}) {
  const client = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<ReviewValues>({
    rating: review.rating,
    title: review.title ?? '',
    body: review.body,
  });
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [removingPhoto, setRemovingPhoto] = useState<ReviewMedia | null>(null);
  const sending = useRef(false);
  const editTrigger = useRef<HTMLButtonElement>(null);
  const removing = useMutation({
    mutationFn: async (photo: ReviewMedia) => {
      await fetchCsrfCookie();
      return api.delete(`/me/reviews/${review.id}/media/${photo.id}`);
    },
    onSuccess: async () => {
      toast.success('Foto eliminada.');
      await refreshReviews(client);
    },
  });
  const upload = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      files.forEach((file) => payload.append('images[]', file));
      await fetchCsrfCookie();
      return api.post(`/me/reviews/${review.id}/media`, payload);
    },
    onSuccess: async () => {
      setFiles([]);
      setError('');
      toast.success('Fotos guardadas.');
      await refreshReviews(client);
    },
    onError: (err) =>
      setError(
        err instanceof ApiError
          ? (reviewApiErrors(err.errors).images ?? err.message)
          : 'No pudimos subir las fotos. Conservamos tu selección para que lo intentes de nuevo.',
      ),
  });
  const update = useMutation({
    mutationFn: async () => {
      await fetchCsrfCookie();
      return api.put(`/me/reviews/${review.id}`, {
        ...values,
        title: values.title.trim(),
        body: values.body.trim(),
      });
    },
    onSuccess: async () => {
      toast.success('Reseña actualizada.');
      await refreshReviews(client);
      setEditing(false);
    },
    onError: (err) =>
      setErrors({
        ...(err instanceof ApiError ? reviewApiErrors(err.errors) : {}),
        form:
          err instanceof ApiError
            ? err.message
            : 'No pudimos guardar los cambios. Inténtalo de nuevo.',
      }),
  });
  const busy = upload.isPending || update.isPending || removing.isPending;
  async function submitPhotos() {
    if (sending.current || !files.length) return;
    const message = validateReviewImages(files, review.media?.length ?? 0);
    if (message) {
      setError(message);
      return;
    }
    sending.current = true;
    setError('');
    try {
      await upload.mutateAsync();
    } catch {
      /* Keep selected files for retry. */
    } finally {
      sending.current = false;
    }
  }
  async function submitEdit() {
    if (sending.current) return;
    const nextErrors = validateReview(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    sending.current = true;
    try {
      await update.mutateAsync();
    } catch {
      /* Keep the editable draft. */
    } finally {
      sending.current = false;
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <ReviewStatusBadge status={review.status} />
          <p className="mt-2 text-xs text-muted-foreground">
            Creada el {formatReviewDate(review.created_at)}
          </p>
        </div>
        <ReviewStars rating={review.rating} />
      </div>
      <div>
        {review.title && (
          <h3 className="mb-2 break-words text-lg font-semibold">
            {review.title}
          </h3>
        )}
        <p className="whitespace-pre-line break-words text-sm leading-7 text-neutral-700">
          {review.body}
        </p>
      </div>
      {review.status === 'pending' && (
        <p className="text-sm text-amber-800">
          Solo tú y el equipo pueden ver esta reseña mientras se revisa.
        </p>
      )}
      {review.status === 'rejected' && (
        <p className="text-sm text-red-800">
          El administrador ha rechazado esta reseña. Puedes editarla, pero
          seguirá oculta hasta que el administrador la vuelva a publicar.
        </p>
      )}
      <ReviewPhotos
        photos={review.media ?? []}
        onRemove={(id) =>
          setRemovingPhoto(
            review.media?.find((photo) => photo.id === id) ?? null,
          )
        }
        disabled={busy}
      />
      <ReviewResponse review={review} />
      <div className="space-y-3 border-t pt-4">
        <ReviewImagePicker
          files={files}
          onChange={(value) => {
            setFiles(value);
            setError('');
          }}
          existingCount={review.media?.length ?? 0}
          disabled={busy}
          error={error}
        />
        {files.length > 0 && (
          <>
            <p className="text-xs leading-5 text-muted-foreground">
              {reviewEditNotice(review.status)}
            </p>
            <Button
              disabled={busy}
              onClick={() => void submitPhotos()}
              className="bg-cyan-700 text-white hover:bg-cyan-800"
            >
              {upload.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {upload.isPending ? 'Subiendo fotos…' : 'Subir fotos'}
            </Button>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          ref={editTrigger}
          variant="outline"
          disabled={busy}
          onClick={() => {
            setValues({
              rating: review.rating,
              title: review.title ?? '',
              body: review.body,
            });
            setErrors({});
            setEditing(true);
          }}
        >
          <Edit className="size-4" />
          Editar reseña
        </Button>
        <DeleteOwnReviewButton
          review={review}
          disabled={busy}
          onDelete={onDelete}
        />
      </div>
      <Dialog
        open={editing}
        onOpenChange={(open) => {
          if (!update.isPending) setEditing(open);
        }}
      >
        <DialogContent
          closeLabel="Cerrar"
          className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl"
          showCloseButton={!update.isPending}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => editTrigger.current?.focus());
          }}
          onEscapeKeyDown={(e) => {
            if (update.isPending) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (update.isPending) e.preventDefault();
          }}
        >
          <DialogHeader className="pr-6">
            <DialogTitle>Editar reseña</DialogTitle>
            <DialogDescription>
              {reviewEditNotice(review.status)}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submitEdit();
            }}
            noValidate
          >
            <FieldError>{errors.form}</FieldError>
            <ReviewFields
              values={values}
              onChange={(value) => {
                setValues(value);
                setErrors({});
              }}
              errors={errors}
              disabled={update.isPending}
            />
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={update.isPending}
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Guardar cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ReviewDeleteDialog
        open={Boolean(removingPhoto)}
        onOpenChange={(open) => {
          if (!open) setRemovingPhoto(null);
        }}
        title="¿Eliminar esta foto?"
        onConfirm={async () => {
          if (removingPhoto) await removing.mutateAsync(removingPhoto);
        }}
      >
        Esta foto de «{review.title || 'tu reseña'}» se eliminará
        definitivamente. {reviewEditNotice(review.status)}
      </ReviewDeleteDialog>
    </>
  );
}

function DeleteOwnReviewButton({
  review,
  disabled,
  onDelete,
}: {
  review: Review;
  disabled: boolean;
  onDelete: (review: Review) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        className="text-destructive hover:text-destructive"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        Eliminar reseña
      </Button>
      <ReviewDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Eliminar tu reseña?"
        onConfirm={() => onDelete(review)}
      >
        Se eliminarán definitivamente «{review.title || 'tu reseña'}», sus fotos
        y la respuesta del alojamiento. Esta acción no se puede deshacer.
      </ReviewDeleteDialog>
    </>
  );
}

export function ProfileReviewsPanel() {
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['my-reviews', page],
    queryFn: () => api.get<ReviewListResponse>(`/me/reviews?page=${page}`),
    placeholderData: keepPreviousData,
  });
  const reviews = query.data?.data ?? [];
  async function removeReview(review: Review) {
    await fetchCsrfCookie();
    await api.delete(`/me/reviews/${review.id}`);
    setPage(reviewPageAfterRemoval(page, reviews.length));
    toast.success('Reseña eliminada.');
    await refreshReviews(client);
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Mis reseñas</h2>
        <Button asChild>
          <Link href="/resenas?escribir=1">Escribir reseña</Link>
        </Button>
      </div>
      <ReviewLoadState
        loading={query.isLoading}
        error={query.isError}
        onRetry={() => void query.refetch()}
      >
        {reviews.length ? (
          <div className="grid items-start gap-5 xl:grid-cols-2">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="min-w-0 space-y-5 rounded-xl border bg-white p-5 shadow-sm sm:p-6"
              >
                <OwnReviewCard review={review} onDelete={removeReview} />
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-10 text-center">
            <MessageSquareQuote className="mx-auto size-10 text-cyan-700" />
            <h3 className="mt-4 text-lg font-semibold">
              Todavía no has compartido tu experiencia
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Aquí verás tus reseñas, sus fotos y su estado de publicación.
            </p>
          </div>
        )}
        <ReviewPagination
          page={page}
          lastPage={query.data?.meta.last_page ?? 1}
          total={query.data?.meta.total ?? 0}
          disabled={query.isFetching}
          onChange={setPage}
        />
      </ReviewLoadState>
    </div>
  );
}
