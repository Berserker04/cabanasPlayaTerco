import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registrarse',
};

export default function RegisterPage() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold">Crear cuenta</h1>
      <p className="text-sm text-muted-foreground">
        Formulario de registro próximamente.
      </p>
      {/* TODO: Register form with name/email/password/confirm + Google OAuth */}
    </div>
  );
}
