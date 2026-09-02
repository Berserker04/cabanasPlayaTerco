'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { MAP_SLOT_LABELS } from '@/lib/cabin-utils';
import { MAP_FEATURE_LABELS } from '@/lib/map-features';
import type { AvailabilityTone, Cabin, MapSlot } from '@/types/cabin';
import type { MapFeatureKey } from '@/types/map-feature';

type CabinMapCabin = Pick<Cabin, 'id' | 'name' | 'slug' | 'map_slot' | 'status' | 'is_active'>;

export type CabinMapSlotState = {
  tone: AvailabilityTone;
  label: string;
  isAvailable?: boolean;
  leaderName?: string | null;
  displayColor?: string | null;
};

type SlotPoint = {
  id: MapSlot;
  left: number;
  top: number;
  width: number;
  height: number;
  lines: string[];
};

type StaticLabelPoint = Omit<SlotPoint, 'id'> & {
  id: MapFeatureKey;
};

const SLOT_POINTS: SlotPoint[] = [
  { id: 'cabana_6', left: 48.6, top: 11.0, width: 9.6, height: 5.2, lines: ['Cabaña 6', 'Piso 2'] },
  { id: 'cabana_5', left: 48.6, top: 19.4, width: 9.6, height: 5.2, lines: ['Cabaña 5', 'Piso 1'] },
  { id: 'cabana_8', left: 22.8, top: 27.5, width: 8.2, height: 4.8, lines: ['Cabaña 8'] },
  { id: 'cabana_4', left: 51.6, top: 31.8, width: 8.4, height: 4.8, lines: ['Cabaña 4'] },
  { id: 'cabana_7', left: 22.8, top: 38.0, width: 8.2, height: 4.8, lines: ['Cabaña 7'] },
  { id: 'cabana_3', left: 51.6, top: 43.9, width: 8.4, height: 4.8, lines: ['Cabaña 3'] },
  { id: 'cabana_2', left: 25.1, top: 53.0, width: 9.6, height: 5.2, lines: ['Cabaña 2', 'Piso 2'] },
  { id: 'cabana_1', left: 25.1, top: 61.4, width: 9.6, height: 5.2, lines: ['Cabaña 1', 'Piso 1'] },
];

