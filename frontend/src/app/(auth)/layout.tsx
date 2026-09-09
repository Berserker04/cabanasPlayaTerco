import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, MapPin, ShieldCheck, Waves } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-svh bg-[#f4f8f7] lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,0.92fr)]">
      <aside className="relative hidden min-h-svh overflow-hidden bg-cyan-950 lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <Image
          src="/assets/imagenes/511133396_9990216891027933_4540081246476097597_n.jpg"
          alt="Atardecer entre palmeras frente al mar en Playa Terco"
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 0px"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,30,28,0.32)_0%,rgba(2,25,24,0.24)_36%,rgba(2,24,23,0.88)_100%)]" />
        <div
          className="absolute -bottom-24 -right-24 size-80 rounded-full border border-cyan-200/20"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-10 -right-10 size-52 rounded-full border border-cyan-200/25"
          aria-hidden="true"
        />

        <Link
          href="/"
          className="relative z-10 inline-flex w-fit items-center gap-3 rounded-2xl bg-white/92 px-4 py-2.5 text-cyan-950 shadow-lg backdrop-blur transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70"
        >
          <Image
            src="/assets/terco_logo_nav.png"
            alt=""
            width={500}
            height={328}
            className="h-11 w-[67px] object-contain"
          />
          <span className="pr-1 text-sm font-bold tracking-tight">Cabañas Playa Terco</span>
        </Link>

        <div className="relative z-10 max-w-xl text-white">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-50 backdrop-blur-sm">
            <MapPin className="size-4" aria-hidden="true" />
            Playa Terco · Nuquí
          </div>
          <h2 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.035em] xl:text-5xl">
            Tu lugar frente al Pacífico te espera.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-cyan-50/90 xl:text-lg xl:leading-8">
            Consulta tus reservas y vuelve a conectar con la calma, la selva y el mar del Chocó.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm font-medium text-cyan-50/90">
            <span className="flex size-9 items-center justify-center rounded-full bg-cyan-300 text-cyan-950">
              <Waves className="size-5" aria-hidden="true" />
            </span>
            Un paraíso frente al mar
          </div>
        </div>
      </aside>

      <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-8 sm:px-10 lg:px-12 xl:px-20">
        <div
          className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full bg-cyan-200/30 blur-3xl lg:hidden"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-36 -left-28 size-80 rounded-full bg-amber-100/60 blur-3xl lg:hidden"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-[430px]">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-600/20"
            >
              <Image
                src="/assets/terco_logo_nav.png"
                alt=""
                width={500}
                height={328}
                priority
                className="h-12 w-[73px] object-contain"
              />
              <span className="text-sm font-bold tracking-tight text-cyan-950">Playa Terco</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-900/70">
              <MapPin className="size-3.5" aria-hidden="true" />
              Nuquí
            </span>
          </div>

          <Link
            href="/"
            className="mb-8 hidden w-fit items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-cyan-800 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-600/20 lg:inline-flex"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al sitio
          </Link>

          {children}

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-neutral-200/80 pt-4 text-xs text-neutral-500">
            <ShieldCheck className="size-4 text-cyan-700" aria-hidden="true" />
            Acceso seguro a tu cuenta de Playa Terco
          </div>
        </div>
      </section>
    </main>
  );
}
