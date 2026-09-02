import type { Metadata } from 'next';
import { firstStringParam, sanitizeLocalPath } from '@/lib/auth-redirect';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu cuenta para gestionar tus reservas en Cabañas Playa Terco.',
};

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <LoginForm
      nextPath={sanitizeLocalPath(firstStringParam(params?.next))}
      oauthError={firstStringParam(params?.error)}
    />
  );
}
