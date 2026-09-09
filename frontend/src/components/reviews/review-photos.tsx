'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  ImagePlus,
  Maximize2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError } from './review-ui';
import {
  MAX_REVIEW_IMAGES,
  REVIEW_IMAGE_TYPES,
  validateReviewImages,
} from '@/lib/review-utils';
import { cn } from '@/lib/utils';

type Photo = { id: string | number; url: string; alt?: string | null };

function PhotoImage({ photo, full = false }: { photo: Photo; full?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span
        role="img"
        aria-label="Imagen no disponible"
        className="flex h-full min-h-20 w-full flex-col items-center justify-center gap-2 bg-neutral-100 p-2 text-xs text-neutral-600"
      >
        <ImageOff className="size-5" />
        Imagen no disponible
      </span>
    );
  // Blob URLs and original storage URLs are displayed without an optimization proxy.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.url}
      alt={photo.alt || 'Foto de la reseña'}
      loading={full ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(
        'h-full w-full',
        full
          ? 'max-h-[65dvh] object-contain'
          : 'object-cover transition duration-200 group-hover:scale-105',
      )}
    />
  );
}

export function ReviewPhotos({
  photos,
  compact = false,
  onRemove,
  disabled,
}: {
  photos: readonly Photo[];
  compact?: boolean;
  onRemove?: (id: Photo['id']) => void;
  disabled?: boolean;
}) {
  const [activeId, setActiveId] = useState<Photo['id'] | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const index = photos.findIndex((photo) => photo.id === activeId);
  const active = photos[index];
  function move(direction: number) {
    setActiveId(photos[(index + direction + photos.length) % photos.length].id);
  }
  if (!photos.length) return null;
  return (
    <>
      <div
        className={cn(
          'grid gap-2',
          compact
            ? 'max-w-56 grid-cols-3'
            : photos.length === 1
              ? 'max-w-sm grid-cols-1'
              : photos.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-3',
        )}
      >
        {photos.map((photo, i) => (
          <div key={photo.id} className="min-w-0 space-y-2">
            <button
              type="button"
              onClick={(e) => {
                trigger.current = e.currentTarget;
                setActiveId(photo.id);
              }}
              aria-label={`Ampliar foto ${i + 1} de ${photos.length}`}
              className={cn(
                'group relative block w-full overflow-hidden rounded-lg bg-neutral-100 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-cyan-700',
                compact ? 'aspect-square' : 'aspect-[4/3]',
              )}
            >
              <PhotoImage key={photo.url} photo={photo} />
              <span className="absolute bottom-2 right-2 rounded bg-black/60 p-1 text-white">
                <Maximize2
                  className={compact ? 'size-3' : 'size-4'}
                  aria-hidden="true"
                />
              </span>
            </button>
            {onRemove && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={disabled}
                onClick={() => onRemove(photo.id)}
                aria-label={`Quitar foto ${i + 1}`}
              >
                <X className="size-3" />
                Quitar
              </Button>
            )}
          </div>
        ))}
      </div>
      <Dialog
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
      >
        <DialogContent
          closeLabel="Cerrar"
          className="max-h-[94dvh] overflow-y-auto sm:max-w-4xl"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            trigger.current?.focus();
          }}
          onKeyDown={(e) => {
            if (
              photos.length > 1 &&
              (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
            ) {
              e.preventDefault();
              e.stopPropagation();
              move(e.key === 'ArrowLeft' ? -1 : 1);
            }
          }}
        >
          <DialogHeader className="pr-8">
            <DialogTitle>Fotos de la reseña</DialogTitle>
            <DialogDescription>
              Imágenes compartidas por el viajero.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="flex h-[55dvh] min-h-40 items-center justify-center overflow-hidden rounded-lg bg-neutral-950">
              <PhotoImage key={active.url} photo={active} full />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={photos.length < 2}
              onClick={() => move(-1)}
              aria-label="Foto anterior"
            >
              <ChevronLeft />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {index + 1} de {photos.length}
            </span>
            <Button
              variant="outline"
              disabled={photos.length < 2}
              onClick={() => move(1)}
              aria-label="Foto siguiente"
            >
              Siguiente
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilePreview({
  file,
  index,
  onRemove,
  disabled,
}: {
  file: File;
  index: number;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    // Synchronize a browser-managed resource; revoke it when the file is removed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  return (
    <div className="relative min-w-0">
      <div className="aspect-square overflow-hidden rounded-lg border bg-neutral-100">
        {url && (
          <PhotoImage
            photo={{ id: index, url, alt: `Vista previa: ${file.name}` }}
          />
        )}
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        className="absolute right-1 top-1 shadow"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Quitar ${file.name}`}
      >
        <X className="size-4" />
      </Button>
      <p
        className="mt-1 truncate text-xs text-muted-foreground"
        title={file.name}
      >
        {file.name}
      </p>
    </div>
  );
}

export function ReviewImagePicker({
  files,
  onChange,
  existingCount = 0,
  disabled,
  error,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  existingCount?: number;
  disabled?: boolean;
  error?: string;
}) {
  const id = useId();
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const count = existingCount + files.length;
  const countError =
    count > MAX_REVIEW_IMAGES
      ? 'Esta reseña ya no tiene cupo para todas las fotos seleccionadas. Quita las sobrantes.'
      : null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          Fotos{' '}
          <span className="font-normal text-muted-foreground">
            (opcionales)
          </span>
        </label>
        <span className="text-xs font-medium text-cyan-800" aria-live="polite">
          {count} de 3
        </span>
      </div>
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, i) => (
            <FilePreview
              key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
              file={file}
              index={i}
              disabled={disabled}
              onRemove={() => {
                onChange(files.filter((_, index) => index !== i));
                setSelectionError(null);
              }}
            />
          ))}
        </div>
      )}
      <label
        className={cn(
          'relative flex min-h-14 items-center justify-center gap-2 rounded-lg border border-dashed border-cyan-300 bg-cyan-50/40 px-3 py-3 text-sm font-medium text-cyan-900 focus-within:ring-2 focus-within:ring-cyan-700',
          disabled || count >= 3
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:bg-cyan-50',
        )}
      >
        <ImagePlus className="size-5 shrink-0" aria-hidden="true" />
        {count >= 3
          ? 'Límite de 3 fotos alcanzado'
          : files.length
            ? 'Añadir más fotos'
            : 'Seleccionar fotos'}
        <input
          id={id}
          type="file"
          accept={REVIEW_IMAGE_TYPES.join(',')}
          multiple
          className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          disabled={disabled || count >= 3}
          aria-describedby={`${id}-help${selectionError || error || countError ? ` ${id}-error` : ''}`}
          onChange={(e) => {
            const selected = Array.from(e.currentTarget.files ?? []);
            e.currentTarget.value = '';
            if (!selected.length) return;
            const nextError = validateReviewImages(selected, count);
            setSelectionError(nextError);
            if (!nextError) onChange([...files, ...selected]);
          }}
        />
      </label>
      <p id={`${id}-help`} className="text-xs leading-5 text-muted-foreground">
        Hasta 3 fotos en total. JPG, PNG o WebP · máximo 10 MB por foto.{' '}
        {existingCount > 0 && `${existingCount} ya guardadas.`}
      </p>
      <FieldError id={`${id}-error`}>
        {selectionError || countError || error}
      </FieldError>
    </div>
  );
}
