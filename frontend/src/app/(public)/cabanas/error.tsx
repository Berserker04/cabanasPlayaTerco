'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

export default function CabinError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <section
      className="mx-auto max-w-2xl space-y-4 px-4 py-20 text-center"
      role="alert"
    >
      <h1 className="text-2xl font-bold">No pudimos cargar las cabañas</h1>
      <p>Puede ser un problema temporal de conexión. Vuelve a intentarlo.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
        >
          {pending ? 'Cargando…' : 'Reintentar'}
        </Button>
        <Button asChild variant="outline">
          <Link href="/cabanas">Volver al catálogo</Link>
        </Button>
      </div>
    </section>
  );
}
