'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { resolvePostAuthPath } from '@/lib/auth-redirect';
import { loginSchema, type LoginInput } from '@/lib/validations';

type LoginFormProps = {
  nextPath: string;
  oauthError?: string;
};

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google: 'No pudimos completar el inicio de sesión con Google.',
  'google-email': 'Google no devolvió un correo válido para esta cuenta.',
  suspended: 'Tu cuenta está suspendida. Contacta a un administrador.',
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.97-3.39.97-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.86A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6 12 6Z"
      />
    </svg>
  );
}

export function LoginForm({ nextPath, oauthError }: LoginFormProps) {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    oauthError
      ? GOOGLE_ERROR_MESSAGES[oauthError] ?? 'No pudimos completar el inicio de sesión.'
      : null,
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setFormError(null);

    try {
      const user = await login(data.email, data.password);
      router.replace(resolvePostAuthPath(user, nextPath));
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors?.email?.[0]) {
          setError('email', { message: error.errors.email[0] });
        }

        if (error.errors?.password?.[0]) {
          setError('password', { message: error.errors.password[0] });
        }

        setFormError(error.message);
        return;
      }

      setFormError('No pudimos iniciar sesión. Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle(nextPath);
    } catch (error) {
      setIsGoogleLoading(false);

      if (error instanceof ApiError) {
        setFormError(error.message);
        return;
      }

      setFormError('No pudimos abrir el inicio de sesión con Google.');
    }
  };

  return (
    <main className="grid min-h-svh bg-[#f4f8f7] lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,0.92fr)]">
      <aside className="relative hidden min-h-svh overflow-hidden bg-cyan-950 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <Image
          src="/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg"
          alt="Atardecer entre palmeras frente al mar en Playa Terco"
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 0px"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,30,28,0.32)_0%,rgba(2,25,24,0.24)_36%,rgba(2,24,23,0.88)_100%)]" />
        <div
          className="absolute -bottom-24 -right-24 size-80 rounded-full border border-cyan-200/20"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-10 -right-10 size-52 rounded-full border border-cyan-200/25"
          aria-hidden="true"
        />

        <Link
          href="/"
          className="relative z-10 inline-flex w-fit items-center gap-3 rounded-2xl bg-white/92 px-4 py-2.5 text-cyan-950 shadow-lg backdrop-blur transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70"
        >
          <Image
            src="/assets/terco_logo_nav.png"
            alt=""
            width={500}
            height={328}
            className="h-11 w-[67px] object-contain"
          />
          <span className="pr-1 text-sm font-bold tracking-tight">Cabañas Playa Terco</span>
        </Link>

        <div className="relative z-10 max-w-xl text-white">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-50 backdrop-blur-sm">
            <MapPin className="size-4" aria-hidden="true" />
            Playa Terco · Nuquí
          </div>
          <h2 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.035em] xl:text-5xl">
            Tu lugar frente al Pacífico te espera.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-cyan-50/90 xl:text-lg xl:leading-8">
            Consulta tus reservas y vuelve a conectar con la calma, la selva y el mar del Chocó.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm font-medium text-cyan-50/90">
            <span className="flex size-9 items-center justify-center rounded-full bg-cyan-300 text-cyan-950">
              <Waves className="size-5" aria-hidden="true" />
            </span>
            Un paraíso frente al mar
          </div>
        </div>
      </aside>

      <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-10 sm:px-10 lg:px-12 xl:px-20">
        <div
          className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full bg-cyan-200/30 blur-3xl lg:hidden"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-36 -left-28 size-80 rounded-full bg-amber-100/60 blur-3xl lg:hidden"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-[430px]">
          <div className="mb-9 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-600/20"
            >
              <Image
                src="/assets/terco_logo_nav.png"
                alt=""
                width={500}
                height={328}
                priority
                className="h-12 w-[73px] object-contain"
              />
              <span className="text-sm font-bold tracking-tight text-cyan-950">Playa Terco</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-900/70">
              <MapPin className="size-3.5" aria-hidden="true" />
              Nuquí
            </span>
          </div>

          <Link
            href="/"
            className="mb-10 hidden w-fit items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-cyan-800 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-600/20 lg:inline-flex"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al sitio
          </Link>

          <header>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
              Área de huéspedes
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
              Qué bueno tenerte de vuelta
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-neutral-600 sm:text-base sm:leading-7">
              Ingresa para gestionar tus reservas y continuar planeando tu visita a Playa Terco.
            </p>
          </header>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {formError && (
              <div
                className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-6 text-red-800"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="mt-1 size-4 shrink-0" aria-hidden="true" />
                <p>{formError}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-neutral-800">
                Correo electrónico
              </Label>
              <div className="group relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-cyan-700"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className="h-12 rounded-xl border-neutral-200 bg-white pl-11 pr-4 text-[15px] shadow-sm focus-visible:border-cyan-700 focus-visible:ring-cyan-700/15"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-sm text-red-700">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-neutral-800">
                Contraseña
              </Label>
              <div className="group relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-cyan-700"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  className="h-12 rounded-xl border-neutral-200 bg-white pl-11 pr-12 text-[15px] shadow-sm focus-visible:border-cyan-700 focus-visible:ring-cyan-700/15"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-10 -translate-y-1/2 rounded-lg text-neutral-500 hover:bg-cyan-50 hover:text-cyan-800 focus-visible:ring-cyan-700/20"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-red-700">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-cyan-800 text-[15px] font-semibold text-white shadow-md shadow-cyan-900/10 hover:bg-cyan-700 focus-visible:ring-cyan-700/25"
              disabled={isSubmitting || isGoogleLoading}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1 bg-neutral-200" />
            <span className="text-xs font-medium text-neutral-500">o continúa con</span>
            <Separator className="flex-1 bg-neutral-200" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-xl border-neutral-200 bg-white text-[15px] font-semibold text-neutral-800 shadow-sm hover:border-neutral-300 hover:bg-neutral-50 focus-visible:ring-cyan-700/20"
            disabled={isSubmitting || isGoogleLoading}
            onClick={handleGoogleLogin}
          >
            {isGoogleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
            {isGoogleLoading ? 'Conectando…' : 'Continuar con Google'}
          </Button>

          <p className="mt-7 text-center text-sm text-neutral-600">
            ¿Primera vez por aquí?{' '}
            <Link
              href="/registro"
              className="font-semibold text-cyan-800 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-700/20"
            >
              Crea tu cuenta
            </Link>
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-neutral-200/80 pt-5 text-xs text-neutral-500">
            <ShieldCheck className="size-4 text-cyan-700" aria-hidden="true" />
            Acceso seguro a tu cuenta de Playa Terco
          </div>
        </div>
      </section>
    </main>
  );
}
