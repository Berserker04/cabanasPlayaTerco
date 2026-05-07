'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Camera,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MessageSquareQuote,
  Send,
  Star,
} from 'lucide-react';
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { Review, ReviewListResponse } from '@/types/review';

const heroImage = '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg';

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

function Stars({ rating, className = 'h-4 w-4' }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, index) => {
        const active = index < rating;

        return (
          <Star
            key={index}
            className={`${className} ${active ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}`}
            aria-hidden="true"
          />
        );
      })}
    </span>
  );
}

function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificacion">
      {Array.from({ length: 5 }, (_, index) => {
        const rating = index + 1;

        return (
          <button
            key={rating}
            type="button"
            className="rounded-md p-1 text-amber-400 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
            onClick={() => onChange(rating)}
            aria-label={`${rating} estrellas`}
            aria-checked={value === rating}
            role="radio"
          >
            <Star
              className={`h-7 w-7 ${rating <= value ? 'fill-amber-400' : 'fill-transparent text-neutral-300'}`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const photos = review.media ?? [];

  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-900">
              {review.author_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-neutral-950">{review.author_name}</h3>
              <p className="text-xs text-neutral-500">{formatDate(review.created_at)}</p>
            </div>
          </div>
        </div>
        <Stars rating={review.rating} />
      </div>

      {review.title ? (
        <h4 className="mt-5 text-lg font-semibold tracking-normal text-neutral-950">{review.title}</h4>
      ) : null}
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-neutral-700">{review.body}</p>

      {photos.length > 0 ? (
        <div className="mt-5 grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <img
              key={photo.id}
              src={photo.url}
              alt={photo.alt ?? 'Foto de resena'}
              className="aspect-square rounded-md object-cover"
            />
          ))}
        </div>
      ) : null}

      {review.admin_response ? (
        <div className="mt-5 rounded-lg border border-cyan-100 bg-cyan-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-950">
            <MessageSquareQuote className="h-4 w-4" aria-hidden="true" />
            Respuesta de Cabanas Playa Terco
          </div>
          <p className="whitespace-pre-line text-sm leading-6 text-cyan-900">{review.admin_response}</p>
        </div>
      ) : null}
    </article>
  );
}

function ReviewForm() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      payload.append('rating', String(rating));
      payload.append('body', body.trim());

      if (title.trim()) {
        payload.append('title', title.trim());
      }

      images.forEach((file) => payload.append('images[]', file));

      await fetchCsrfCookie();

      return api.post<ApiResponse<Review>>('/reviews', payload);
    },
    onSuccess: (response) => {
      setTitle('');
      setBody('');
      setImages([]);
      setRating(5);
      setFormError(null);
      toast.success('Resena enviada', {
        description: response.message ?? 'La revisaremos antes de publicarla.',
      });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
        toast.error('No pudimos enviar la resena', { description: error.message });
        return;
      }

      setFormError('No pudimos enviar la resena. Intentalo de nuevo.');
    },
  });

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).slice(0, 3);
    setImages(selected);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (body.trim().length < 20) {
      setFormError('La resena debe tener al menos 20 caracteres.');
      return;
    }

    if (images.length > 3) {
      setFormError('Solo puedes subir hasta 3 fotos.');
      return;
    }

    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold text-neutral-950">Comparte tu experiencia</p>
        <p className="mt-1 text-sm text-neutral-600">
          Publicaremos tu resena despues de revisarla. Se enviara como {user?.name}.
        </p>
      </div>

      {formError ? (
        <div className="mb-4 flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{formError}</p>
        </div>
      ) : null}

      <div className="grid gap-5">
        <div className="space-y-2">
          <Label>Calificacion</Label>
          <RatingInput value={rating} onChange={setRating} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-title">Titulo</Label>
          <Input
            id="review-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={255}
            placeholder="Una estancia frente al Pacifico"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-body">Resena</Label>
          <Textarea
            id="review-body"
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Cuenta que fue especial, como estuvo la atencion o que recomendarias a otros huespedes."
          />
          <div className="flex justify-between gap-3 text-xs text-muted-foreground">
            <span>Minimo 20 caracteres</span>
            <span>{body.length}/5000</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-images">Fotos</Label>
          <Input
            id="review-images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFiles}
          />
          <p className="text-xs text-muted-foreground">Puedes subir hasta 3 imagenes.</p>
        </div>
      </div>

      <Button type="submit" className="mt-6 bg-cyan-700 text-white hover:bg-cyan-800" disabled={mutation.isPending}>
        {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar resena
      </Button>
    </form>
  );
}