const STATIC_LABEL_POINTS: StaticLabelPoint[] = [
  { id: 'kiosco', left: 22.0, top: 69.5, width: 7.2, height: 4.8, lines: ['Kiosco'] },
  { id: 'cocina_comedor', left: 52.0, top: 57.6, width: 12.2, height: 5.4, lines: ['Cocina', 'Comedor'] },
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

function stateBadgeTone(tone?: AvailabilityTone) {
  if (tone === 'green') {
    return 'bg-emerald-500';
  }

  if (tone === 'red') {
    return 'bg-red-500';
  }

  if (tone === 'orange') {
    return 'bg-amber-500';
  }

  if (tone === 'gray') {
    return 'bg-neutral-400';
  }

  return 'bg-white/70';
}

export function CabinMap({
  cabins = [],
  activeSlot,
  selectedSlot,
  selectedFeature,
  selectedSlots,
  slotStates,
  onSelectSlot,
  onSelectFeature,
  className,
  compactLabels = false,
  linkMarkers = false,
}: {
  cabins?: CabinMapCabin[];
  activeSlot?: MapSlot | null;
  selectedSlot?: MapSlot | null;
  selectedFeature?: MapFeatureKey | null;
  selectedSlots?: MapSlot[];
  slotStates?: Partial<Record<MapSlot, CabinMapSlotState>>;
  onSelectSlot?: (slot: MapSlot) => void;
  onSelectFeature?: (feature: MapFeatureKey) => void;
  className?: string;
  compactLabels?: boolean;
  linkMarkers?: boolean;
}) {
  const highlighted = activeSlot ?? selectedSlot ?? null;
  const hasActions = Boolean(onSelectSlot || linkMarkers);

  return (
    <figure
      className={cn(
        'relative min-w-[320px] overflow-hidden rounded-lg border bg-[#eef0c8] shadow-sm',
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
            {STATIC_LABEL_POINTS.map((labelPoint) => {
              const isFeatureActive = selectedFeature === labelPoint.id;
              const hasFeatureAction = Boolean(onSelectFeature);
              const minWidth = labelPoint.lines.length > 1 ? (compactLabels ? '64px' : '76px') : '52px';
              const maxWidth = labelPoint.lines.length > 1 ? '96px' : '62px';
              const minHeight = labelPoint.lines.length > 1 ? (compactLabels ? '26px' : '30px') : '22px';
              const maxHeight = labelPoint.lines.length > 1 ? '30px' : '24px';
              const style: CSSProperties = {
                left: `${labelPoint.left}%`,
                top: `${labelPoint.top}%`,
                minHeight: compactLabels
                  ? `clamp(${minHeight}, ${labelPoint.height * 0.64}%, ${maxHeight})`
                  : `max(${labelPoint.height}%, ${minHeight})`,
                width: compactLabels
                  ? `clamp(${minWidth}, ${labelPoint.width * 0.64}%, ${maxWidth})`
                  : `max(${labelPoint.width}%, ${minWidth})`,
              };

              const className = cn(
                'absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-[7px] border border-stone-500/50 bg-amber-50/95 text-center font-semibold leading-[1.05] text-stone-950 shadow-sm outline-none transition',
                compactLabels
                  ? 'px-0.5 text-[clamp(6.5px,1.8vw,12px)] sm:text-[clamp(7px,0.78vw,13px)]'
                  : 'px-1 text-[clamp(6.5px,1.8vw,12px)] sm:text-[clamp(7px,0.78vw,13px)]',
                hasFeatureAction
                  ? 'cursor-pointer hover:border-cyan-700 hover:bg-white hover:shadow-md focus-visible:border-cyan-700 focus-visible:ring-4 focus-visible:ring-cyan-200 focus-visible:ring-offset-2'
                  : 'pointer-events-none',
                isFeatureActive
                  ? 'border-cyan-700 bg-white ring-2 ring-cyan-700 ring-offset-2 ring-offset-white'
                  : '',
              );
              const content = (
                <span className="flex w-full flex-col items-center justify-center overflow-hidden px-0.5">
                  {labelPoint.lines.map((line, index) => (
                    <span
                      key={line}
                      className={cn(
                        'block max-w-full truncate whitespace-nowrap leading-[1.05]',
                        index > 0 ? 'text-[0.82em] font-medium' : '',
                      )}
                    >
                      {line}
                    </span>
                  ))}
                </span>
              );

              if (onSelectFeature) {
                return (
                  <button
                    key={labelPoint.id}
                    type="button"
                    aria-label={MAP_FEATURE_LABELS[labelPoint.id]}
                    aria-pressed={isFeatureActive}
                    className={className}
                    data-map-feature={labelPoint.id}
                    style={style}
                    onClick={() => onSelectFeature(labelPoint.id)}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <div
                  key={labelPoint.id}
                  aria-label={MAP_FEATURE_LABELS[labelPoint.id]}
                  className={className}
                  data-map-feature={labelPoint.id}
                  role="img"
                  style={style}
                >
                  {content}
                </div>
              );
            })}

            {SLOT_POINTS.map((slot) => {
              const cabin = slotCabin(cabins, slot.id);
              const slotState = slotStates?.[slot.id];
              const label = cabin?.name ?? MAP_SLOT_LABELS[slot.id];
              const isActive = highlighted === slot.id || selectedSlots?.includes(slot.id) === true;
              const minWidth = slot.lines.length > 1 ? (compactLabels ? '52px' : '58px') : '54px';
              const maxWidth = slot.lines.length > 1 ? '78px' : '72px';
              const minHeight = slot.lines.length > 1 ? (compactLabels ? '24px' : '28px') : '22px';
              const maxHeight = slot.lines.length > 1 ? '28px' : '24px';
              const style: CSSProperties = {
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                minHeight: compactLabels
                  ? `clamp(${minHeight}, ${slot.height * 0.66}%, ${maxHeight})`
                  : `max(${slot.height}%, ${minHeight})`,
                width: compactLabels
                  ? `clamp(${minWidth}, ${slot.width * 0.58}%, ${maxWidth})`
                  : `max(${slot.width}%, ${minWidth})`,
              };
              const markerStyle: CSSProperties = {
                ...style,
                ...(slotState?.displayColor
                  ? { boxShadow: `0 0 0 3px ${slotState.displayColor}` }
                  : {}),
              };
              const targetClassName = cn(
                'absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-[7px] border bg-white/95 text-center font-semibold leading-[1.05] text-neutral-950 shadow-sm outline-none transition',
                compactLabels
                  ? 'px-0.5 text-[clamp(6.5px,1.8vw,12px)] sm:text-[clamp(7px,0.78vw,13px)]'
                  : 'px-1 text-[clamp(6.5px,1.8vw,12px)] sm:text-[clamp(7px,0.78vw,13px)]',
                tagTone(cabin),
                hasActions
                  ? 'cursor-pointer hover:border-cyan-700 hover:bg-white hover:shadow-md focus-visible:border-cyan-700 focus-visible:ring-4 focus-visible:ring-cyan-200 focus-visible:ring-offset-2'
                  : 'pointer-events-none',
                isActive
                  ? 'border-cyan-700 bg-white ring-2 ring-cyan-700 ring-offset-2 ring-offset-white'
                  : '',
              );
              const content = (
                <span className="flex w-full flex-col items-center justify-center overflow-hidden px-0.5">
                  {slotState ? (
                    <span
                      className={cn(
                        'absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm sm:h-3 sm:w-3',
                        stateBadgeTone(slotState.tone),
                      )}
                      title={slotState.label}
                      aria-hidden="true"
                    />
                  ) : null}
                  {slot.lines.map((line, index) => (
                    <span
                      key={line}
                      className={cn(
                        'block max-w-full truncate whitespace-nowrap',
                        index > 0 ? 'text-[0.82em] font-medium leading-[1.05]' : 'leading-[1.05]',
                        slotState ? 'max-w-[calc(100%-0.6rem)]' : '',
                      )}
                    >
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
                    style={markerStyle}
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
                    style={markerStyle}
                    onClick={() => onSelectSlot(slot.id)}
                  >
                    {content}
                  </button>
                );
              }

              if (!isActive && !slotState) {
                return null;
              }

              return (
                <div
                  key={slot.id}
                  aria-label={label}
                  className={targetClassName}
                  data-map-slot={slot.id}
                  style={markerStyle}
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
