'use client';

import Link from 'next/link';
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Film,
  Images,
  MessageCircle,
  Search,
  Sparkles,
  Waves,
} from 'lucide-react';
import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { WHATSAPP_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@/types/api';
import { GALLERY_CATEGORIES, GALLERY_MEDIA_TYPES, type GalleryAlbum, type GalleryItem } from '@/types/gallery';

type FilterValue = 'all';
type EntryType = GalleryItem['type'] | 'album';
type TypeFilter = FilterValue | EntryType;

type GalleryEntry =
  | {
      entryType: 'album';
      album: GalleryAlbum;
      category: GalleryAlbum['category'];
      categoryLabel: string;
      featured: boolean;
      sortOrder: number;
      createdAt?: string;
    }
  | {
      entryType: GalleryItem['type'];
      item: GalleryItem;
      category: GalleryItem['category'];
      categoryLabel: string;
      featured: boolean;
      sortOrder: number;
      createdAt?: string;
    };

type AlbumViewer = {
  album: GalleryAlbum;
  items: GalleryItem[];
  index: number;
};

const fallbackHero = '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg';

export function GalleryExperience({
  albums,
  items,
}: {
  albums: GalleryAlbum[];
  items: GalleryItem[];
}) {
  const [category, setCategory] = useState<FilterValue | GalleryItem['category']>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [albumViewer, setAlbumViewer] = useState<AlbumViewer | null>(null);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [albumError, setAlbumError] = useState<string | null>(null);

  const standaloneItems = useMemo(
    () => items.filter((item) => item.gallery_album_id === null),
    [items],
  );

  const entries = useMemo<GalleryEntry[]>(() => {
    return [
      ...albums.map<GalleryEntry>((album) => ({
        entryType: 'album',
        album,
        category: album.category,
        categoryLabel: album.category_label,
        featured: album.is_featured,
        sortOrder: album.sort_order,
        createdAt: album.created_at,
      })),
      ...standaloneItems.map<GalleryEntry>((item) => ({
        entryType: item.type,
        item,
        category: item.category,
        categoryLabel: item.category_label,
        featured: item.is_featured,
        sortOrder: item.sort_order,
        createdAt: item.created_at,
      })),
    ].sort((first, second) => {
      if (first.sortOrder !== second.sortOrder) {
        return first.sortOrder - second.sortOrder;
      }

      if (first.featured !== second.featured) {
        return Number(second.featured) - Number(first.featured);
      }

      return (second.createdAt ?? '').localeCompare(first.createdAt ?? '');
    });
  }, [albums, standaloneItems]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesCategory = category === 'all' || entry.category === category;
      const matchesType = type === 'all' || entry.entryType === type;
      const searchableText =
        entry.entryType === 'album'
          ? `${entry.album.title} ${entry.album.description ?? ''} ${entry.album.category_label}`
          : `${entry.item.caption ?? ''} ${entry.item.alt ?? ''} ${entry.item.album?.title ?? ''} ${entry.item.category_label} ${entry.item.map_point_label ?? ''}`;
      const matchesSearch = normalizedSearch.length === 0 || searchableText.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesType && matchesSearch;
    });
  }, [category, entries, search, type]);

  const activeEntry = activeIndex === null ? null : filteredEntries[activeIndex] ?? null;
  const featuredAlbum = albums.find((album) => album.is_featured) ?? albums[0];
  const featuredImage = standaloneItems.find((item) => item.is_featured && item.type === 'image') ?? standaloneItems[0];
  const heroUrl = featuredAlbum?.cover_url ?? featuredImage?.thumbnail_url ?? featuredImage?.url ?? fallbackHero;
  const totalImages =
    standaloneItems.filter((item) => item.type === 'image').length +
    albums.reduce((total, album) => total + (album.images_count ?? 0), 0);
  const totalVideos =
    standaloneItems.filter((item) => item.type === 'video').length +
    albums.reduce((total, album) => total + (album.videos_count ?? 0), 0);
  const albumItem = albumViewer ? albumViewer.items[albumViewer.index] ?? null : null;

  function resetFilters() {
    setCategory('all');
    setType('all');
    setSearch('');
  }

  function closeLightbox() {
    setActiveIndex(null);
    setAlbumViewer(null);
    setAlbumError(null);
  }

  function moveMainLightbox(direction: -1 | 1) {
    if (activeIndex === null || filteredEntries.length === 0) {
      return;
    }

    setAlbumViewer(null);
    setAlbumError(null);
    setActiveIndex((activeIndex + direction + filteredEntries.length) % filteredEntries.length);
  }

  function moveAlbumViewer(direction: -1 | 1) {
    if (!albumViewer || albumViewer.items.length === 0) {
      return;
    }

    setAlbumViewer({
      ...albumViewer,
      index: (albumViewer.index + direction + albumViewer.items.length) % albumViewer.items.length,
    });
  }

  async function openAlbum(album: GalleryAlbum) {
    setAlbumLoading(true);
    setAlbumError(null);

    try {
      const loadedAlbum = album.items?.length
        ? album
        : (await api.get<ApiResponse<GalleryAlbum>>(`/gallery/albums/${album.slug}`)).data;
      const albumItems = loadedAlbum.items ?? [];

      if (albumItems.length === 0) {
        setAlbumError('Este album aun no tiene archivos visibles.');
        return;
      }

      setAlbumViewer({
        album: loadedAlbum,
        items: albumItems,
        index: 0,
      });
    } catch {
      setAlbumError('No pudimos abrir este album.');
    } finally {
      setAlbumLoading(false);
    }
  }

  return (
    <>
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroUrl})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,25,24,0.92),rgba(5,25,24,0.58),rgba(5,25,24,0.18))]" />
        <div className="container relative mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl">
            <Badge className="mb-5 bg-cyan-400 text-cyan-950 hover:bg-cyan-300">
              Galeria viva de Playa Terco
            </Badge>
            <h1 className="text-3xl font-bold tracking-normal sm:text-5xl">
              Fotos y videos para imaginar tu viaje antes de llegar
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-cyan-50 sm:text-lg">
              Explora cabanas, playa, naturaleza y momentos del Pacifico en un solo recorrido visual.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HeroStat icon={Images} label="Albumes" value={albums.length} />
              <HeroStat icon={Camera} label="Fotos" value={totalImages} />
              <HeroStat icon={Film} label="Videos" value={totalVideos} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-stone-50 py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-normal text-neutral-950">
                Momentos de Playa Terco
              </h2>
            </div>
            <div className="grid gap-3 lg:w-[560px] lg:grid-cols-[1fr_160px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por ambiente, album o descripcion"
                  className="bg-white pl-9"
                />
              </div>
              <Button asChild className="bg-cyan-600 text-white hover:bg-cyan-700">
                <Link href="/disponibilidad">
                  <CalendarDays className="h-4 w-4" />
                  Fechas
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <FilterButton active={category === 'all'} onClick={() => setCategory('all')}>
              Todas
            </FilterButton>
            {GALLERY_CATEGORIES.map((option) => (
              <FilterButton
                key={option.value}
                active={category === option.value}
                onClick={() => setCategory(option.value)}
              >
                {option.label}
              </FilterButton>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <FilterButton active={type === 'all'} onClick={() => setType('all')}>
              Todo
            </FilterButton>
            {GALLERY_MEDIA_TYPES.map((option) => (
              <FilterButton key={option.value} active={type === option.value} onClick={() => setType(option.value)}>
                {option.label}
              </FilterButton>
            ))}
            <FilterButton active={type === 'album'} onClick={() => setType('album')}>
              Albumes
            </FilterButton>
          </div>

          {filteredEntries.length > 0 ? (
            <div className="mt-8 columns-1 gap-4 sm:columns-2 xl:columns-3">
              {filteredEntries.map((entry, index) => (
                <GalleryTile
                  key={entry.entryType === 'album' ? `album-${entry.album.id}` : `item-${entry.item.id}`}
                  entry={entry}
                  index={index}
                  onOpen={() => setActiveIndex(index)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-dashed bg-white p-8 text-center">
              <Waves className="mx-auto h-8 w-8 text-cyan-700" />
              <h3 className="mt-4 text-lg font-semibold">No encontramos medios con esos filtros</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Cambia la busqueda o vuelve a ver toda la galeria.
              </p>
              <Button onClick={resetFilters} className="mt-5">
                Ver todo
              </Button>
            </div>
          )}
        </div>
      </section>

      <Dialog open={Boolean(activeEntry)} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-5xl">
          {activeEntry ? (
            <>
              <LightboxMedia
                entry={activeEntry}
                albumItem={albumItem}
                onPrevious={albumViewer ? () => moveAlbumViewer(-1) : () => moveMainLightbox(-1)}
                onNext={albumViewer ? () => moveAlbumViewer(1) : () => moveMainLightbox(1)}
                showNavigation={albumViewer ? albumViewer.items.length > 1 : filteredEntries.length > 1}
              />
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>{lightboxTitle(activeEntry, albumViewer)}</DialogTitle>
                  <DialogDescription>
                    {lightboxDescription(activeEntry, albumViewer)}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex flex-wrap gap-2">
                  <EntryBadges entry={activeEntry} albumItem={albumItem} />
                </div>
                {activeEntry.entryType === 'album' && !albumViewer ? (
                  <div className="mt-5 rounded-lg border bg-stone-50 p-4">
                    <p className="text-sm leading-6 text-neutral-700">
                      Este album tiene {activeEntry.album.items_count ?? 0} archivos. Puedes abrirlo para ver sus fotos
                      y videos, o seguir navegando la galeria principal.
                    </p>
                    {albumError ? <p className="mt-3 text-sm text-destructive">{albumError}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={() => openAlbum(activeEntry.album)} disabled={albumLoading}>
                        {albumLoading ? null : <Images className="h-4 w-4" />}
                        {albumLoading ? 'Abriendo...' : 'Abrir album'}
                      </Button>
                      <Button variant="outline" onClick={() => moveMainLightbox(1)}>
                        Seguir galeria
                      </Button>
                    </div>
                  </div>
                ) : null}
                <DialogFooter className="mt-6">
                  {albumViewer ? (
                    <Button variant="outline" onClick={() => setAlbumViewer(null)}>
                      Cerrar album
                    </Button>
                  ) : null}
                  <Button variant="outline" asChild>
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </Button>
                  <Button asChild>
                    <Link href="/disponibilidad">Consultar fechas</Link>
                  </Button>
                </DialogFooter>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function LightboxMedia({
  entry,
  albumItem,
  onPrevious,
  onNext,
  showNavigation,
}: {
  entry: GalleryEntry;
  albumItem: GalleryItem | null;
  onPrevious: () => void;
  onNext: () => void;
  showNavigation: boolean;
}) {
  const item = albumItem ?? (entry.entryType === 'album' ? null : entry.item);
  const album = entry.entryType === 'album' ? entry.album : null;

  return (
    <div className="relative bg-neutral-950">
      {item ? (
        item.type === 'video' ? (
          <video src={item.url} controls className="max-h-[72vh] w-full bg-black object-contain" />
        ) : (
          <img
            src={item.url}
            alt={item.alt ?? item.caption ?? 'Imagen de Cabanas Playa Terco'}
            className="max-h-[72vh] w-full object-contain"
          />
        )
      ) : (
        <div className="relative">
          <img
            src={album?.cover_url ?? fallbackHero}
            alt={album?.title ?? 'Album de Cabanas Playa Terco'}
            className="max-h-[72vh] w-full object-contain"
          />
          <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-2 text-sm font-semibold text-neutral-950">
            <Images className="mr-1 inline h-4 w-4" />
            Album
          </div>
        </div>
      )}
      {showNavigation ? (
        <>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90"
            onClick={onPrevious}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Anterior</span>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90"
            onClick={onNext}
          >
            <ChevronRight className="h-5 w-5" />
            <span className="sr-only">Siguiente</span>
          </Button>
        </>
      ) : null}
    </div>
  );
}

function GalleryTile({
  entry,
  index,
  onOpen,
}: {
  entry: GalleryEntry;
  index: number;
  onOpen: () => void;
}) {
  const tall = index % 5 === 0;
  const wide = index % 7 === 0;
  const mediaUrl =
    entry.entryType === 'album'
      ? entry.album.cover_url ?? fallbackHero
      : entry.item.thumbnail_url ?? entry.item.url;
  const title =
    entry.entryType === 'album'
      ? entry.album.title
      : entry.item.caption ??
        entry.item.alt ??
        entry.item.map_point_label ??
        entry.item.album?.title ??
        entry.item.category_label;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg bg-neutral-900 text-left shadow-sm',
        tall ? 'aspect-[3/4]' : wide ? 'aspect-[4/3]' : 'aspect-square',
      )}
    >
      {entry.entryType === 'video' ? (
        <video src={entry.item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      ) : (
        <img
          src={mediaUrl}
          alt={title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/82 via-neutral-950/10 to-transparent opacity-90" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge className="bg-white/92 text-neutral-950 hover:bg-white">
            {entry.entryType === 'album' ? (
              <Images className="h-3 w-3" />
            ) : entry.entryType === 'video' ? (
              <Film className="h-3 w-3" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
            {entry.entryType === 'album' ? 'Album' : entry.entryType === 'video' ? 'Video' : 'Foto'}
          </Badge>
          {entry.featured ? (
            <Badge className="bg-cyan-400 text-cyan-950 hover:bg-cyan-300">
              <Sparkles className="h-3 w-3" />
              Destacado
            </Badge>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm font-medium leading-5">{title}</p>
        {entry.entryType === 'album' ? (
          <p className="mt-1 text-xs text-white/82">
            {entry.album.items_count ?? 0} archivos
          </p>
        ) : null}
      </div>
    </button>
  );
}

function EntryBadges({ entry, albumItem }: { entry: GalleryEntry; albumItem: GalleryItem | null }) {
  if (albumItem) {
    return (
      <>
        <Badge variant="outline">{albumItem.category_label}</Badge>
        {albumItem.map_point_label ? <Badge variant="outline">{albumItem.map_point_label}</Badge> : null}
        <Badge variant="outline">{albumItem.type === 'video' ? 'Video' : 'Foto'}</Badge>
      </>
    );
  }

  return (
    <>
      <Badge variant="outline">{entry.categoryLabel}</Badge>
      {entry.entryType !== 'album' && entry.item.map_point_label ? (
        <Badge variant="outline">{entry.item.map_point_label}</Badge>
      ) : null}
      <Badge variant="outline">
        {entry.entryType === 'album' ? 'Album' : entry.entryType === 'video' ? 'Video' : 'Foto'}
      </Badge>
    </>
  );
}

function lightboxTitle(entry: GalleryEntry, albumViewer: AlbumViewer | null) {
  if (albumViewer) {
    return albumViewer.album.title;
  }

  if (entry.entryType === 'album') {
    return entry.album.title;
  }

  return entry.item.map_point_label ?? entry.item.album?.title ?? 'Galeria Playa Terco';
}

function lightboxDescription(entry: GalleryEntry, albumViewer: AlbumViewer | null) {
  if (albumViewer) {
    const item = albumViewer.items[albumViewer.index];

    return item?.caption ?? item?.alt ?? albumViewer.album.description ?? albumViewer.album.category_label;
  }

  if (entry.entryType === 'album') {
    return entry.album.description ?? entry.album.category_label;
  }

  return entry.item.caption ?? entry.item.alt ?? entry.item.map_point_label ?? entry.item.category_label;
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-2 text-sm font-medium transition',
        active
          ? 'border-cyan-700 bg-cyan-700 text-white'
          : 'border-neutral-200 bg-white text-neutral-700 hover:border-cyan-300 hover:text-cyan-800',
      )}
    >
      {children}
    </button>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
      <Icon className="mb-3 h-5 w-5 text-cyan-200" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-cyan-100">{label}</p>
    </div>
  );
}
