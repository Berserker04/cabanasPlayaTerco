'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Edit,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Save,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import type { Review, ReviewListResponse, ReviewMedia, ReviewStatus } from '@/types/review';

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

function statusLabel(status: ReviewStatus) {
  return {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
  }[status];
}

function statusClass(status: ReviewStatus) {
  return {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rejected: 'border-red-200 bg-red-50 text-red-800',
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

type EditState = {
  rating: number;
  title: string;
  body: string;
};

function emptyEditState(review?: Review | null): EditState {
  return {
    rating: review?.rating ?? 5,
    title: review?.title ?? '',
    body: review?.body ?? '',
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading, isAuthenticated, updateProfile } = useAuth();
  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editState, setEditState] = useState<EditState>(emptyEditState());

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?next=/perfil');
    }
  }, [isAuthenticated, isLoading, router]);

  const reviewsQuery = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get<ReviewListResponse>('/me/reviews'),
    enabled: isAuthenticated,
  });

  const profileMutation = useMutation({
    mutationFn: async (values: { name: string; email: string; phone: string }) =>
      updateProfile({ ...values, phone: values.phone || null }),
    onSuccess: () => toast.success('Perfil actualizado'),
    onError: (error) => {
      toast.error('No pudimos actualizar el perfil', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      await fetchCsrfCookie();
      return api.put<{ message: string }>('/auth/password', passwords);
    },
    onSuccess: (response) => {
      setPasswords({ current_password: '', password: '', password_confirmation: '' });
      toast.success(response.message);
    },
    onError: (error) => {
      toast.error('No pudimos actualizar la contrasena', {
        description: error instanceof ApiError ? error.message : 'Revisa los datos e intentalo de nuevo.',
      });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ review, values }: { review: Review; values: EditState }) => {
      await fetchCsrfCookie();
      return api.put<{ data: Review; message: string }>(`/me/reviews/${review.id}`, values);
    },
    onSuccess: (response) => {
      setEditingReview(null);
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error) => {
      toast.error('No pudimos actualizar la resena', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (review: Review) => {
      await fetchCsrfCookie();
      return api.delete<{ message: string }>(`/me/reviews/${review.id}`);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error) => {
      toast.error('No pudimos eliminar la resena', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async ({ review, files }: { review: Review; files: File[] }) => {
      const payload = new FormData();
      files.forEach((file) => payload.append('images[]', file));
      await fetchCsrfCookie();
      return api.post<{ data: ReviewMedia[]; message: string }>(`/me/reviews/${review.id}/media`, payload);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error) => {
      toast.error('No pudimos subir las fotos', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async ({ review, media }: { review: Review; media: ReviewMedia }) => {
      await fetchCsrfCookie();
      return api.delete<{ message: string }>(`/me/reviews/${review.id}/media/${media.id}`);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error) => {
      toast.error('No pudimos eliminar la foto', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    profileMutation.mutate({
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
    });
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    passwordMutation.mutate();
  }

  function openEdit(review: Review) {
    setEditingReview(review);
    setEditState(emptyEditState(review));
  }

  function handleUpload(review: Review, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    uploadMediaMutation.mutate({ review, files: files.slice(0, 3) });
    event.target.value = '';
  }

  if (isLoading || (!isAuthenticated && !user)) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <LoaderCircle className="h-6 w-6 animate-spin text-cyan-700" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const reviews = reviewsQuery.data?.data ?? [];

  return (
    <section className="bg-stone-50 py-10 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Mi cuenta</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-neutral-950">Perfil</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Administra tus datos, contrasena y resenas publicadas o pendientes.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/resenas">Ver resenas publicas</Link>
          </Button>
        </div>

        <Tabs defaultValue="profile" className="gap-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="profile">
              <UserRound className="h-4 w-4" />
              Datos
            </TabsTrigger>
            <TabsTrigger value="password">
              <LockKeyhole className="h-4 w-4" />
              Contrasena
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="h-4 w-4" />
              Mis resenas
            </TabsTrigger>
            <TabsTrigger value="blog">
              <FileText className="h-4 w-4" />
              Blog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <form onSubmit={submitProfile} className="max-w-2xl rounded-lg border bg-white p-5 shadow-sm sm:p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Nombre</Label>
                  <Input
                    id="profile-name"
                    name="name"
                    defaultValue={user.name}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Correo</Label>
                  <Input
                    id="profile-email"
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="profile-phone">Telefono o WhatsApp</Label>
                  <Input
                    id="profile-phone"
                    name="phone"
                    defaultValue={user.phone ?? ''}
                    autoComplete="tel"
                    placeholder="314 742 7806"
                  />
                </div>
              </div>
              <Button type="submit" className="mt-6 bg-cyan-700 text-white hover:bg-cyan-800" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar datos
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="password">
            <form onSubmit={submitPassword} className="max-w-2xl rounded-lg border bg-white p-5 shadow-sm sm:p-6">
              <div className="grid gap-5">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contrasena actual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwords.current_password}
                    onChange={(event) => setPasswords((current) => ({ ...current, current_password: event.target.value }))}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contrasena</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwords.password}
                    onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password-confirmation">Confirmar nueva contrasena</Label>
                  <Input
                    id="new-password-confirmation"
                    type="password"
                    value={passwords.password_confirmation}
                    onChange={(event) => setPasswords((current) => ({ ...current, password_confirmation: event.target.value }))}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button type="submit" className="mt-6 bg-cyan-700 text-white hover:bg-cyan-800" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                Actualizar contrasena
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="reviews">
            {reviewsQuery.isLoading ? (
              <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">Cargando resenas...</div>
            ) : reviews.length > 0 ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-lg border bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Badge variant="outline" className={statusClass(review.status)}>
                          {statusLabel(review.status)}
                        </Badge>
                        <h2 className="mt-3 text-lg font-semibold text-neutral-950">{review.title || 'Sin titulo'}</h2>
                        <p className="mt-1 text-xs text-neutral-500">Creada el {formatDate(review.created_at)}</p>
                      </div>
                      <Stars rating={review.rating} />
                    </div>
                    <p className="mt-4 whitespace-pre-line text-sm leading-7 text-neutral-700">{review.body}</p>
                    {review.admin_response ? (
                      <div className="mt-4 rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm text-cyan-900">
                        {review.admin_response}
                      </div>
                    ) : null}
                    {(review.media ?? []).length > 0 ? (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {(review.media ?? []).map((media) => (
                          <div key={media.id} className="space-y-2">
                            <img
                              src={media.url}
                              alt={media.alt ?? 'Foto de resena'}
                              className="aspect-square rounded-md object-cover"
                            />
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              className="w-full"
                              onClick={() => deleteMediaMutation.mutate({ review, media })}
                            >
                              <Trash2 className="h-3 w-3" />
                              Quitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor={`review-media-${review.id}`}>Agregar fotos</Label>
                        <Input
                          id={`review-media-${review.id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={(event) => handleUpload(review, event)}
                          disabled={(review.media ?? []).length >= 3}
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={() => openEdit(review)}>
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => deleteReviewMutation.mutate(review)}
                        disabled={deleteReviewMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-white p-8 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-cyan-700" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold text-neutral-950">No has creado resenas</h2>
                <p className="mt-2 text-sm text-neutral-600">Cuando compartas una experiencia, la veras aqui.</p>
                <Button asChild className="mt-5 bg-cyan-700 text-white hover:bg-cyan-800">
                  <Link href="/resenas">Crear resena</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="blog">
            <div className="rounded-lg border bg-white p-8">
              <FileText className="h-9 w-9 text-cyan-700" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-neutral-950">Blogs en proxima fase</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                Tu cuenta ya queda lista para administrar publicaciones cuando implementemos el modulo de blog.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(editingReview)} onOpenChange={(open) => !open && setEditingReview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar resena</DialogTitle>
            <DialogDescription>Al guardar, la resena volvera a revision.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-rating">Calificacion</Label>
              <Input
                id="edit-rating"
                type="number"
                min={1}
                max={5}
                value={editState.rating}
                onChange={(event) => setEditState((current) => ({ ...current, rating: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titulo</Label>
              <Input
                id="edit-title"
                value={editState.title}
                onChange={(event) => setEditState((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-body">Resena</Label>
              <Textarea
                id="edit-body"
                rows={6}
                value={editState.body}
                onChange={(event) => setEditState((current) => ({ ...current, body: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingReview(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-cyan-700 text-white hover:bg-cyan-800"
              disabled={!editingReview || updateReviewMutation.isPending}
              onClick={() => {
                if (editingReview) {
                  updateReviewMutation.mutate({ review: editingReview, values: editState });
                }
              }}
            >
              {updateReviewMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
