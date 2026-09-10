import { generalQuoteContext } from '@/lib/general-quote';
import {
  stayFromSearchParams,
  type StaySearchParams,
} from '@/lib/stay-context';
import type { Metadata } from 'next';
import Image from 'next/image';
import {
  Clock,
  ExternalLink,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  EMAIL,
  FACEBOOK_URL,
  GOOGLE_MAPS_URL,
  INSTAGRAM_URL,
  LOCATION_LABEL,
} from '@/lib/constants';
import { ContactForm } from './contact-form';
import { ContactMethods } from './contact-methods';
import {
  ContactQuoteProvider,
  ContactMethodLink,
} from './contact-quote-context';

export const metadata: Metadata = {
  title: 'Contacto',
  description:
    'Contáctanos para reservas, cotizaciones e información sobre Cabañas Playa Terco.',
};

const heroImage =
  '/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg';
const mapImage =
  '/assets/imagenes/54516895_2086105884772446_8521564931760324608_n.jpg';

const socialLinks = [
  {
    label: 'Instagram',
    href: INSTAGRAM_URL,
    Icon: Instagram,
  },
  {
    label: 'Facebook',
    href: FACEBOOK_URL,
    Icon: ExternalLink,
  },
] as const;

export default async function ContactPage({
  searchParams,
}: {
  searchParams: StaySearchParams;
}) {
  const context = generalQuoteContext(await stayFromSearchParams(searchParams));
  return (
    <ContactQuoteProvider initialValues={context}>
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <Image
          src={heroImage}
          alt="Atardecer frente al Pacífico en Playa Terco"
          fill
          priority
          sizes="100vw"
          className="z-0 object-cover"
        />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(6,24,20,0.88),rgba(6,24,20,0.52),rgba(6,24,20,0.20))]" />
        <div className="container relative z-20 mx-auto px-4 py-20 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Playa Terco, Nuquí
            </p>
            <h1 className="text-4xl font-bold tracking-normal sm:text-5xl lg:text-6xl">
              Contacto y cotizaciones
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-cyan-50 sm:text-lg">
              Escríbenos para consultar fechas, coordinar tu llegada y preparar
              una cotización clara para tu estadía frente al mar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="bg-cyan-500 text-cyan-950 hover:bg-cyan-400"
              >
                <ContactMethodLink
                  whatsapp
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Cotizar por WhatsApp
                </ContactMethodLink>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/70 bg-white/10 text-white hover:bg-white hover:text-neutral-950"
              >
                <a href={`mailto:${EMAIL}`}>
                  <Mail className="h-5 w-5" aria-hidden="true" />
                  Enviar correo
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="solicitud"
        className="scroll-mt-24 bg-stone-50 py-14 sm:py-20"
      >
        <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Solicitud de cotización
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-normal text-neutral-950">
              Cuéntanos cómo quieres viajar
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-600">
              Comparte tus fechas, número de huéspedes y cualquier detalle
              importante. Si aún no tienes fechas exactas, selecciona unas
              aproximadas y te ayudaremos a revisar alternativas.
            </p>
            <div className="mt-7">
              <ContactForm initialContext={context} />
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <Clock
                className="mb-4 h-6 w-6 text-cyan-700"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold tracking-normal text-neutral-950">
                Respuesta cercana
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Revisamos cada solicitud para confirmar disponibilidad,
                recomendaciones de llegada y opciones de alojamiento según tu
                grupo.
              </p>
            </div>

            <ContactMethods />

            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold tracking-normal text-neutral-950">
                Redes
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {socialLinks.map(({ label, href, Icon }) => (
                  <Button key={label} variant="outline" asChild>
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Cómo llegar
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-normal text-neutral-950">
              Encuéntranos en Playa Terco
            </h2>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              {LOCATION_LABEL}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="bg-cyan-700 text-white hover:bg-cyan-800"
              >
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  Abrir Google Maps
                </a>
              </Button>
              <Button variant="outline" asChild>
                <ContactMethodLink
                  whatsapp
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Coordinar llegada
                </ContactMethodLink>
              </Button>
            </div>
          </div>

          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block aspect-[16/10] overflow-hidden rounded-lg"
          >
            <Image
              src={mapImage}
              alt="Entrada tropical a Cabañas Playa Terco"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/10 to-transparent" />
            <span className="absolute bottom-4 left-4 right-4 flex items-center gap-3 text-white">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/90 text-cyan-800">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  Ver ubicación exacta
                </span>
                <span className="block text-xs text-cyan-50">Google Maps</span>
              </span>
            </span>
          </a>
        </div>
      </section>
    </ContactQuoteProvider>
  );
}
