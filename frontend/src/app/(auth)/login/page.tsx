import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
};

export default function LoginPage() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold">Iniciar sesión</h1>
      <p className="text-sm text-muted-foreground">
        Formulario de login próximamente.
      </p>
      {/* TODO: Login form with email/password + Google OAuth button */}
    </div>
  );
}
