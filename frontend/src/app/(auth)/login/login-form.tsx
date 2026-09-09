'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleAuthButton } from '../google-auth-button';
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
    <>
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
              className="h-12 rounded-xl border-neutral-200 bg-white pl-11 pr-4 text-base shadow-sm md:text-[15px] focus-visible:border-cyan-700 focus-visible:ring-cyan-700/15"
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
              className="h-12 rounded-xl border-neutral-200 bg-white pl-11 pr-12 text-base shadow-sm md:text-[15px] focus-visible:border-cyan-700 focus-visible:ring-cyan-700/15"
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

      <GoogleAuthButton loading={isGoogleLoading} disabled={isSubmitting} onClick={handleGoogleLogin} />

      <p className="mt-6 text-center text-sm text-neutral-600">
        ¿Primera vez por aquí?{' '}
        <Link
          href={`/registro?next=${encodeURIComponent(nextPath)}`}
          className="font-semibold text-cyan-800 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-700/20"
        >
          Crea tu cuenta
        </Link>
      </p>
    </>
  );
}
