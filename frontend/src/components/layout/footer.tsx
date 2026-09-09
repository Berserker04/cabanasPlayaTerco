import Image from 'next/image';
import Link from 'next/link';
import {
  CONTACT_PHONE_DISPLAY,
  EMAIL,
  FACEBOOK_URL,
  GOOGLE_MAPS_URL,
  INSTAGRAM_URL,
  LOCATION_LABEL,
  NAV_LINKS,
  SITE_NAME,
  WHATSAPP_URL,
} from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/terco_logo_nav.png"
                alt=""
                width={500}
                height={328}
                className="h-12 w-[73px] object-contain"
              />
              <h3 className="text-lg font-bold">{SITE_NAME}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Cabañas frente al mar en Playa Terco, Chocó. Naturaleza, descanso y aventura en el
              Pacífico colombiano.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Enlaces rápidos</h4>
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.slice(0, 5).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/privacidad"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Política de privacidad
              </Link>
            </nav>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Contacto</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a href={`mailto:${EMAIL}`} className="break-words hover:text-foreground">
                {EMAIL}
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                WhatsApp: {CONTACT_PHONE_DISPLAY}
              </a>
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                {LOCATION_LABEL}
              </a>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Instagram
                </a>
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {SITE_NAME}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
