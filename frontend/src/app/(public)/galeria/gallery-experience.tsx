'use client';

import Link from 'next/link';
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Film,
  Grid3X3,
  ImageIcon,
  MessageCircle,
  Search,
  Sparkles,
  Waves,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { GALLERY_CATEGORIES, GALLERY_MEDIA_TYPES, type GalleryAlbum, type GalleryItem } from '@/types/gallery';
import { WHATSAPP_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';

type FilterValue = 'all';

const fallbackHero = '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg';

export function GalleryExperience({
  albums,
  items,
}: {
  albums: GalleryAlbum[];
  items: GalleryItem[];
}) {
  const [category, setCategory] = useState<FilterValue | GalleryItem['category']>('all');
  const [albumId, setAlbumId] = useState<FilterValue | string>('all');
  const [type, setType] = useState<FilterValue | GalleryItem['type']>('all');
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const featuredAlbum = useMemo(
    () => albums.find((album) => album.is_featured) ?? albums[0],
    [albums],
  );

  const heroItem = useMemo(() => {
    if (!featuredAlbum) {
      return items.find((item) => item.is_featured) ?? items[0];
    }

    return (
      items.find((item) => item.gallery_album_id === featuredAlbum.id && item.is_featured) ??
      items.find((item) => item.gallery_album_id === featuredAlbum.id) ??
      items.find((item) => item.is_featured) ??
      items[0]
    );
  }, [featuredAlbum, items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category;
      const matchesAlbum = albumId === 'all' || String(item.gallery_album_id) === albumId;
      const matchesType = type === 'all' || item.type === type;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        (item.caption ?? '').toLowerCase().includes(normalizedSearch) ||
        (item.alt ?? '').toLowerCase().includes(normalizedSearch) ||
        (item.album?.title ?? '').toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesAlbum && matchesType && matchesSearch;
    });
  }, [albumId, category, items, search, type]);

  const activeItem = activeIndex === null ? null : filteredItems[activeIndex] ?? null;
  const heroUrl = heroItem?.thumbnail_url ?? heroItem?.url ?? featuredAlbum?.cover_url ?? fallbackHero;
  const totalVideos = items.filter((item) => item.type === 'video').length;

  function openAlbum(album: GalleryAlbum) {
    setAlbumId(String(album.id));
    setCategory('all');
    setType('all');
  }

  function resetFilters() {
    setAlbumId('all');
    setCategory('all');
    setType('all');
    setSearch('');
  }

  function moveLightbox(direction: -1 | 1) {
    if (activeIndex === null || filteredItems.length === 0) {
      return;
    }

    setActiveIndex((activeIndex + direction + filteredItems.length) % filteredItems.length);
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
              Explora albumes de cabanas, playa, naturaleza y momentos del Pacifico. Todo esta
              organizado para que encuentres rapido el ambiente que quieres vivir.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HeroStat icon={ImageIcon} label="Albumes" value={albums.length} />
              <HeroStat icon={Camera} label="Fotos" value={items.length - totalVideos} />
              <HeroStat icon={Film} label="Videos" value={totalVideos} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
                Albumes
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-neutral-950">
                Recorridos visuales por experiencia
              </h2>
            </div>
            <Button variant="outline" onClick={resetFilters}>
              <Grid3X3 className="h-4 w-4" />
              Ver todo
            </Button>
          </div>

          {albums.length > 0 ? (
            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {albums.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => openAlbum(album)}
                  className={cn(
                    'group overflow-hidden rounded-lg border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                    albumId === String(album.id) && 'ring-2 ring-cyan-500',
                  )}
                >
                  <div
                    className="aspect-[4/3] bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                    style={{ backgroundImage: `url(${album.cover_url ?? fallbackHero})` }}
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold tracking-normal text-neutral-950">
                        {album.title}
                      </h3>
                      {album.is_featured ? (
                        <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Destacado</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
                      {album.description ?? album.category_label}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-600">
                      <span>{album.images_count ?? 0} fotos</span>
                      <span>{album.videos_count ?? 0} videos</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyGallery />
          )}
        </div>
      </section>

      <section className="bg-stone-50 py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
                Mosaico
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-neutral-950">
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
              Fotos y videos
            </FilterButton>
            {GALLERY_MEDIA_TYPES.map((option) => (
              <FilterButton key={option.value} active={type === option.value} onClick={() => setType(option.value)}>
                {option.label}
              </FilterButton>
            ))}
          </div>

          {filteredItems.length > 0 ? (
            <div className="mt-8 columns-1 gap-4 sm:columns-2 xl:columns-3">
              {filteredItems.map((item, index) => (
                <GalleryTile
                  key={item.id}
                  item={item}
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

      <Dialog open={Boolean(activeItem)} onOpenChange={(open) => !open && setActiveIndex(null)}>
        <DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-5xl">
          {activeItem ? (
            <>
              <div className="relative bg-neutral-950">
                {activeItem.type === 'video' ? (
                  <video src={activeItem.url} controls className="max-h-[72vh] w-full bg-black object-contain" />
                ) : (
                  <img
                    src={activeItem.url}
                    alt={activeItem.alt ?? activeItem.caption ?? 'Imagen de Cabanas Playa Terco'}
                    className="max-h-[72vh] w-full object-contain"
                  />
                )}
                {filteredItems.length > 1 ? (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90"
                      onClick={() => moveLightbox(-1)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                      <span className="sr-only">Anterior</span>
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90"
                      onClick={() => moveLightbox(1)}
                    >
                      <ChevronRight className="h-5 w-5" />
                      <span className="sr-only">Siguiente</span>
                    </Button>
                  </>
                ) : null}
              </div>
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>{activeItem.album?.title ?? 'Galeria Playa Terco'}</DialogTitle>
                  <DialogDescription>
                    {activeItem.caption ?? activeItem.alt ?? activeItem.category_label}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{activeItem.category_label}</Badge>
                  <Badge variant="outline">{activeItem.type === 'video' ? 'Video' : 'Foto'}</Badge>
                </div>
                <DialogFooter className="mt-6">
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

function GalleryTile({
  item,
  index,
  onOpen,
}: {
  item: GalleryItem;
  index: number;
  onOpen: () => void;
}) {
  const mediaUrl = item.thumbnail_url ?? item.url;
  const tall = index % 5 === 0;
  const wide = index % 7 === 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg bg-neutral-900 text-left shadow-sm',
        tall ? 'aspect-[3/4]' : wide ? 'aspect-[4/3]' : 'aspect-square',
      )}
    >
      {item.type === 'video' ? (
        <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      ) : (
        <img
          src={mediaUrl}
          alt={item.alt ?? item.caption ?? 'Imagen de Cabanas Playa Terco'}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/82 via-neutral-950/10 to-transparent opacity-90" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge className="bg-white/92 text-neutral-950 hover:bg-white">
            {item.type === 'video' ? <Film className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
            {item.type === 'video' ? 'Video' : 'Foto'}
          </Badge>
          {item.is_featured ? (
            <Badge className="bg-cyan-400 text-cyan-950 hover:bg-cyan-300">
              <Sparkles className="h-3 w-3" />
              Destacado
            </Badge>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm font-medium leading-5">
          {item.caption ?? item.alt ?? item.album?.title ?? item.category_label}
        </p>
      </div>
    </button>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
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
  icon: React.ComponentType<{ className?: string }>;
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

function EmptyGallery() {
  return (
    <div className="mt-7 rounded-lg border border-dashed bg-stone-50 p-8 text-center">
      <ImageIcon className="mx-auto h-8 w-8 text-cyan-700" />
      <h3 className="mt-4 text-lg font-semibold">La galeria esta por estrenar albumes</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Muy pronto veras fotos y videos organizados por experiencia.
      </p>
    </div>
  );
}
