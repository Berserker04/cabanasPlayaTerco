import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Clock,
  Compass,
  Leaf,
  MapPin,
  MessageCircle,
  Navigation,
  Sparkles,
  Utensils,
  Waves,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SITE_NAME, WHATSAPP_NUMBER } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Experiencias en Playa Terco',
  description:
    'Vive Playa Terco con experiencias frente al mar, naturaleza, sabores locales y atardeceres del Pacífico chocoano.',
};

const heroImage = '/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg';
const beachImage = '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg';
const gardenImage = '/assets/imagenes/511133422_9990219471027675_1591650365955070210_n.jpg';
const arrivalImage = '/assets/imagenes/54516895_2086105884772446_8521564931760324608_n.jpg';

const whatsappMessage = encodeURIComponent(
  `Hola, quiero conocer las experiencias que puedo vivir en ${SITE_NAME}.`,
);
const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${whatsappMessage}`;

type Experience = {
  title: string;
  description: string;
  image: string;
  alt: string;
  duration: string;
  mood: string;
  recommendation: string;
  Icon: LucideIcon;
};

const experiences: Experience[] = [
  {
    title: 'Playa lenta, mar cerca',
    description:
      'Camina descalzo, escucha el Pacífico y deja que el día baje de velocidad entre arena, brisa y sombra tropical.',
    image: beachImage,
    alt: 'Cabañas Playa Terco rodeadas de vegetación frente al mar',
    duration: 'Libre',
    mood: 'Descanso',
    recommendation: 'Ideal para llegar, soltar maletas y respirar playa.',
    Icon: Waves,
  },
  {
    title: 'Atardeceres que se quedan',
    description:
      'Cuando la luz cae sobre la costa, Playa Terco se vuelve un plan sencillo: mirar, conversar y guardar una foto mental.',
    image: heroImage,
    alt: 'Atardecer del Pacífico entre palmeras en Playa Terco',
    duration: 'Tarde',
    mood: 'Contemplación',
    recommendation: 'Trae la cámara lista y reserva un rato sin prisa.',
    Icon: Camera,
  },
  {
    title: 'Verde vivo alrededor',
    description:
      'Entre jardines, caminos y selva cercana, el paisaje se siente presente: hojas, aves, humedad fresca y calma chocoana.',
    image: gardenImage,
    alt: 'Cabañas nativas entre jardín tropical en Playa Terco',
    duration: 'Mañana',
    mood: 'Naturaleza',
    recommendation: 'Perfecto para viajeros que quieren moverse suave.',
    Icon: Leaf,
  },
  {
    title: 'Sabores y llegada local',
    description:
      'Coordina recomendaciones para comer, moverte por Nuquí y armar un plan con ritmo local desde tu primer día.',
    image: arrivalImage,
    alt: 'Entrada tropical hacia Cabañas Playa Terco',
    duration: 'A medida',
    mood: 'Cultura local',
    recommendation: 'Escríbenos antes de viajar para orientar tu llegada.',
    Icon: Utensils,
  },
];

const dayMoments = [
  {
    time: 'Mañana',
    title: 'Despertar frente al Pacífico',
    description: 'Empieza con aire salado, café tranquilo y una caminata corta antes de que el sol suba.',
  },
  {
    time: 'Mediodía',
    title: 'Sombra, descanso y sabor local',
    description:
      'Regresa a la cabaña, baja el ritmo y pregunta por recomendaciones para comer o conocer el entorno.',
  },
  {
    time: 'Tarde',
    title: 'La hora dorada de Playa Terco',
    description: 'Busca un punto frente al mar y deja que el atardecer haga lo suyo, sin itinerarios rígidos.',
  },
  {
    time: 'Noche',
    title: 'Conversación bajo cielo oscuro',
    description:
      'Cierra el día con el sonido del mar cerca y la sensación de estar lejos del ruido habitual.',
  },
] as const;

const planningTips = [
  'Pregunta por temporada, clima y recomendaciones de llegada antes de viajar.',
  'Trae ropa fresca, sandalias cómodas y una chaqueta liviana para lluvia tropical.',
  'Reserva tiempo sin agenda: el encanto de Playa Terco aparece cuando bajas el ritmo.',
] as const;

export default function ExperiencesPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <Image
          src={heroImage}
          alt="Atardecer frente al Pacífico en Playa Terco"
          fill
          priority
          sizes="100vw"
          className="z-0 object-cover"
        />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(6,24,20,0.90),rgba(6,24,20,0.58),rgba(6,24,20,0.22))]" />
        <div className="container relative z-20 mx-auto grid gap-10 px-4 py-20 sm:py-24 lg:grid-cols-[1fr_360px] lg:items-end lg:py-28">
          <div className="min-w-0 max-w-3xl">
            <Badge className="mb-5 bg-cyan-400 text-cyan-950 hover:bg-cyan-300">
              Playa Terco, Nuquí
            </Badge>
            <h1 className="max-w-full break-words text-4xl font-bold tracking-normal text-white sm:text-5xl lg:text-6xl">
              Experiencias que se sienten a mar, selva y calma
            </h1>
            <p className="mt-6 max-w-full break-words text-base leading-8 text-cyan-50 sm:max-w-2xl sm:text-lg">
              Ven a vivir el Pacífico chocoano sin afán: días de playa, verde alrededor,
              atardeceres intensos y recomendaciones cercanas para que tu viaje tenga ritmo local.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="w-full bg-cyan-500 text-cyan-950 hover:bg-cyan-400 sm:w-auto"
              >
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Preguntar por experiencias
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full border-white/70 bg-white/10 text-white hover:bg-white hover:text-neutral-950 sm:w-auto"
              >
                <Link href="/disponibilidad">
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  Consultar fechas
                </Link>
              </Button>
            </div>
          </div>

          <aside className="rounded-lg border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
              Qué se vive aquí
            </p>
            <div className="mt-5 grid gap-4">
              {[
                { label: 'Mar a pasos', Icon: Waves },
                { label: 'Naturaleza cercana', Icon: Leaf },
                { label: 'Atención directa', Icon: MessageCircle },
              ].map(({ label, Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-300 text-cyan-950">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-white">{label}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Planes con sentido de lugar
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-normal text-neutral-950 sm:text-4xl">
                El viaje empieza cuando puedes imaginarte allí
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-neutral-600">
              Estas experiencias no son una lista rígida de actividades: son formas de habitar Playa
              Terco con calma, acompañadas por orientación directa para ajustar el plan a tu viaje.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {experiences.map(({ title, description, image, alt, duration, mood, recommendation, Icon }) => (
              <article
                key={title}
                className="group overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-neutral-900">
                  <Image
                    src={image}
                    alt={alt}
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/72 via-neutral-950/10 to-transparent" />
                  <span className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-md bg-white/90 text-cyan-800 shadow-sm">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-cyan-200 text-cyan-800">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {duration}
                    </Badge>
                    <Badge variant="secondary">{mood}</Badge>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-normal text-neutral-950">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{description}</p>
                  <p className="mt-4 border-t pt-4 text-sm font-medium leading-6 text-neutral-800">
                    {recommendation}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-stone-50 py-14 sm:py-20">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Un día posible
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-normal text-neutral-950 sm:text-4xl">
              Deja que Playa Terco marque el ritmo
            </h2>
            <p className="mt-5 text-sm leading-7 text-neutral-600">
              La mejor experiencia aquí no depende de correr entre planes. Depende de llegar,
              mirar alrededor y dejar espacio para lo que el Pacífico propone ese día.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-cyan-700 text-white hover:bg-cyan-800">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Armar mi plan
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contacto">
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  Coordinar llegada
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute bottom-8 left-5 top-8 w-px bg-cyan-200 sm:left-6" aria-hidden="true" />
            <div className="space-y-4">
              {dayMoments.map(({ time, title, description }) => (
                <article key={time} className="relative rounded-lg border bg-white p-5 pl-16 shadow-sm sm:pl-20">
                  <span className="absolute left-3 top-5 flex h-10 w-10 items-center justify-center rounded-md bg-cyan-100 text-cyan-800 ring-8 ring-stone-50 sm:left-4">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">{time}</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-normal text-neutral-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="grid auto-rows-[190px] gap-4 sm:grid-cols-2">
            {[beachImage, gardenImage, arrivalImage].map((image, index) => (
              <figure
                key={image}
                className={`relative overflow-hidden rounded-lg bg-neutral-900 ${
                  index === 0 ? 'sm:row-span-2' : ''
                }`}
              >
                <Image
                  src={image}
                  alt={
                    index === 0
                      ? 'Vista de Cabañas Playa Terco cerca del mar'
                      : 'Ambiente tropical en Playa Terco'
                  }
                  fill
                  sizes={index === 0 ? '(min-width: 1024px) 32vw, 100vw' : '(min-width: 1024px) 24vw, 50vw'}
                  className="object-cover"
                />
              </figure>
            ))}
          </div>

          <div>
            <Badge className="bg-cyan-100 text-cyan-900 hover:bg-cyan-100">
              <Compass className="h-3 w-3" aria-hidden="true" />
              Antes de venir
            </Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-normal text-neutral-950 sm:text-4xl">
              Un viaje más fácil empieza con una conversación
            </h2>
            <p className="mt-5 text-sm leading-7 text-neutral-600">
              Te ayudamos a elegir fechas, entender la llegada y ajustar las experiencias a lo que
              busca tu grupo: descanso, naturaleza, fotos, comida local o simplemente playa.
            </p>
            <ul className="mt-6 space-y-3">
              {planningTips.map((tip) => (
                <li key={tip} className="flex gap-3 text-sm leading-6 text-neutral-700">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="bg-cyan-700 text-white hover:bg-cyan-800">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Escribir por WhatsApp
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/cabanas">
                  Ver cabañas
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cyan-950 py-14 text-white">
        <div className="container mx-auto flex flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Listo para sentir Playa Terco
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">
              Consulta disponibilidad y ven con ganas de bajar el ritmo
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild className="bg-white text-cyan-950 hover:bg-cyan-100">
              <Link href="/disponibilidad">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
                Ver disponibilidad
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/70 bg-white/10 text-white hover:bg-white hover:text-cyan-950"
            >
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
