import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildQuoteWhatsAppHref } from '@/lib/cabin-utils';
import { generalQuoteContext } from '@/lib/general-quote';
import { stayHref, type StayContext } from '@/lib/stay-context';
import { cn } from '@/lib/utils';

export function GeneralQuoteActions({
  context = {},
  className,
}: {
  context?: StayContext;
  className?: string;
}) {
  const quote = generalQuoteContext(context);
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap',
        className,
      )}
    >
      <Button
        asChild
        className="min-h-11 h-auto whitespace-normal bg-cyan-700 text-white hover:bg-cyan-800"
      >
        <Link href={`${stayHref('/contacto', quote)}#solicitud`}>
          Solicitar cotización
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        className="min-h-11 h-auto whitespace-normal bg-white text-neutral-950 hover:bg-stone-100"
      >
        <a
          href={buildQuoteWhatsAppHref(quote)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="size-4" aria-hidden="true" /> Cotizar por
          WhatsApp
        </a>
      </Button>
    </div>
  );
}
