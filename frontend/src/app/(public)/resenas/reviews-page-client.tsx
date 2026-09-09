'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MessageSquareQuote, Star } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { CreateReviewDialog } from '@/components/reviews/create-review-dialog';
import { ReviewPhotos } from '@/components/reviews/review-photos';
import {
  ReviewLoadState,
  ReviewPagination,
  ReviewResponse,
  ReviewStars,
} from '@/components/reviews/review-ui';
import { api } from '@/lib/api';
import { formatReviewDate } from '@/lib/review-utils';
import type { Review, ReviewListResponse } from '@/types/review';

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex min-w-0 flex-col gap-5 rounded-xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-900"
            aria-hidden="true"
          >
            {review.author_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="break-words font-semibold text-neutral-950">
              {review.author_name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatReviewDate(review.created_at)}
            </p>
          </div>
        </div>
        <ReviewStars rating={review.rating} />
      </div>
      <div>
        {review.title && (
          <h4 className="mb-2 break-words text-lg font-semibold text-neutral-950">
            {review.title}
          </h4>
        )}
        <p className="whitespace-pre-line break-words text-sm leading-7 text-neutral-700">
          {review.body}
        </p>
      </div>
      <ReviewPhotos photos={review.media ?? []} />
      <ReviewResponse review={review} />
    </article>
  );
}

export function ReviewsPageClient({
  initiallyOpen = false,
}: {
  initiallyOpen?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const heading = useRef<HTMLHeadingElement>(null);
  const query = useQuery({
    queryKey: ['reviews', page],
    queryFn: () =>
      api.get<ReviewListResponse>(`/reviews?page=${page}&per_page=8`),
    retry: 1,
    placeholderData: keepPreviousData,
  });
  const reviews = query.data?.data ?? [];
  const meta = query.data?.meta;
  const total = meta?.total ?? 0;
  const average = meta?.average_rating ?? 0;
  return (
    <>
      <section className="relative isolate overflow-hidden bg-cyan-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/95 via-cyan-950/80 to-cyan-950/50" />
        <div className="container relative mx-auto px-4 py-10 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Experiencias de viajeros
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Playa Terco, en sus palabras
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-cyan-50 sm:text-base">
            Descubre lo que otros viajeros disfrutaron de su estancia, a través
            de sus reseñas y fotografías.
          </p>
        </div>
      </section>
      <section className="bg-stone-50/60 py-8 sm:py-10">
        <div className="container mx-auto space-y-7 px-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2
                ref={heading}
                tabIndex={-1}
                className="text-2xl font-bold tracking-tight outline-none"
              >
                Reseñas de nuestros viajeros
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Experiencias y fotografías compartidas por nuestros viajeros.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isAuthenticated && (
                <Button asChild variant="outline">
                  <Link href="/perfil?tab=resenas">Mis reseñas</Link>
                </Button>
              )}
              <CreateReviewDialog initiallyOpen={initiallyOpen} />
            </div>
          </div>
          <ReviewLoadState
            loading={query.isLoading}
            error={query.isError}
            onRetry={() => void query.refetch()}
          >
            {total > 0 ? (
              <>
                <div className="grid gap-6 rounded-xl border bg-white p-5 sm:grid-cols-[1fr_1fr] sm:p-6 lg:grid-cols-[1fr_1.2fr_1fr]">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">
                      Calificación de los viajeros
                    </p>
                    <div className="mt-2 flex items-center gap-4">
                      <span className="text-4xl font-bold tracking-tight">
                        {average.toFixed(1)}
                        <span className="ml-1 text-lg font-normal text-muted-foreground">
                          / 5
                        </span>
                      </span>
                      <ReviewStars rating={average} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {total}{' '}
                      {total === 1 ? 'reseña publicada' : 'reseñas publicadas'}
                    </p>
                  </div>
                  <div
                    className="space-y-2"
                    aria-label="Distribución de calificaciones"
                  >
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = meta?.rating_counts?.[String(rating)] ?? 0;
                      return (
                        <div
                          key={rating}
                          className="grid grid-cols-[28px_1fr_30px] items-center gap-3 text-xs"
                          aria-label={`${rating} estrellas: ${count} reseñas`}
                        >
                          <span className="flex items-center gap-1">
                            {rating}
                            <Star
                              className="size-3 fill-amber-400 text-amber-500"
                              aria-hidden="true"
                            />
                          </span>
                          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className="h-full rounded-full bg-amber-400"
                              style={{ width: `${(count / total) * 100}%` }}
                            />
                          </div>
                          <span className="text-right text-muted-foreground">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="hidden self-center border-l pl-6 text-sm leading-7 text-neutral-600 lg:block">
                    Cada experiencia te acerca al lugar. Abre las fotos para ver
                    los detalles de cada visita.
                  </p>
                </div>
                <div
                  className="grid items-start gap-5 lg:grid-cols-2"
                  aria-busy={query.isFetching}
                >
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
                <ReviewPagination
                  page={page}
                  lastPage={meta?.last_page ?? 1}
                  total={total}
                  disabled={query.isFetching}
                  onChange={(next) => {
                    setPage(next);
                    heading.current?.scrollIntoView({ block: 'start' });
                    heading.current?.focus({ preventScroll: true });
                  }}
                />
              </>
            ) : (
              <div className="rounded-xl border bg-white px-6 py-12 text-center">
                <MessageSquareQuote
                  className="mx-auto size-10 text-cyan-700"
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-lg font-semibold">
                  La próxima historia puede ser la tuya
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Aún no hay reseñas publicadas. Si ya nos visitaste, comparte
                  tu experiencia con «Escribir reseña».
                </p>
              </div>
            )}
          </ReviewLoadState>
        </div>
      </section>
    </>
  );
}
