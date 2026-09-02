import type { Metadata } from 'next';
import { firstStringParam, sanitizeLocalPath } from '@/lib/auth-redirect';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Registrarse',
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
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <RegisterForm
          nextPath={sanitizeLocalPath(firstStringParam(params?.next))}
          oauthError={firstStringParam(params?.error)}
        />
      </div>
    </main>
  );
}
