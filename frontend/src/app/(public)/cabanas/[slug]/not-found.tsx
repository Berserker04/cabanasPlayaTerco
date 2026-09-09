import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CabinNotFound() {
  return (
    <section className="mx-auto max-w-2xl space-y-4 px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Cabaña no encontrada</h1>
      <p>Esta cabaña no está publicada o el enlace no existe.</p>
      <Button asChild>
        <Link href="/cabanas">Ver cabañas disponibles</Link>
      </Button>
    </section>
  );
}