export function ReviewsPageClient() {
  const { isAuthenticated, isLoading } = useAuth();
  const [page, setPage] = useState(1);

  const reviewsQuery = useQuery({
    queryKey: ['reviews', page],
    queryFn: () => api.get<ReviewListResponse>(`/reviews?page=${page}&per_page=9`),
    retry: 1,
  });

  const reviews = useMemo(() => reviewsQuery.data?.data ?? [], [reviewsQuery.data?.data]);
  const meta = reviewsQuery.data?.meta;
  const average = meta?.average_rating ?? 0;
  const total = meta?.total ?? 0;
  const ratingCounts = meta?.rating_counts ?? {};
  const lastPage = meta?.last_page ?? 1;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,29,27,0.92),rgba(5,29,27,0.62),rgba(5,29,27,0.28))]" />
        <div className="container relative mx-auto px-4 py-16 sm:py-20">
          <Badge className="mb-5 bg-cyan-400 text-cyan-950 hover:bg-cyan-300">Resenas verificadas</Badge>
          <h1 className="max-w-3xl text-3xl font-bold tracking-normal sm:text-5xl">
            Lo que cuentan quienes ya descansaron en Playa Terco
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-cyan-50">
            Lee experiencias reales y, si ya tienes cuenta, comparte la tuya para ayudar a otros viajeros.
          </p>
        </div>
      </section>

      <section className="bg-white py-10 sm:py-12">
        <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-lg border bg-stone-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Promedio</p>
              <div className="mt-3 flex items-end gap-3">
                <span className="text-5xl font-bold text-neutral-950">{average.toFixed(1)}</span>
                <span className="pb-2 text-sm text-neutral-500">/ 5</span>
              </div>
              <div className="mt-3">
                <Stars rating={Math.round(average)} className="h-5 w-5" />
              </div>
              <p className="mt-2 text-sm text-neutral-600">{total} resenas publicadas</p>

              <div className="mt-5 space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = ratingCounts[String(rating)] ?? 0;
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

                  return (
                    <div key={rating} className="grid grid-cols-[52px_1fr_36px] items-center gap-2 text-xs">
                      <span>{rating} est.</span>
                      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                        <div className="h-full bg-amber-400" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-right text-neutral-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {isLoading ? null : isAuthenticated ? (
              <ReviewForm />
            ) : (
              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-950">Quieres dejar una resena?</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Primero crea una cuenta o inicia sesion. Tu registro tambien te dara acceso a tu perfil y,
                  mas adelante, a crear entradas del blog.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <Button asChild className="bg-cyan-700 text-white hover:bg-cyan-800">
                    <Link href="/login?next=/resenas">Iniciar sesion</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/registro?next=/resenas">Registrarme</Link>
                  </Button>
                </div>
              </div>
            )}
          </aside>

          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
                  Comentarios recientes
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-neutral-950">Resenas publicadas</h2>
              </div>
              {reviewsQuery.isFetching ? <LoaderCircle className="h-5 w-5 animate-spin text-cyan-700" /> : null}
            </div>

            {reviewsQuery.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
                No pudimos cargar las resenas ahora.
              </div>
            ) : reviews.length > 0 ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-stone-50 p-8 text-center">
                <Camera className="mx-auto h-10 w-10 text-cyan-700" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-neutral-950">Aun no hay resenas publicadas</h3>
                <p className="mt-2 text-sm text-neutral-600">Se mostraran aqui cuando el equipo las apruebe.</p>
              </div>
            )}

            {lastPage > 1 ? (
              <div className="mt-6 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Pagina {page} de {lastPage}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= lastPage}
                  onClick={() => setPage((value) => Math.min(lastPage, value + 1))}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
