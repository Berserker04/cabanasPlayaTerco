'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Chrome, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  google: 'No pudimos completar el inicio de sesion con Google.',
  'google-email': 'Google no devolvio un correo valido para esta cuenta.',
};

export function LoginForm({ nextPath, oauthError }: LoginFormProps) {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    oauthError ? GOOGLE_ERROR_MESSAGES[oauthError] ?? 'No pudimos completar el inicio de sesion.' : null,
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

      setFormError('No pudimos iniciar sesion. Revisa tu conexion e intentalo de nuevo.');
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

      setFormError('No pudimos abrir el inicio de sesion con Google.');
    }
  };

  return (
    <Card className="rounded-lg">
      <CardHeader className="gap-2">
        <CardTitle className="text-2xl">Iniciar sesion</CardTitle>
        <CardDescription>Entra al panel o continua con tus reservas.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && (
            <div
              className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{formError}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@cabanasplayaterco.com"
                className="pl-9"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Tu contrasena"
                className="pl-9 pr-10"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            {errors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || isGoogleLoading}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Entrar
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs font-medium uppercase text-muted-foreground">o</span>
          <Separator className="flex-1" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isSubmitting || isGoogleLoading}
          onClick={handleGoogleLogin}
        >
          {isGoogleLoading ? <Loader2 className="size-4 animate-spin" /> : <Chrome className="size-4" />}
          Continuar con Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          No tienes cuenta?{' '}
          <Link href="/registro" className="font-medium text-foreground underline-offset-4 hover:underline">
            Registrate
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
