'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LoaderCircle, PenLine, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import { refreshReviews } from '@/lib/review-queries';
import {
  reviewApiErrors,
  validateReview,
  validateReviewImages,
  type ReviewErrors,
  type ReviewValues,
} from '@/lib/review-utils';
import { FieldError, ReviewFields } from './review-ui';
import { ReviewImagePicker } from './review-photos';
import type { Review } from '@/types/review';

export function CreateReviewDialog({
  initiallyOpen = false,
}: {
  initiallyOpen?: boolean;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const client = useQueryClient();
  const [open, setOpen] = useState(initiallyOpen);
  const [values, setValues] = useState<ReviewValues>({
    rating: 5,
    title: '',
    body: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [sent, setSent] = useState(false);
  const sending = useRef(false);
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      payload.append('rating', String(values.rating));
      payload.append('title', values.title.trim());
      payload.append('body', values.body.trim());
      files.forEach((file) => payload.append('images[]', file));
      await fetchCsrfCookie();
      return api.post<{ data: Review }>('/reviews', payload);
    },
    onSuccess: async () => {
      setSent(true);
      setValues({ rating: 5, title: '', body: '' });
      setFiles([]);
      await refreshReviews(client);
    },
    onError: (error) =>
      setErrors({
        ...(error instanceof ApiError ? reviewApiErrors(error.errors) : {}),
        form:
          error instanceof ApiError
            ? error.message
            : 'No pudimos enviar la reseña. Revisa tu conexión e inténtalo de nuevo.',
      }),
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const nextErrors = validateReview(values);
    const imageError = validateReviewImages(files);
    if (imageError) nextErrors.images = imageError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    sending.current = true;
    try {
      await mutation.mutateAsync();
    } catch {
      /* The form displays the error and keeps the draft. */
    } finally {
      sending.current = false;
    }
  }

  const next = encodeURIComponent('/resenas?escribir=1');
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!mutation.isPending) {
          setOpen(value);
          if (value) setSent(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-cyan-700 text-white hover:bg-cyan-800">
          <PenLine className="size-4" />
          Escribir reseña
        </Button>
      </DialogTrigger>
      <DialogContent
        closeLabel="Cerrar"
        className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl"
        showCloseButton={!mutation.isPending}
        onInteractOutside={(e) => {
          if (mutation.isPending) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (mutation.isPending) e.preventDefault();
        }}
      >
        <DialogHeader className="pr-6">
          <DialogTitle>
            {sent ? 'Gracias por compartir tu experiencia' : 'Escribir reseña'}
          </DialogTitle>
          <DialogDescription>
            {sent
              ? 'Tu reseña ya está publicada.'
              : 'Ayuda a otros viajeros a conocer Playa Terco.'}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p role="status" className="py-8 text-center">
            Cargando tu cuenta…
          </p>
        ) : !isAuthenticated ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              Inicia sesión o crea una cuenta para compartir tu experiencia y
              añadir hasta 3 fotos. Regresarás aquí al terminar.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/login?next=${next}`}>Iniciar sesión</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/registro?next=${next}`}>Crear cuenta</Link>
              </Button>
            </div>
          </div>
        ) : sent ? (
          <div className="space-y-5 py-4">
            <CheckCircle2
              className="size-10 text-emerald-600"
              aria-hidden="true"
            />
            <p className="text-sm leading-6 text-muted-foreground">
              Tu comentario y tus fotos ya están disponibles para otros viajeros.
              Puedes editarlos desde «Mis reseñas».
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/perfil?tab=resenas">Ver mis reseñas</Link>
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Seguir leyendo
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-5">
            <p className="rounded-lg bg-stone-50 p-3 text-sm leading-6 text-neutral-600">
              Se publicará como{' '}
              <strong className="font-medium text-neutral-900">
                {user?.name}
              </strong>
              . Tu reseña y tus fotos serán públicas al enviarlas. Comparte tu
              experiencia con respeto.
            </p>
            <FieldError>{errors.form}</FieldError>
            <ReviewFields
              values={values}
              onChange={(value) => {
                setValues(value);
                setErrors({});
              }}
              errors={errors}
              disabled={mutation.isPending}
            />
            <ReviewImagePicker
              files={files}
              onChange={(value) => {
                setFiles(value);
                setErrors((current) => ({
                  ...current,
                  images: undefined,
                  form: undefined,
                }));
              }}
              error={errors.images}
              disabled={mutation.isPending}
            />
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-cyan-700 text-white hover:bg-cyan-800"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {mutation.isPending ? 'Publicando…' : 'Publicar reseña'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
