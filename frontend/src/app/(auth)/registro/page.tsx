import type { Metadata } from 'next';
import { firstStringParam, sanitizeLocalPath } from '@/lib/auth-redirect';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Registrarse',
  description: 'Crea tu cuenta para organizar tus reservas y compartir tu experiencia en Playa Terco.',
};

type RegisterPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

  return (
    <RegisterForm
      nextPath={sanitizeLocalPath(firstStringParam(params?.next))}
      oauthError={firstStringParam(params?.error)}
    />
  );
}
