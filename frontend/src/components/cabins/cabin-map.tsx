'use client';

import Image from 'next/image';
import { useRef, useState, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import { stayHref, type StayContext } from '@/lib/stay-context';
import { Button } from '@/components/ui/button';
import type {
  AvailabilityTone,
  Cabin,
  CabinMapPoint,
  MapSlot,
  PublicCabin,
} from '@/types/cabin';
import type { MapFeatureKey } from '@/types/map-feature';

type MapCabin = Pick<
  PublicCabin,
  'id' | 'name' | 'slug' | 'map_slot' | 'map_point'
> &
  Partial<Pick<Cabin, 'status' | 'is_active' | 'deleted_at'>>;
export type CabinMapSlotState = {
  tone: AvailabilityTone;
  label: string;
  isAvailable?: boolean;
  leaderName?: string | null;
  displayColor?: string | null;
};
const features: { key: MapFeatureKey; label: string; x: number; y: number }[] =
  [
    { key: 'kiosco', label: 'Kiosco', x: 22, y: 69.5 },
    { key: 'cocina_comedor', label: 'Cocina / Comedor', x: 52, y: 57.6 },
  ];

export function CabinMap({
  cabins = [],
  points,
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
  context = {},
  onPlacePoint,
  onMovePoint,
}: {
  cabins?: MapCabin[];
  points?: CabinMapPoint[];
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
  context?: StayContext;
  onPlacePoint?: (x: number, y: number) => void;
  onMovePoint?: (key: MapSlot, x: number, y: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const canvas = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ key: string; moved: boolean } | null>(null);
  const mapPoints =
    points ??
    cabins.flatMap((cabin) => (cabin.map_point ? [cabin.map_point] : []));
  const coordinates = (event: { clientX: number; clientY: number }) => {
    const rect = canvas.current!.getBoundingClientRect();
    const clamp = (n: number) =>
      Math.round(Math.max(0, Math.min(100, n)) * 100) / 100;
    return [
      clamp(((event.clientX - rect.left) / rect.width) * 100),
      clamp(((event.clientY - rect.top) / rect.height) * 100),
    ] as const;
  };
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging.current || !onMovePoint || event.buttons !== 1) return;
    dragging.current.moved = true;
    onMovePoint(dragging.current.key, ...coordinates(event));
  }
  return (
    <figure
      className={cn(
        'min-w-0 overflow-hidden rounded-lg border bg-[#eef0c8]',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-white p-2">
        <span className="text-xs text-muted-foreground">
          Mapa completo · amplía y desplázate para ver los detalles
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Reducir mapa"
            disabled={zoom <= 1}
            onClick={() => setZoom(Math.max(1, zoom - 0.5))}
          >
            −
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setZoom(1)}
          >
            Ajustar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Ampliar mapa"
            disabled={zoom >= 4}
            onClick={() => setZoom(Math.min(4, zoom + 0.5))}
          >
            +
          </Button>
        </div>
      </div>
      <div className="max-h-[70dvh] overflow-auto overscroll-contain">
        <div
          ref={canvas}
          className={cn(
            'relative aspect-[1672/941]',
            onPlacePoint && 'cursor-crosshair',
          )}
          style={{ width: `${zoom * 100}%` }}
          onClick={(event) => {
            if (event.target === event.currentTarget && onPlacePoint)
              onPlacePoint(...coordinates(event));
          }}
        >
          <Image
            src="/assets/mapa_terco.png"
            alt="Mapa de Playa Terco, playa, senderos y cabañas"
            fill
            unoptimized
            sizes="100vw"
            className="pointer-events-none object-contain"
          />
          {features.map((feature) => (
            <button
              key={feature.key}
              type="button"
              disabled={!onSelectFeature}
              onClick={() => onSelectFeature?.(feature.key)}
              aria-pressed={selectedFeature === feature.key}
              data-map-feature={feature.key}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 rounded border border-stone-500 bg-amber-50 px-1 py-0.5 text-[clamp(7px,1.2vw,12px)] font-semibold text-stone-950 focus-visible:ring-4 focus-visible:ring-cyan-500',
                selectedFeature === feature.key && 'ring-2 ring-cyan-700',
              )}
              style={{ left: `${feature.x}%`, top: `${feature.y}%` }}
            >
              {feature.label}
            </button>
          ))}
          {mapPoints.map((point) => {
            const cabin = cabins.find((item) => item.map_slot === point.key);
            const state = slotStates?.[point.key];
            const selected =
              (activeSlot ?? selectedSlot) === point.key ||
              selectedSlots?.includes(point.key);
            const label = cabin?.name ?? (point.label || 'Nuevo punto');
            const markerClass = cn(
              'absolute -translate-x-1/2 -translate-y-1/2 rounded border bg-white/95 px-1 py-0.5 text-center font-semibold text-neutral-950 shadow-sm focus-visible:ring-4 focus-visible:ring-cyan-500',
              compactLabels
                ? 'text-[clamp(7px,1vw,12px)]'
                : 'text-[clamp(7px,1.2vw,14px)]',
              selected && 'z-10 ring-2 ring-cyan-700 ring-offset-1',
              cabin?.deleted_at &&
                'border-dashed border-slate-600 bg-slate-100',
              onMovePoint && 'touch-none cursor-move',
            );
            const style = {
              left: `${point.x}%`,
              top: `${point.y}%`,
              maxWidth: '22%',
              boxShadow: state?.displayColor
                ? `0 0 0 3px ${state.displayColor}`
                : undefined,
            };
            const content = (
              <>
                <span className="block truncate">
                  {point.label || 'Nuevo punto'}
                </span>
                {state && (
                  <span
                    className={cn(
                      'block text-[0.8em]',
                      state.tone === 'green'
                        ? 'text-emerald-800'
                        : state.tone === 'red'
                          ? 'text-red-700'
                          : 'text-amber-800',
                    )}
                  >
                    {state.label}
                  </span>
                )}
              </>
            );
            if (linkMarkers && cabin?.slug)
              return (
                <a
                  key={point.key}
                  href={stayHref(`/cabanas/${cabin.slug}`, {
                    ...context,
                    cabin_id: String(cabin.id),
                  })}
                  aria-label={`Ver ${label}`}
                  data-map-slot={point.key}
                  className={markerClass}
                  style={style}
                >
                  {content}
                </a>
              );
            return (
              <button
                key={point.key}
                type="button"
                aria-label={label}
                aria-pressed={Boolean(selected)}
                data-map-slot={point.key}
                className={markerClass}
                style={style}
                onPointerDown={(event) => {
                  if (onMovePoint) {
                    dragging.current = { key: point.key, moved: false };
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onSelectSlot?.(point.key);
                  }
                }}
                onPointerMove={move}
                onPointerCancel={() => {
                  dragging.current = null;
                }}
                onPointerUp={(event) => {
                  if (
                    onMovePoint &&
                    event.currentTarget.hasPointerCapture(event.pointerId)
                  )
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onClick={() => {
                  const moved = dragging.current?.moved;
                  dragging.current = null;
                  if (!moved) onSelectSlot?.(point.key);
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
      {(onSelectSlot || linkMarkers) && (
        <figcaption
          className="flex flex-wrap gap-2 border-t bg-white p-3"
          aria-label="Ubicaciones del mapa"
        >
          {mapPoints.map((point) => {
            const cabin = cabins.find((item) => item.map_slot === point.key);
            return linkMarkers && cabin?.slug ? (
              <a
                className="rounded border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-cyan-600"
                key={point.key}
                href={stayHref(`/cabanas/${cabin.slug}`, {
                  ...context,
                  cabin_id: String(cabin.id),
                })}
              >
                {cabin.name}
              </a>
            ) : (
              <Button
                type="button"
                key={point.key}
                variant={selectedSlot === point.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelectSlot?.(point.key)}
              >
                {point.label || 'Nuevo punto'}
                {cabin?.deleted_at ? ' · Eliminada' : ''}
              </Button>
            );
          })}
        </figcaption>
      )}
    </figure>
  );
}
