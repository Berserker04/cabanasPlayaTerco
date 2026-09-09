'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  FileText,
  LoaderCircle,
  LockKeyhole,
  Save,
  Star,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProfileBlogPanel } from '@/components/blog/profile-blog-panel';
import { ProfileReviewsPanel } from '@/components/reviews/profile-reviews-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';

function ProfileContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tab =
    params.get('tab') === 'resenas'
      ? 'reviews'
      : ['password', 'blog'].includes(params.get('tab') ?? '')
        ? params.get('tab')!
        : 'profile';
  const { user, isLoading, isAuthenticated, updateProfile } = useAuth();
  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(`/perfil?${params.toString()}`)}`,
      );
    }
  }, [isAuthenticated, isLoading, router, params]);

  const profileMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      email: string;
      phone: string;
    }) => updateProfile({ ...values, phone: values.phone || null }),
    onSuccess: () => toast.success('Perfil actualizado'),
    onError: (error) => {
      toast.error('No pudimos actualizar el perfil', {
        description:
          error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      await fetchCsrfCookie();
      return api.put<{ message: string }>('/auth/password', passwords);
    },
    onSuccess: (response) => {
      setPasswords({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
      toast.success(response.message);
    },
    onError: (error) => {
      toast.error('No pudimos actualizar la contrasena', {
        description:
          error instanceof ApiError
            ? error.message
            : 'Revisa los datos e intentalo de nuevo.',
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

  return (
    <section className="bg-stone-50 py-10 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
              Mi cuenta
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-neutral-950">
              Perfil
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Administra tus datos, contrasena y reseñas publicadas o
              pendientes.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/resenas">Ver reseñas públicas</Link>
          </Button>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) =>
            router.replace(
              `/perfil?tab=${value === 'reviews' ? 'resenas' : value}`,
              { scroll: false },
            )
          }
          className="gap-6"
        >
          <TabsList className="grid w-full grid-cols-2 gap-1 group-data-[orientation=horizontal]/tabs:h-auto sm:grid-cols-4">
            <TabsTrigger value="profile" className="h-9">
              <UserRound className="h-4 w-4" />
              Datos
            </TabsTrigger>
            <TabsTrigger value="password" className="h-9">
              <LockKeyhole className="h-4 w-4" />
              Contraseña
            </TabsTrigger>
            <TabsTrigger value="reviews" className="h-9">
              <Star className="h-4 w-4" />
              Mis reseñas
            </TabsTrigger>
            <TabsTrigger value="blog" className="h-9">
              <FileText className="h-4 w-4" />
              Blog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <form
              onSubmit={submitProfile}
              className="max-w-2xl rounded-lg border bg-white p-5 shadow-sm sm:p-6"
            >
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
              <Button
                type="submit"
                className="mt-6 bg-cyan-700 text-white hover:bg-cyan-800"
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar datos
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="password">
            <form
              onSubmit={submitPassword}
              className="max-w-2xl rounded-lg border bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="grid gap-5">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contrasena actual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwords.current_password}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        current_password: event.target.value,
                      }))
                    }
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contrasena</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwords.password}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password-confirmation">
                    Confirmar nueva contrasena
                  </Label>
                  <Input
                    id="new-password-confirmation"
                    type="password"
                    value={passwords.password_confirmation}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        password_confirmation: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="mt-6 bg-cyan-700 text-white hover:bg-cyan-800"
                disabled={passwordMutation.isPending}
              >
                {passwordMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                Actualizar contrasena
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="reviews">
            <ProfileReviewsPanel />
          </TabsContent>

          <TabsContent value="blog">
            <ProfileBlogPanel />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={<div className="p-10 text-center">Cargando perfil…</div>}
    >
      <ProfileContent />
    </Suspense>
  );
}
