'use client';

import { Copy, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  CONTACT_PHONE_DISPLAY,
  EMAIL,
  GOOGLE_MAPS_URL,
  PHONE_NUMBER,
} from '@/lib/constants';
import { ContactMethodLink } from './contact-quote-context';

const interactiveClassName =
  'group flex min-w-0 items-center gap-3 rounded-lg border bg-white p-4 text-left shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700';
const staticClassName =
  'contact-desktop-action min-w-0 items-center gap-3 rounded-lg border bg-white p-4 shadow-sm';

function MethodContent({
  title,
  value,
  Icon,
  copyHint = false,
}: {
  title: string;
  value: string;
  Icon: typeof Mail;
  copyHint?: boolean;
}) {
  return (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-cyan-800">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-neutral-950">
          {title}
        </span>
        <span className="block break-words text-sm text-neutral-600 group-hover:text-cyan-800">
          {value}
        </span>
        {copyHint && (
          <span className="mt-0.5 block text-xs text-cyan-700">
            Haz clic para copiar
          </span>
        )}
      </span>
      {copyHint && (
        <Copy className="h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" />
      )}
    </>
  );
}

export function ContactMethods() {
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast.success('Correo copiado', { description: EMAIL });
    } catch {
      toast.error('No pudimos copiar el correo', {
        description: `Puedes copiarlo manualmente: ${EMAIL}`,
      });
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <ContactMethodLink
        whatsapp
        target="_blank"
        rel="noopener noreferrer"
        className={interactiveClassName}
      >
        <MethodContent
          title="WhatsApp"
          value={CONTACT_PHONE_DISPLAY}
          Icon={MessageCircle}
        />
      </ContactMethodLink>

      <a
        href={`tel:${PHONE_NUMBER.replace(/\s/g, '')}`}
        className={`contact-touch-action ${interactiveClassName}`}
      >
        <MethodContent
          title="Teléfono"
          value={CONTACT_PHONE_DISPLAY}
          Icon={Phone}
        />
      </a>
      <div className={staticClassName}>
        <MethodContent
          title="Teléfono"
          value={CONTACT_PHONE_DISPLAY}
          Icon={Phone}
        />
      </div>

      <a
        href={`mailto:${EMAIL}`}
        className={`contact-touch-action ${interactiveClassName}`}
      >
        <MethodContent title="Correo" value={EMAIL} Icon={Mail} />
      </a>
      <button
        type="button"
        onClick={() => void copyEmail()}
        className={`contact-desktop-action w-full cursor-copy ${interactiveClassName}`}
        aria-label={`Copiar correo ${EMAIL}`}
      >
        <MethodContent title="Correo" value={EMAIL} Icon={Mail} copyHint />
      </button>

      <a
        href={GOOGLE_MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={interactiveClassName}
      >
        <MethodContent
          title="Ubicación"
          value="Abrir en Google Maps"
          Icon={MapPin}
        />
      </a>
    </div>
  );
}
