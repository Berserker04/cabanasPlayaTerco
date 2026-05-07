'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { MAP_SLOT_LABELS } from '@/lib/cabin-utils';
import type { Cabin, MapSlot } from '@/types/cabin';

type CabinMapCabin = Pick<Cabin, 'id' | 'name' | 'slug' | 'map_slot' | 'status' | 'is_active'>;

type SlotPoint = {
  id: MapSlot;
  left: number;
  top: number;
  width: number;
  height: number;
  lines: string[];
};

const SLOT_POINTS: SlotPoint[] = [
  { id: 'cabana_6', left: 47.2, top: 11.2, width: 8.8, height: 4.8, lines: ['Cabaña 6 piso 2'] },
  { id: 'cabana_5', left: 47.2, top: 18.2, width: 8.8, height: 4.8, lines: ['Cabaña 5 piso 1'] },
  { id: 'cabana_8', left: 23.8, top: 27.5, width: 5.6, height: 4.3, lines: ['Cabaña 8'] },
  { id: 'cabana_4', left: 51.6, top: 31.8, width: 6.5, height: 4.3, lines: ['Cabaña 4'] },
  { id: 'cabana_7', left: 23.8, top: 38.0, width: 5.6, height: 4.3, lines: ['Cabaña 7'] },
  { id: 'cabana_3', left: 51.6, top: 43.9, width: 6.5, height: 4.3, lines: ['Cabaña 3'] },
  { id: 'cabana_2', left: 25.2, top: 53.9, width: 8.8, height: 4.8, lines: ['Cabaña 2 piso 2'] },
  { id: 'cabana_1', left: 25.2, top: 60.7, width: 8.8, height: 4.8, lines: ['Cabaña 1 piso 1'] },
];

function slotCabin(cabins: CabinMapCabin[], slot: MapSlot) {
  return cabins.find((cabin) => cabin.map_slot === slot);
}

function tagTone(cabin?: CabinMapCabin) {
  if (cabin?.status === 'maintenance') {
    return 'border-amber-500/80';
  }

  if (cabin?.is_active === false) {
    return 'border-slate-400/80 text-slate-600';
  }

  return 'border-neutral-300/90';
}

export function CabinMap({
  cabins = [],
  activeSlot,
  selectedSlot,
  onSelectSlot,
  className,
  linkMarkers = false,
}: {
  cabins?: CabinMapCabin[];
  activeSlot?: MapSlot | null;
  selectedSlot?: MapSlot | null;
  onSelectSlot?: (slot: MapSlot) => void;
  className?: string;
  linkMarkers?: boolean;
}) {
  const highlighted = activeSlot ?? selectedSlot ?? null;
  const hasActions = Boolean(onSelectSlot || linkMarkers);

  return (
    <figure
      className={cn(
        'relative overflow-hidden rounded-lg border bg-[#eef0c8] shadow-sm',
        className,
      )}
    >
      <div className="relative h-[96vw] min-h-[320px] w-full overflow-hidden sm:aspect-[1672/941] sm:h-auto sm:min-h-0">
        <div className="absolute left-1/2 top-1/2 aspect-[1672/941] w-[190%] -translate-x-[42%] -translate-y-[47%] sm:w-[135%] sm:-translate-x-[46%] md:w-full md:-translate-x-1/2 md:-translate-y-1/2">
          <Image
            src="/assets/mapa_terco.png"
            alt="Mapa de Cabañas Playa Terco con playa, mar, zona verde, caminos y ubicacion de las cabañas"
            fill
            unoptimized
            priority={Boolean(activeSlot)}
            sizes="(min-width: 768px) 100vw, 190vw"
            className="object-cover"
          />

          <div className="absolute inset-0" aria-label="Puntos interactivos del mapa">
            {SLOT_POINTS.map((slot) => {
              const cabin = slotCabin(cabins, slot.id);
              const label = cabin?.name ?? MAP_SLOT_LABELS[slot.id];
              const isActive = highlighted === slot.id;
              const style = {
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                width: `${slot.width}%`,
                height: `${slot.height}%`,
              };
              const targetClassName = cn(
                'absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-[7px] border bg-white/95 px-1 text-center text-[clamp(6.5px,1.8vw,12px)] font-semibold leading-[1.05] text-neutral-950 shadow-sm outline-none transition sm:text-[clamp(7px,0.78vw,13px)]',
                tagTone(cabin),
                hasActions
                  ? 'cursor-pointer hover:border-cyan-700 hover:bg-white hover:shadow-md focus-visible:border-cyan-700 focus-visible:ring-4 focus-visible:ring-cyan-200 focus-visible:ring-offset-2'
                  : 'pointer-events-none',
                isActive
                  ? 'border-cyan-700 bg-white ring-2 ring-cyan-700 ring-offset-2 ring-offset-white'
                  : '',
              );
              const content = (
                <span className="flex h-full w-full flex-col items-center justify-center overflow-hidden">
                  {slot.lines.map((line) => (
                    <span key={line} className="block max-w-full whitespace-normal [text-wrap:balance]">
                      {line}
                    </span>
                  ))}
                </span>
              );

              if (linkMarkers && cabin?.slug) {
                return (
                  <a
                    key={slot.id}
                    href={`/cabanas/${cabin.slug}`}
                    aria-label={`Ver ${label}`}
                    aria-current={isActive ? 'location' : undefined}
                    className={targetClassName}
                    data-map-slot={slot.id}
                    style={style}
                  >
                    {content}
                  </a>
                );
              }

              if (onSelectSlot) {
                return (
                  <button
                    key={slot.id}
                    type="button"
                    aria-label={label}
                    aria-pressed={isActive}
                    className={targetClassName}
                    data-map-slot={slot.id}
                    style={style}
                    onClick={() => onSelectSlot(slot.id)}
                  >
                    {content}
                  </button>
                );
              }

              if (!isActive) {
                return null;
              }

              return (
                <div
                  key={slot.id}
                  aria-label={label}
                  className={targetClassName}
                  data-map-slot={slot.id}
                  style={style}
                  role="img"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </figure>
  );
}
