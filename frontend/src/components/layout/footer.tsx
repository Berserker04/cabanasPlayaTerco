import Image from 'next/image';
import Link from 'next/link';
import { EMAIL, NAV_LINKS, SITE_NAME, WHATSAPP_NUMBER } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/terco_logo.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-contain"
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
            </nav>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Contacto</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a href={`mailto:${EMAIL}`} className="hover:text-foreground">
                {EMAIL}
              </a>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                WhatsApp: {WHATSAPP_NUMBER}
              </a>
              <p>Playa Terco, Nuquí, Chocó - Colombia</p>
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
