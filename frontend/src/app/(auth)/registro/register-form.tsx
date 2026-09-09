'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Chrome,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react';
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
import { registerSchema, type RegisterInput } from '@/lib/validations';

type RegisterFormProps = {
  nextPath: string;
  oauthError?: string;
};

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google: 'No pudimos completar el registro con Google.',
  'google-email': 'Google no devolvio un correo valido para esta cuenta.',
};

export function RegisterForm({ nextPath, oauthError }: RegisterFormProps) {
  const router = useRouter();
  const { register: registerUser, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    oauthError ? GOOGLE_ERROR_MESSAGES[oauthError] ?? 'No pudimos completar el registro.' : null,
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setFormError(null);

    try {
      const user = await registerUser(data);
      router.replace(resolvePostAuthPath(user, nextPath));
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors?.name?.[0]) {
          setError('name', { message: error.errors.name[0] });
        }

        if (error.errors?.email?.[0]) {
          setError('email', { message: error.errors.email[0] });
        }

        if (error.errors?.password?.[0]) {
          setError('password', { message: error.errors.password[0] });
        }

        if (error.errors?.password_confirmation?.[0]) {
          setError('password_confirmation', {
            message: error.errors.password_confirmation[0],
          });
        }

        setFormError(error.message);
        return;
      }

      setFormError('No pudimos crear tu cuenta. Revisa tu conexion e intentalo de nuevo.');
    }
  };

  const handleGoogleRegister = async () => {
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

      setFormError('No pudimos abrir el registro con Google.');
    }
  };

  return (
    <Card className="rounded-lg">
      <CardHeader className="gap-2">
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>Registrate para gestionar tus reservas y comentarios.</CardDescription>
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
            <Label htmlFor="name">Nombre completo</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Tu nombre"
                className="pl-9"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
                {...register('name')}
              />
            </div>
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
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
                autoComplete="new-password"
                placeholder="Crea una contrasena"
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

          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirmar contrasena</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password_confirmation"
                type={showConfirmation ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repite la contrasena"
                className="pl-9 pr-10"
                aria-invalid={Boolean(errors.password_confirmation)}
                aria-describedby={
                  errors.password_confirmation ? 'password-confirmation-error' : undefined
                }
                {...register('password_confirmation')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowConfirmation((value) => !value)}
                aria-label={showConfirmation ? 'Ocultar confirmacion' : 'Mostrar confirmacion'}
              >
                {showConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            {errors.password_confirmation && (
              <p id="password-confirmation-error" className="text-sm text-destructive">
                {errors.password_confirmation.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || isGoogleLoading}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Crear cuenta
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
          onClick={handleGoogleRegister}
        >
          {isGoogleLoading ? <Loader2 className="size-4 animate-spin" /> : <Chrome className="size-4" />}
          Continuar con Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          Ya tienes cuenta?{' '}
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            Inicia sesion
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
