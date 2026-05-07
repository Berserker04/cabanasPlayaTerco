'use client';

import {
  Edit,
  Eye,
  EyeOff,
  ImagePlus,
  Images,
  LoaderCircle,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api } from '@/lib/api';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import {
  GALLERY_CATEGORIES,
  GALLERY_MEDIA_TYPES,
  type GalleryAlbum,
  type GalleryCategory,
  type GalleryItem,
} from '@/types/gallery';

type AlbumFormState = {
  title: string;
  slug: string;
  description: string;
  category: GalleryCategory;
  is_active: boolean;
  is_featured: boolean;
  sort_order: string;
  cover_gallery_item_id: string;
};

type UploadFormState = {
  gallery_album_id: string;
  category: GalleryCategory;
  caption: string;
  alt: string;
  sort_order: string;
  is_active: boolean;
  is_featured: boolean;
  file: File | null;
};

type ItemFormState = {
  gallery_album_id: string;
  category: GalleryCategory;
  caption: string;
  alt: string;
  sort_order: string;
  is_active: boolean;
  is_featured: boolean;
};

const emptyAlbumForm: AlbumFormState = {
  title: '',
  slug: '',
  description: '',
  category: 'general',
  is_active: true,
  is_featured: false,
  sort_order: '0',
  cover_gallery_item_id: 'none',
};

const emptyUploadForm: UploadFormState = {
  gallery_album_id: '',
  category: 'general',
  caption: '',
  alt: '',
  sort_order: '0',
  is_active: true,
  is_featured: false,
  file: null,
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : '';
}

function cleanPayload(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== '' && value !== undefined),
  );
}

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'No pudimos completar la accion.';
}

export function GalleryAdmin() {
  const queryClient = useQueryClient();
  const [albumSearch, setAlbumSearch] = useState('');
  const [albumCategory, setAlbumCategory] = useState('all');
  const [itemSearch, setItemSearch] = useState('');
  const [itemAlbumId, setItemAlbumId] = useState('all');
  const [itemCategory, setItemCategory] = useState('all');
  const [itemType, setItemType] = useState('all');
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<GalleryAlbum | null>(null);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [albumForm, setAlbumForm] = useState<AlbumFormState>(emptyAlbumForm);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(emptyUploadForm);
  const [itemForm, setItemForm] = useState<ItemFormState>({
    gallery_album_id: '',
    category: 'general',
    caption: '',
    alt: '',
    sort_order: '0',
    is_active: true,
    is_featured: false,
  });

  const uploadPreviewUrl = useMemo(
    () => (uploadForm.file ? URL.createObjectURL(uploadForm.file) : null),
    [uploadForm.file],
  );

  useEffect(() => {
    if (!uploadPreviewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(uploadPreviewUrl);
  }, [uploadPreviewUrl]);

  const albumsQuery = useQuery({
    queryKey: ['admin-gallery-albums', albumSearch, albumCategory],
    queryFn: () =>
      api.get<ApiResponse<GalleryAlbum[]>>(
        `/admin/gallery-albums${buildQuery({
          search: albumSearch,
          category: albumCategory === 'all' ? undefined : albumCategory,
        })}`,
      ),
  });

  const itemsQuery = useQuery({
    queryKey: ['admin-gallery-items', itemSearch, itemAlbumId, itemCategory, itemType],
    queryFn: () =>
      api.get<ApiListResponse<GalleryItem>>(
        `/admin/gallery${buildQuery({
          per_page: 100,
          search: itemSearch,
          album_id: itemAlbumId === 'all' ? undefined : itemAlbumId,
          category: itemCategory === 'all' ? undefined : itemCategory,
          type: itemType === 'all' ? undefined : itemType,
        })}`,
      ),
  });

  const albums = useMemo(() => albumsQuery.data?.data ?? [], [albumsQuery.data?.data]);
  const items = useMemo(() => itemsQuery.data?.data ?? [], [itemsQuery.data?.data]);

  const totals = useMemo(
    () => ({
      albums: albums.length,
      activeAlbums: albums.filter((album) => album.is_active).length,
      items: items.length,
      videos: items.filter((item) => item.type === 'video').length,
      featured: items.filter((item) => item.is_featured).length,
    }),
    [albums, items],
  );

  const saveAlbumMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingAlbum
        ? api.put<ApiResponse<GalleryAlbum>>(`/admin/gallery-albums/${editingAlbum.id}`, payload)
        : api.post<ApiResponse<GalleryAlbum>>('/admin/gallery-albums', payload),
    onSuccess: () => {
      toast.success(editingAlbum ? 'Album actualizado' : 'Album creado');
      setAlbumDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-albums'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-items'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/gallery-albums/${id}`),
    onSuccess: () => {
      toast.success('Album eliminado');
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-albums'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-items'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const uploadItemMutation = useMutation({
    mutationFn: (formData: FormData) => api.post<ApiResponse<GalleryItem>>('/admin/gallery', formData),
    onSuccess: () => {
      toast.success('Medio subido');
      setUploadDialogOpen(false);
      setUploadForm(emptyUploadForm);
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-albums'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-items'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      api.put<ApiResponse<GalleryItem>>(`/admin/gallery/${id}`, payload),
    onSuccess: () => {
      toast.success('Medio actualizado');
      setEditingItem(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-albums'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-items'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/gallery/${id}`),
    onSuccess: () => {
      toast.success('Medio eliminado');
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-albums'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-items'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const setCoverMutation = useMutation({
    mutationFn: ({ albumId, itemId }: { albumId: number; itemId: number }) =>
      api.put<ApiResponse<GalleryAlbum>>(`/admin/gallery-albums/${albumId}`, {
        cover_gallery_item_id: itemId,
      }),
    onSuccess: () => {
      toast.success('Portada actualizada');
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-albums'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  function openCreateAlbum() {
    setEditingAlbum(null);
    setAlbumForm(emptyAlbumForm);
    setAlbumDialogOpen(true);
  }

  function openEditAlbum(album: GalleryAlbum) {
    setEditingAlbum(album);
    setAlbumForm({
      title: album.title,
      slug: album.slug,
      description: album.description ?? '',
      category: album.category,
      is_active: album.is_active,
      is_featured: album.is_featured,
      sort_order: String(album.sort_order),
      cover_gallery_item_id: album.cover_gallery_item_id ? String(album.cover_gallery_item_id) : 'none',
    });
    setAlbumDialogOpen(true);
  }

  function openUpload(album?: GalleryAlbum) {
    const targetAlbum = album ?? albums[0];

    setUploadForm({
      ...emptyUploadForm,
      gallery_album_id: targetAlbum ? String(targetAlbum.id) : '',
      category: targetAlbum?.category ?? 'general',
    });
    setUploadDialogOpen(true);
  }

  function openEditItem(item: GalleryItem) {
    setEditingItem(item);
    setItemForm({
      gallery_album_id: item.gallery_album_id ? String(item.gallery_album_id) : '',
      category: item.category,
      caption: item.caption ?? '',
      alt: item.alt ?? '',
      sort_order: String(item.sort_order),
      is_active: item.is_active,
      is_featured: item.is_featured,
    });
  }

  function handleAlbumSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!albumForm.title || !albumForm.slug) {
      toast.error('Completa titulo y slug.');
      return;
    }

    saveAlbumMutation.mutate(
      cleanPayload({
        title: albumForm.title,
        slug: albumForm.slug,
        description: albumForm.description,
        category: albumForm.category,
        is_active: albumForm.is_active,
        is_featured: albumForm.is_featured,
        sort_order: Number(albumForm.sort_order || 0),
        cover_gallery_item_id:
          albumForm.cover_gallery_item_id === 'none' ? null : Number(albumForm.cover_gallery_item_id),
      }),
    );
  }

  function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadForm.gallery_album_id || !uploadForm.file) {
      toast.error('Selecciona un album y un archivo.');
      return;
    }

    const formData = new FormData();
    formData.append('gallery_album_id', uploadForm.gallery_album_id);
    formData.append('category', uploadForm.category);
    formData.append('file', uploadForm.file);
    formData.append('sort_order', uploadForm.sort_order || '0');
    formData.append('is_active', uploadForm.is_active ? '1' : '0');
    formData.append('is_featured', uploadForm.is_featured ? '1' : '0');

    if (uploadForm.caption) {
      formData.append('caption', uploadForm.caption);
    }

    if (uploadForm.alt) {
      formData.append('alt', uploadForm.alt);
    }

    uploadItemMutation.mutate(formData);
  }

  function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingItem) {
      return;
    }

    updateItemMutation.mutate({
      id: editingItem.id,
      payload: cleanPayload({
        gallery_album_id: itemForm.gallery_album_id ? Number(itemForm.gallery_album_id) : null,
        category: itemForm.category,
        caption: itemForm.caption,
        alt: itemForm.alt,
        sort_order: Number(itemForm.sort_order || 0),
        is_active: itemForm.is_active,
        is_featured: itemForm.is_featured,
      }),
    });
  }

  const albumCoverOptions = useMemo(() => {
    if (!editingAlbum) {
      return [];
    }

    return items.filter((item) => item.gallery_album_id === editingAlbum.id);
  }, [editingAlbum, items]);

  const isBusy =
    saveAlbumMutation.isPending ||
    uploadItemMutation.isPending ||
    updateItemMutation.isPending ||
    setCoverMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Contenido visual
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">Galeria</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Organiza albumes, fotos y videos que alimentan la experiencia publica para turistas.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => openUpload()} variant="outline" disabled={albums.length === 0}>
            <Upload className="h-4 w-4" />
            Subir medio
          </Button>
          <Button onClick={openCreateAlbum}>
            <Plus className="h-4 w-4" />
            Nuevo album
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Albumes" value={totals.albums} />
        <Metric label="Visibles" value={totals.activeAlbums} />
        <Metric label="Medios" value={totals.items} />
        <Metric label="Videos" value={totals.videos} />
        <Metric label="Destacados" value={totals.featured} />
      </div>

      <Tabs defaultValue="albums" className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="albums">Albumes</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="organize">Organizar</TabsTrigger>
        </TabsList>

        <TabsContent value="albums" className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_180px_auto]">
            <SearchInput value={albumSearch} onChange={setAlbumSearch} placeholder="Buscar album" />
            <CategorySelect value={albumCategory} onValueChange={setAlbumCategory} includeAll />
            <Button onClick={openCreateAlbum}>
              <Plus className="h-4 w-4" />
              Album
            </Button>
          </div>

          {albumsQuery.isLoading ? (
            <LoadingState />
          ) : albumsQuery.isError ? (
            <ErrorState message="No pudimos cargar los albumes." />
          ) : albums.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {albums.map((album) => (
                <article key={album.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div
                    className="aspect-[4/3] bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${album.cover_url ?? '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg'})`,
                    }}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold tracking-normal">{album.title}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">/{album.slug}</p>
                      </div>
                      <VisibilityBadge active={album.is_active} />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {album.description ?? album.category_label}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{album.category_label}</Badge>
                      <Badge variant="outline">{album.items_count ?? 0} medios</Badge>
                      {album.is_featured ? <Badge className="bg-cyan-100 text-cyan-800">Destacado</Badge> : null}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openUpload(album)}>
                        <ImagePlus className="h-4 w-4" />
                        Subir
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEditAlbum(album)}>
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteAlbumMutation.mutate(album.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No hay albumes" actionLabel="Crear album" onAction={openCreateAlbum} />
          )}
        </TabsContent>

        <TabsContent value="media" className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-white p-4 xl:grid-cols-[1fr_190px_170px_160px_auto]">
            <SearchInput value={itemSearch} onChange={setItemSearch} placeholder="Buscar medio o album" />
            <AlbumSelect value={itemAlbumId} onValueChange={setItemAlbumId} albums={albums} includeAll />
            <CategorySelect value={itemCategory} onValueChange={setItemCategory} includeAll />
            <TypeSelect value={itemType} onValueChange={setItemType} includeAll />
            <Button onClick={() => openUpload()} disabled={albums.length === 0}>
              <Upload className="h-4 w-4" />
              Subir
            </Button>
          </div>

          {itemsQuery.isLoading ? (
            <LoadingState />
          ) : itemsQuery.isError ? (
            <ErrorState message="No pudimos cargar los medios." />
          ) : items.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onEdit={() => openEditItem(item)}
                  onDelete={() => deleteItemMutation.mutate(item.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No hay medios cargados" actionLabel="Subir medio" onAction={() => openUpload()} />
          )}
        </TabsContent>

        <TabsContent value="organize" className="space-y-5">
          <div className="rounded-lg border bg-white p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medio</TableHead>
                  <TableHead>Album</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 overflow-hidden rounded-md bg-neutral-100">
                          {item.type === 'video' ? (
                            <video src={item.url} className="h-full w-full object-cover" muted />
                          ) : (
                            <img
                              src={item.thumbnail_url ?? item.url}
                              alt={item.alt ?? ''}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <p className="max-w-[220px] truncate font-medium">
                            {item.caption ?? item.alt ?? 'Sin descripcion'}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.type === 'video' ? 'Video' : 'Foto'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.album?.title ?? 'Sin album'}</TableCell>
                    <TableCell>{item.category_label}</TableCell>
                    <TableCell>#{item.sort_order}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <VisibilityBadge active={item.is_active} />
                        {item.is_featured ? <Badge className="bg-cyan-100 text-cyan-800">Destacado</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {item.gallery_album_id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setCoverMutation.mutate({
                                albumId: item.gallery_album_id as number,
                                itemId: item.id,
                              })
                            }
                          >
                            <Star className="h-4 w-4" />
                            Portada
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => openEditItem(item)}>
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {items.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Crea albumes y sube medios para organizarlos.
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleAlbumSubmit}>
            <DialogHeader>
              <DialogTitle>{editingAlbum ? 'Editar album' : 'Nuevo album'}</DialogTitle>
              <DialogDescription>
                Los albumes organizan la galeria publica y ayudan al turista a explorar por ambiente.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Titulo">
                <Input
                  value={albumForm.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    setAlbumForm((current) => ({
                      ...current,
                      title,
                      slug: current.slug && editingAlbum ? current.slug : slugify(title),
                    }));
                  }}
                  required
                />
              </Field>
              <Field label="Slug">
                <Input
                  value={albumForm.slug}
                  onChange={(event) => setAlbumForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                  required
                />
              </Field>
              <Field label="Categoria">
                <CategorySelect
                  value={albumForm.category}
                  onValueChange={(value) =>
                    setAlbumForm((current) => ({ ...current, category: value as GalleryCategory }))
                  }
                />
              </Field>
              <Field label="Orden">
                <Input
                  type="number"
                  min={0}
                  value={albumForm.sort_order}
                  onChange={(event) => setAlbumForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </Field>
              <Field label="Portada" className="sm:col-span-2">
                <Select
                  value={albumForm.cover_gallery_item_id}
                  onValueChange={(value) =>
                    setAlbumForm((current) => ({ ...current, cover_gallery_item_id: value }))
                  }
                  disabled={!editingAlbum}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona portada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin portada fija</SelectItem>
                    {albumCoverOptions.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.caption ?? item.alt ?? `Medio #${item.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Descripcion" className="sm:col-span-2">
                <Textarea
                  value={albumForm.description}
                  onChange={(event) => setAlbumForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                />
              </Field>
              <BooleanField
                label="Visible en la web publica"
                checked={albumForm.is_active}
                onChange={(value) => setAlbumForm((current) => ({ ...current, is_active: value }))}
              />
              <BooleanField
                label="Album destacado"
                checked={albumForm.is_featured}
                onChange={(value) => setAlbumForm((current) => ({ ...current, is_featured: value }))}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setAlbumDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
                {saveAlbumMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <form onSubmit={handleUploadSubmit}>
            <DialogHeader>
              <DialogTitle>Subir foto o video</DialogTitle>
              <DialogDescription>Archivos JPG, PNG, WebP, MP4 o MOV hasta 20 MB.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4">
              <Field label="Album">
                <AlbumSelect
                  value={uploadForm.gallery_album_id}
                  onValueChange={(value) => {
                    const album = albums.find((album) => String(album.id) === value);
                    setUploadForm((current) => ({
                      ...current,
                      gallery_album_id: value,
                      category: album?.category ?? current.category,
                    }));
                  }}
                  albums={albums}
                />
              </Field>
              <Field label="Categoria">
                <CategorySelect
                  value={uploadForm.category}
                  onValueChange={(value) =>
                    setUploadForm((current) => ({ ...current, category: value as GalleryCategory }))
                  }
                />
              </Field>
              <Field label="Archivo">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  onChange={(event) =>
                    setUploadForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
                  }
                />
                {uploadForm.file ? (
                  <p className="mt-2 text-xs text-muted-foreground">{uploadForm.file.name}</p>
                ) : null}
                {uploadPreviewUrl ? (
                  <div className="mt-3 overflow-hidden rounded-lg border bg-neutral-100">
                    {uploadForm.file?.type.startsWith('video/') ? (
                      <video src={uploadPreviewUrl} className="max-h-64 w-full object-contain" controls />
                    ) : (
                      <img src={uploadPreviewUrl} alt="Preview" className="max-h-64 w-full object-contain" />
                    )}
                  </div>
                ) : null}
              </Field>
              <Field label="Caption">
                <Textarea
                  value={uploadForm.caption}
                  onChange={(event) => setUploadForm((current) => ({ ...current, caption: event.target.value }))}
                  rows={3}
                />
              </Field>
              <Field label="Texto alternativo">
                <Input
                  value={uploadForm.alt}
                  onChange={(event) => setUploadForm((current) => ({ ...current, alt: event.target.value }))}
                />
              </Field>
              <Field label="Orden">
                <Input
                  type="number"
                  min={0}
                  value={uploadForm.sort_order}
                  onChange={(event) => setUploadForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </Field>
              <BooleanField
                label="Visible en la galeria publica"
                checked={uploadForm.is_active}
                onChange={(value) => setUploadForm((current) => ({ ...current, is_active: value }))}
              />
              <BooleanField
                label="Medio destacado"
                checked={uploadForm.is_featured}
                onChange={(value) => setUploadForm((current) => ({ ...current, is_featured: value }))}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
                {uploadItemMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Subir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <form onSubmit={handleItemSubmit}>
            <DialogHeader>
              <DialogTitle>Editar medio</DialogTitle>
              <DialogDescription>Actualiza organizacion, textos y visibilidad.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4">
              <Field label="Album">
                <AlbumSelect
                  value={itemForm.gallery_album_id}
                  onValueChange={(value) => setItemForm((current) => ({ ...current, gallery_album_id: value }))}
                  albums={albums}
                />
              </Field>
              <Field label="Categoria">
                <CategorySelect
                  value={itemForm.category}
                  onValueChange={(value) => setItemForm((current) => ({ ...current, category: value as GalleryCategory }))}
                />
              </Field>
              <Field label="Caption">
                <Textarea
                  value={itemForm.caption}
                  onChange={(event) => setItemForm((current) => ({ ...current, caption: event.target.value }))}
                  rows={3}
                />
              </Field>
              <Field label="Texto alternativo">
                <Input
                  value={itemForm.alt}
                  onChange={(event) => setItemForm((current) => ({ ...current, alt: event.target.value }))}
                />
              </Field>
              <Field label="Orden">
                <Input
                  type="number"
                  min={0}
                  value={itemForm.sort_order}
                  onChange={(event) => setItemForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </Field>
              <BooleanField
                label="Visible en la galeria publica"
                checked={itemForm.is_active}
                onChange={(value) => setItemForm((current) => ({ ...current, is_active: value }))}
              />
              <BooleanField
                label="Medio destacado"
                checked={itemForm.is_featured}
                onChange={(value) => setItemForm((current) => ({ ...current, is_featured: value }))}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaCard({
  item,
  onEdit,
  onDelete,
}: {
  item: GalleryItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="aspect-[4/3] bg-neutral-100">
        {item.type === 'video' ? (
          <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <img
            src={item.thumbnail_url ?? item.url}
            alt={item.alt ?? ''}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{item.album?.title ?? 'Sin album'}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {item.caption ?? item.alt ?? 'Sin descripcion'}
            </p>
          </div>
          <Badge variant="outline">#{item.sort_order}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline">{item.type === 'video' ? 'Video' : 'Foto'}</Badge>
          <VisibilityBadge active={item.is_active} />
          {item.is_featured ? <Badge className="bg-cyan-100 text-cyan-800">Destacado</Badge> : null}
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function BooleanField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

function CategorySelect({
  value,
  onValueChange,
  includeAll = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  includeAll?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Categoria" />
      </SelectTrigger>
      <SelectContent>
        {includeAll ? <SelectItem value="all">Todas</SelectItem> : null}
        {GALLERY_CATEGORIES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TypeSelect({
  value,
  onValueChange,
  includeAll = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  includeAll?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Tipo" />
      </SelectTrigger>
      <SelectContent>
        {includeAll ? <SelectItem value="all">Todos</SelectItem> : null}
        {GALLERY_MEDIA_TYPES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AlbumSelect({
  value,
  onValueChange,
  albums,
  includeAll = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  albums: GalleryAlbum[];
  includeAll?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Album" />
      </SelectTrigger>
      <SelectContent>
        {includeAll ? <SelectItem value="all">Todos</SelectItem> : null}
        {albums.map((album) => (
          <SelectItem key={album.id} value={String(album.id)}>
            {album.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function VisibilityBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
      <Eye className="h-3 w-3" />
      Visible
    </Badge>
  ) : (
    <Badge variant="outline">
      <EyeOff className="h-3 w-3" />
      Oculto
    </Badge>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border bg-white text-muted-foreground">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      Cargando...
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
      {message}
    </div>
  );
}

function EmptyState({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-white p-8 text-center">
      <Images className="mx-auto h-8 w-8 text-cyan-700" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <Button onClick={onAction} className="mt-5">
        <Plus className="h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  );
}
