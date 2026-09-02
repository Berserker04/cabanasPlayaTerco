'use client';

import {
  Bath,
  BedDouble,
  DollarSign,
  Edit,
  Home,
  ImagePlus,
  LoaderCircle,
  MapPinned,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CabinMap } from '@/components/cabins/cabin-map';
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
import {
  MAP_SLOT_LABELS,
  MAP_SLOT_OPTIONS,
  formatCurrencyCOP,
  getCabinCover,
} from '@/lib/cabin-utils';
import {
  MAP_FEATURE_GALLERY_CATEGORIES,
  MAP_FEATURE_LABELS,
  MAP_FEATURE_OPTIONS,
} from '@/lib/map-features';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  Amenity,
  Cabin,
  CabinMedia,
  CabinStatus,
  LodgingTariff,
  MapSlot,
} from '@/types/cabin';
import type { GalleryItem } from '@/types/gallery';
import type { MapFeatureKey } from '@/types/map-feature';

type CabinFormState = {
  name: string;
  status: CabinStatus;
  floor: string;
  short_description: string;
  description: string;
  guest_capacity: string;
  max_guests: string;
  beds_count: string;
  bathrooms_count: string;
  map_slot: MapSlot | '';
  is_active: boolean;
  sort_order: string;
  notes: string;
};

type UploadFormState = {
  destination: string;
  alt: string;
  sort_order: string;
  files: File[];
};

type MediaEditState = {
  alt: string;
  type: 'image' | 'video';
  sort_order: string;
};

type TariffFormState = {
  title: string;
  price_cop: string;
  unit_label: string;
  description: string;
  includes: string;
  excludes: string;
  public_notes: string;
  is_active: boolean;
  sort_order: string;
};

type AmenityFormState = {
  name: string;
  icon: string;
  category: string;
};

type UploadDestination =
  | { kind: 'cabin'; id: number }
  | { kind: 'feature'; key: MapFeatureKey };

type AdminMediaItem =
  | (CabinMedia & {
      source: 'cabin';
      display_name: string;
      caption?: string | null;
    })
  | (GalleryItem & {
      source: 'map_feature';
      display_name: string;
    });

type AdminMediaUpdateVariables = {
  media: AdminMediaItem;
  payload: Record<string, unknown>;
};

type AdminMediaUpdateResponse = ApiResponse<CabinMedia> | ApiResponse<GalleryItem>;

const statusOptions: Array<{ label: string; value: CabinStatus | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Disponible', value: 'available' },
  { label: 'Ocupada', value: 'occupied' },
  { label: 'Mantenimiento', value: 'maintenance' },
  { label: 'Inactiva', value: 'inactive' },
];

const emptyCabinForm: CabinFormState = {
  name: '',
  status: 'available',
  floor: '',
  short_description: '',
  description: '',
  guest_capacity: '4',
  max_guests: '8',
  beds_count: '3',
  bathrooms_count: '1',
  map_slot: '',
  is_active: true,
  sort_order: '0',
  notes: '',
};

const emptyUploadForm: UploadFormState = {
  destination: '',
  alt: '',
  sort_order: '0',
  files: [],
};

const emptyTariffForm: TariffFormState = {
  title: '',
  price_cop: '',
  unit_label: 'por persona / noche',
  description: '',
  includes: '',
  excludes: '',
  public_notes: '',
  is_active: true,
  sort_order: '0',
};

const emptyAmenityForm: AmenityFormState = {
  name: '',
  icon: '',
  category: '',
};

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

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value?: string[]) {
  return (value ?? []).join('\n');
}

function cabinDestination(id: number) {
  return `cabin:${id}`;
}

function featureDestination(key: MapFeatureKey) {
  return `feature:${key}`;
}

function parseUploadDestination(value: string): UploadDestination | null {
  if (value.startsWith('cabin:')) {
    const id = Number(value.replace('cabin:', ''));

    return Number.isFinite(id) && id > 0 ? { kind: 'cabin', id } : null;
  }

  if (value.startsWith('feature:')) {
    const key = value.replace('feature:', '') as MapFeatureKey;

    return key in MAP_FEATURE_LABELS ? { kind: 'feature', key } : null;
  }

  return null;
}

export function CabinsAdmin() {
  const queryClient = useQueryClient();
  const [cabinSearch, setCabinSearch] = useState('');
  const [cabinStatus, setCabinStatus] = useState('all');
  const [cabinActive, setCabinActive] = useState('all');
  const [selectedSlot, setSelectedSlot] = useState<MapSlot | null>(null);
  const [cabinDialogOpen, setCabinDialogOpen] = useState(false);
  const [editingCabin, setEditingCabin] = useState<Cabin | null>(null);
  const [cabinForm, setCabinForm] = useState<CabinFormState>(emptyCabinForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [cabinMediaFiles, setCabinMediaFiles] = useState<File[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(emptyUploadForm);
  const [editingMedia, setEditingMedia] = useState<AdminMediaItem | null>(null);
  const [mediaForm, setMediaForm] = useState<MediaEditState>({
    alt: '',
    type: 'image',
    sort_order: '0',
  });
  const [tariffDialogOpen, setTariffDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<LodgingTariff | null>(null);
  const [tariffForm, setTariffForm] = useState<TariffFormState>(emptyTariffForm);
  const [amenityDialogOpen, setAmenityDialogOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [amenityForm, setAmenityForm] = useState<AmenityFormState>(emptyAmenityForm);

  const cabinsQuery = useQuery({
    queryKey: ['admin-cabins', cabinSearch, cabinStatus, cabinActive],
    queryFn: () =>
      api.get<ApiListResponse<Cabin>>(
        `/admin/cabins${buildQuery({
          search: cabinSearch,
          status: cabinStatus === 'all' ? undefined : cabinStatus,
          is_active: cabinActive === 'all' ? undefined : cabinActive === 'active',
        })}`,
      ),
  });

  const tariffsQuery = useQuery({
    queryKey: ['admin-lodging-tariffs'],
    queryFn: () => api.get<ApiListResponse<LodgingTariff>>('/admin/lodging-tariffs'),
  });

  const amenitiesQuery = useQuery({
    queryKey: ['admin-amenities'],
    queryFn: () => api.get<ApiResponse<Amenity[]>>('/admin/amenities'),
  });

  const mapPointMediaQuery = useQuery({
    queryKey: ['admin-map-point-media'],
    queryFn: async () => {
      const responses = await Promise.all(
        MAP_FEATURE_OPTIONS.map((feature) =>
          api.get<ApiListResponse<GalleryItem>>(
            `/admin/gallery${buildQuery({ per_page: 100, map_point: feature.value })}`,
          ),
        ),
      );

      return responses.flatMap((response) => response.data);
    },
  });

  const cabins = useMemo(() => cabinsQuery.data?.data ?? [], [cabinsQuery.data?.data]);
  const tariffs = useMemo(() => tariffsQuery.data?.data ?? [], [tariffsQuery.data?.data]);
  const amenities = useMemo(() => amenitiesQuery.data?.data ?? [], [amenitiesQuery.data?.data]);
  const mapPointMedia = useMemo(
    () => mapPointMediaQuery.data ?? [],
    [mapPointMediaQuery.data],
  );

  const mediaItems = useMemo<AdminMediaItem[]>(() => {
    const cabinItems = cabins.flatMap((cabin) =>
      (cabin.media ?? []).map((media) => ({
        ...media,
        source: 'cabin' as const,
        display_name: cabin.name,
      })),
    );
    const featureItems = mapPointMedia.map((media) => ({
      ...media,
      source: 'map_feature' as const,
      display_name: media.map_point_label ?? 'Punto del mapa',
    }));

    return [...cabinItems, ...featureItems];
  }, [cabins, mapPointMedia]);

  const selectedSlotCabin = selectedSlot
    ? cabins.find((cabin) => cabin.map_slot === selectedSlot)
    : null;

  const totals = useMemo(() => {
    return {
      cabins: cabins.length,
      activeCabins: cabins.filter((cabin) => cabin.is_active).length,
      availableCabins: cabins.filter((cabin) => cabin.status === 'available').length,
      media: mediaItems.length,
      tariffs: tariffs.filter((tariff) => tariff.is_active).length,
    };
  }, [cabins, mediaItems, tariffs]);

  const saveCabinMutation = useMutation({
    mutationFn: async ({
      payload,
      coverFile,
      mediaFiles,
    }: {
      payload: Record<string, unknown>;
      coverFile: File | null;
      mediaFiles: File[];
    }) => {
      const response = editingCabin
        ? await api.put<ApiResponse<Cabin>>(`/admin/cabins/${editingCabin.id}`, payload)
        : await api.post<ApiResponse<Cabin>>('/admin/cabins', payload);

      if (coverFile) {
        const formData = new FormData();
        formData.append('file', coverFile);
        await api.post<ApiResponse<Cabin>>(`/admin/cabins/${response.data.id}/cover`, formData);
      }

      if (mediaFiles.length > 0) {
        const formData = new FormData();
        formData.append('cabin_id', String(response.data.id));
        mediaFiles.forEach((file) => formData.append('files[]', file));
        await api.post<ApiResponse<CabinMedia | CabinMedia[]>>('/admin/cabin-media', formData);
      }

      return response;
    },
    onSuccess: () => {
      toast.success(editingCabin ? 'Cabaña actualizada' : 'Cabaña creada');
      setCabinDialogOpen(false);
      setCoverFile(null);
      setCabinMediaFiles([]);
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteCabinMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/cabins/${id}`),
    onSuccess: () => {
      toast.success('Cabaña eliminada');
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async ({
      destination,
      files,
      alt,
      sortOrder,
    }: {
      destination: UploadDestination;
      files: File[];
      alt: string;
      sortOrder: number;
    }) => {
      if (destination.kind === 'cabin') {
        const formData = new FormData();
        formData.append('cabin_id', String(destination.id));
        files.forEach((file) => formData.append('files[]', file));
        formData.append('sort_order', String(sortOrder));

        if (alt) {
          formData.append('alt', alt);
        }

        return api.post<ApiResponse<CabinMedia | CabinMedia[]>>('/admin/cabin-media', formData);
      }

      const label = MAP_FEATURE_LABELS[destination.key];
      const category = MAP_FEATURE_GALLERY_CATEGORIES[destination.key];

      return Promise.all(
        files.map((file, index) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('map_point', destination.key);
          formData.append('category', category);
          formData.append('caption', alt || label);
          formData.append('alt', alt || label);
          formData.append('sort_order', String(sortOrder + index));
          formData.append('is_active', '1');
          formData.append('is_featured', '0');

          return api.post<ApiResponse<GalleryItem>>('/admin/gallery', formData);
        }),
      );
    },
    onSuccess: () => {
      toast.success('Archivos subidos');
      setUploadDialogOpen(false);
      setUploadForm(emptyUploadForm);
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-map-point-media'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-items'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const updateMediaMutation = useMutation<
    AdminMediaUpdateResponse,
    unknown,
    AdminMediaUpdateVariables
  >({
    mutationFn: ({ media, payload }) =>
      media.source === 'cabin'
        ? api.put<ApiResponse<CabinMedia>>(`/admin/cabin-media/${media.id}`, payload)
        : api.put<ApiResponse<GalleryItem>>(`/admin/gallery/${media.id}`, payload),
    onSuccess: () => {
      toast.success('Archivo actualizado');
      setEditingMedia(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-map-point-media'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-items'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (media: AdminMediaItem) =>
      media.source === 'cabin'
        ? api.delete<{ message: string }>(`/admin/cabin-media/${media.id}`)
        : api.delete<{ message: string }>(`/admin/gallery/${media.id}`),
    onSuccess: () => {
      toast.success('Archivo eliminado');
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-map-point-media'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-gallery-items'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const saveTariffMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingTariff
        ? api.put<ApiResponse<LodgingTariff>>(`/admin/lodging-tariffs/${editingTariff.id}`, payload)
        : api.post<ApiResponse<LodgingTariff>>('/admin/lodging-tariffs', payload),
    onSuccess: () => {
      toast.success(editingTariff ? 'Tarifa actualizada' : 'Tarifa creada');
      setTariffDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-lodging-tariffs'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteTariffMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/lodging-tariffs/${id}`),
    onSuccess: () => {
      toast.success('Tarifa eliminada');
      void queryClient.invalidateQueries({ queryKey: ['admin-lodging-tariffs'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const saveAmenityMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingAmenity
        ? api.put<ApiResponse<Amenity>>(`/admin/amenities/${editingAmenity.id}`, payload)
        : api.post<ApiResponse<Amenity>>('/admin/amenities', payload),
    onSuccess: () => {
      toast.success(editingAmenity ? 'Amenidad actualizada' : 'Amenidad creada');
      setAmenityDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-amenities'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteAmenityMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/amenities/${id}`),
    onSuccess: () => {
      toast.success('Amenidad eliminada');
      void queryClient.invalidateQueries({ queryKey: ['admin-amenities'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  function openCreateCabin(slot?: MapSlot | null) {
    setEditingCabin(null);
    setCoverFile(null);
    setCabinMediaFiles([]);
    setCabinForm({
      ...emptyCabinForm,
      map_slot: slot ?? '',
      sort_order: slot ? String(Number(slot.replace('cabana_', ''))) : '0',
      name: slot ? MAP_SLOT_LABELS[slot] : '',
    });
    setCabinDialogOpen(true);
  }

  function openEditCabin(cabin: Cabin) {
    setEditingCabin(cabin);
    setCoverFile(null);
    setCabinMediaFiles([]);
    setCabinForm({
      name: cabin.name,
      status: cabin.status,
      floor: cabin.floor ? String(cabin.floor) : '',
      short_description: cabin.short_description ?? '',
      description: cabin.description ?? '',
      guest_capacity: String(cabin.guest_capacity),
      max_guests: String(cabin.max_guests),
      beds_count: String(cabin.beds_count),
      bathrooms_count: String(cabin.bathrooms_count),
      map_slot: cabin.map_slot ?? '',
      is_active: cabin.is_active,
      sort_order: String(cabin.sort_order),
      notes: cabin.notes ?? '',
    });
    setCabinDialogOpen(true);
  }

  function openUpload(cabin?: Cabin) {
    setUploadForm({
      ...emptyUploadForm,
      destination: cabin
        ? cabinDestination(cabin.id)
        : cabins[0]
          ? cabinDestination(cabins[0].id)
          : featureDestination('kiosco'),
    });
    setUploadDialogOpen(true);
  }

  function openEditMedia(media: AdminMediaItem) {
    setEditingMedia(media);
    setMediaForm({
      alt: media.alt ?? ('caption' in media ? media.caption ?? '' : ''),
      type: media.type,
      sort_order: String(media.sort_order),
    });
  }

  function openCreateTariff() {
    setEditingTariff(null);
    setTariffForm(emptyTariffForm);
    setTariffDialogOpen(true);
  }

  function openEditTariff(tariff: LodgingTariff) {
    setEditingTariff(tariff);
    setTariffForm({
      title: tariff.title,
      price_cop: String(tariff.price_cop),
      unit_label: tariff.unit_label,
      description: tariff.description ?? '',
      includes: joinLines(tariff.includes),
      excludes: joinLines(tariff.excludes),
      public_notes: tariff.public_notes ?? '',
      is_active: tariff.is_active,
      sort_order: String(tariff.sort_order),
    });
    setTariffDialogOpen(true);
  }

  function openCreateAmenity() {
    setEditingAmenity(null);
    setAmenityForm(emptyAmenityForm);
    setAmenityDialogOpen(true);
  }

  function openEditAmenity(amenity: Amenity) {
    setEditingAmenity(amenity);
    setAmenityForm({
      name: amenity.name,
      icon: amenity.icon ?? '',
      category: amenity.category ?? '',
    });
    setAmenityDialogOpen(true);
  }

  function handleCabinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cabinForm.name || !cabinForm.map_slot) {
      toast.error('Completa nombre y ubicacion en el mapa.');
      return;
    }

    saveCabinMutation.mutate({
      payload: cleanPayload({
        ...cabinForm,
        floor: cabinForm.floor ? Number(cabinForm.floor) : '',
        guest_capacity: Number(cabinForm.guest_capacity),
        max_guests: Number(cabinForm.max_guests),
        beds_count: Number(cabinForm.beds_count),
        bathrooms_count: Number(cabinForm.bathrooms_count),
        sort_order: Number(cabinForm.sort_order),
      }),
      coverFile,
      mediaFiles: cabinMediaFiles,
    });
  }

  function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const destination = parseUploadDestination(uploadForm.destination);

    if (!destination || uploadForm.files.length === 0) {
      toast.error('Selecciona destino y al menos un archivo.');
      return;
    }

    if (
      destination.kind === 'feature' &&
      uploadForm.files.some((file) => !file.type.startsWith('image/'))
    ) {
      toast.error('Kiosco y Cocina/Comedor solo aceptan imagenes.');
      return;
    }

    uploadMediaMutation.mutate({
      destination,
      files: uploadForm.files,
      alt: uploadForm.alt.trim(),
      sortOrder: Number(uploadForm.sort_order || 0),
    });
  }

  function handleMediaUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingMedia) {
      return;
    }

    const payload =
      editingMedia.source === 'cabin'
        ? cleanPayload({
            alt: mediaForm.alt,
            type: mediaForm.type,
            sort_order: Number(mediaForm.sort_order),
          })
        : cleanPayload({
            alt: mediaForm.alt,
            caption: mediaForm.alt || editingMedia.caption || editingMedia.display_name,
            sort_order: Number(mediaForm.sort_order),
          });

    updateMediaMutation.mutate({ media: editingMedia, payload });
  }

  function handleTariffSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tariffForm.title || !tariffForm.price_cop || !tariffForm.unit_label) {
      toast.error('Completa titulo, precio y unidad.');
      return;
    }

    saveTariffMutation.mutate(
      cleanPayload({
        ...tariffForm,
        price_cop: Number(tariffForm.price_cop),
        includes: splitLines(tariffForm.includes),
        excludes: splitLines(tariffForm.excludes),
        sort_order: Number(tariffForm.sort_order),
      }),
    );
  }

  function handleAmenitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!amenityForm.name) {
      toast.error('El nombre de la amenidad es obligatorio.');
      return;
    }

    saveAmenityMutation.mutate(cleanPayload(amenityForm));
  }

  const isBusy =
    saveCabinMutation.isPending ||
    uploadMediaMutation.isPending ||
    updateMediaMutation.isPending ||
    saveTariffMutation.isPending ||
    saveAmenityMutation.isPending;
  const selectedUploadDestination = parseUploadDestination(uploadForm.destination);
  const uploadAccept = selectedUploadDestination?.kind === 'feature'
    ? 'image/jpeg,image/png,image/webp'
    : 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Alojamiento
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">Cabañas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Gestiona cabañas reales, ubicacion interna, media, tarifas globales y amenidades.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => openUpload()} variant="outline">
            <ImagePlus className="h-4 w-4" />
            Subir media
          </Button>
          <Button onClick={() => openCreateCabin()}>
            <Plus className="h-4 w-4" />
            Nueva cabaña
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Cabañas" value={totals.cabins} />
        <Metric label="Activas" value={totals.activeCabins} />
        <Metric label="Disponibles" value={totals.availableCabins} />
        <Metric label="Media" value={totals.media} />
        <Metric label="Tarifas" value={totals.tariffs} />
      </div>

      <Tabs defaultValue="cabins" className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="cabins">Cabañas</TabsTrigger>
          <TabsTrigger value="map">Mapa</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="tariffs">Tarifas</TabsTrigger>
          <TabsTrigger value="amenities">Amenidades</TabsTrigger>
        </TabsList>

        <TabsContent value="cabins" className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_180px_180px_auto]">
            <SearchInput value={cabinSearch} onChange={setCabinSearch} placeholder="Buscar cabaña" />
            <Select value={cabinStatus} onValueChange={setCabinStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cabinActive} onValueChange={setCabinActive}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Visibilidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Publicas</SelectItem>
                <SelectItem value="inactive">Ocultas</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => openCreateCabin()}>
              <Plus className="h-4 w-4" />
              Cabaña
            </Button>
          </div>

          {cabinsQuery.isLoading ? (
            <LoadingState />
          ) : cabinsQuery.isError ? (
            <ErrorState message="No pudimos cargar las cabañas." />
          ) : cabins.length > 0 ? (
            <div className="overflow-hidden rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cabaña</TableHead>
                    <TableHead>Mapa</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cabins.map((cabin) => (
                    <TableRow key={cabin.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-14 w-20 rounded-md bg-cover bg-center"
                            style={{ backgroundImage: `url(${getCabinCover(cabin)})` }}
                          />
                          <div>
                            <p className="font-medium">{cabin.name}</p>
                            <p className="text-xs text-muted-foreground">{cabin.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cabin.map_slot ? <Badge variant="outline">{MAP_SLOT_LABELS[cabin.map_slot]}</Badge> : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-1 text-cyan-900">
                            <Users className="h-3 w-3" />
                            {cabin.min_guests}-{cabin.max_guests}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1">
                            <BedDouble className="h-3 w-3" />
                            {cabin.beds_count}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1">
                            <Bath className="h-3 w-3" />
                            {cabin.bathrooms_count}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={cabin.status} label={cabin.status_label} />
                          {!cabin.is_active ? <Badge variant="outline">Oculta</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openUpload(cabin)}>
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditCabin(cabin)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteCabinMutation.mutate(cabin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No hay cabañas registradas" actionLabel="Crear cabaña" onAction={() => openCreateCabin()} />
          )}
        </TabsContent>

        <TabsContent value="map" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <CabinMap cabins={cabins} selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} />
            <aside className="rounded-lg border bg-white p-5">
              <MapPinned className="h-6 w-6 text-cyan-700" />
              <h2 className="mt-4 text-lg font-semibold">
                {selectedSlot ? MAP_SLOT_LABELS[selectedSlot] : 'Mapa interno'}
              </h2>
              {selectedSlot ? (
                selectedSlotCabin ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{selectedSlotCabin.name}</p>
                        <StatusBadge status={selectedSlotCabin.status} label={selectedSlotCabin.status_label} />
                        {!selectedSlotCabin.is_active ? <Badge variant="outline">Oculta</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedSlotCabin.short_description ??
                          selectedSlotCabin.description ??
                          'Sin descripcion publica registrada.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <span className="inline-flex items-center justify-center gap-1 rounded-md bg-cyan-50 px-2 py-2 text-cyan-900">
                        <Users className="h-3 w-3" />
                        {selectedSlotCabin.min_guests}-{selectedSlotCabin.max_guests}
                      </span>
                      <span className="inline-flex items-center justify-center gap-1 rounded-md bg-stone-100 px-2 py-2">
                        <BedDouble className="h-3 w-3" />
                        {selectedSlotCabin.beds_count}
                      </span>
                      <span className="inline-flex items-center justify-center gap-1 rounded-md bg-stone-100 px-2 py-2">
                        <Bath className="h-3 w-3" />
                        {selectedSlotCabin.bathrooms_count}
                      </span>
                    </div>
                    <Button onClick={() => openEditCabin(selectedSlotCabin)} className="w-full">
                      <Edit className="h-4 w-4" />
                      Editar cabaña
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Punto disponible para asignar.</p>
                    <Button onClick={() => openCreateCabin(selectedSlot)} className="mt-4 w-full">
                      <Plus className="h-4 w-4" />
                      Crear en este punto
                    </Button>
                  </div>
                )
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Las posiciones corresponden al mapa operativo de Playa Terco.
                </p>
              )}
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-5">
          <div className="flex justify-end">
            <Button onClick={() => openUpload()}>
              <ImagePlus className="h-4 w-4" />
              Subir media
            </Button>
          </div>

          {mediaItems.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {mediaItems.map((media) => (
                <article key={`${media.source}-${media.id}`} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  {media.type === 'video' ? (
                    <video src={media.url} controls className="aspect-[4/3] w-full bg-neutral-950 object-cover" />
                  ) : (
                    <div
                      className="aspect-[4/3] bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${
                          media.source === 'map_feature' ? media.thumbnail_url ?? media.url : media.url
                        })`,
                      }}
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{media.display_name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {media.alt ?? ('caption' in media ? media.caption : null) ?? 'Sin texto alternativo'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline">#{media.sort_order}</Badge>
                        {media.source === 'map_feature' ? <Badge className="bg-cyan-100 text-cyan-800">Mapa</Badge> : null}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditMedia(media)}>
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMediaMutation.mutate(media)}
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
            <EmptyState title="No hay media cargada" actionLabel="Subir media" onAction={() => openUpload()} />
          )}
        </TabsContent>

        <TabsContent value="tariffs" className="space-y-5">
          <div className="flex justify-end">
            <Button onClick={openCreateTariff}>
              <DollarSign className="h-4 w-4" />
              Nueva tarifa
            </Button>
          </div>

          {tariffsQuery.isLoading ? (
            <LoadingState />
          ) : tariffsQuery.isError ? (
            <ErrorState message="No pudimos cargar las tarifas." />
          ) : tariffs.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {tariffs.map((tariff) => (
                <article key={tariff.id} className="rounded-lg border bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{tariff.title}</p>
                      <p className="mt-2 text-2xl font-bold">{formatCurrencyCOP(tariff.price_cop)}</p>
                      <p className="text-sm text-muted-foreground">{tariff.unit_label}</p>
                    </div>
                    <Badge variant={tariff.is_active ? 'default' : 'outline'}>
                      {tariff.is_active ? 'Publica' : 'Oculta'}
                    </Badge>
                  </div>
                  {tariff.description ? (
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">{tariff.description}</p>
                  ) : null}
                  <div className="mt-4 grid gap-2 text-sm">
                    {tariff.includes.slice(0, 3).map((item) => (
                      <span key={item} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                        Incluye: {item}
                      </span>
                    ))}
                    {tariff.excludes.slice(0, 2).map((item) => (
                      <span key={item} className="rounded-full bg-stone-100 px-3 py-1 text-neutral-700">
                        No incluye: {item}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditTariff(tariff)}>
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteTariffMutation.mutate(tariff.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No hay tarifas registradas" actionLabel="Crear tarifa" onAction={openCreateTariff} />
          )}
        </TabsContent>

        <TabsContent value="amenities" className="space-y-5">
          <div className="flex justify-end">
            <Button onClick={openCreateAmenity}>
              <Plus className="h-4 w-4" />
              Nueva amenidad
            </Button>
          </div>

          {amenities.length > 0 ? (
            <div className="overflow-hidden rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Icono</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amenities.map((amenity) => (
                    <TableRow key={amenity.id}>
                      <TableCell className="font-medium">{amenity.name}</TableCell>
                      <TableCell>{amenity.icon ?? 'Sin icono'}</TableCell>
                      <TableCell>{amenity.category ?? 'General'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditAmenity(amenity)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteAmenityMutation.mutate(amenity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No hay amenidades registradas" actionLabel="Crear amenidad" onAction={openCreateAmenity} />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={cabinDialogOpen} onOpenChange={setCabinDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <form onSubmit={handleCabinSubmit}>
            <DialogHeader>
              <DialogTitle>{editingCabin ? 'Editar cabaña' : 'Nueva cabaña'}</DialogTitle>
              <DialogDescription>
                Cada ficha alimenta el catalogo publico, el mapa y la disponibilidad.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre">
                <Input
                  value={cabinForm.name}
                  onChange={(event) => setCabinForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Ubicacion en mapa">
                <Select
                  value={cabinForm.map_slot}
                  onValueChange={(value) => setCabinForm((current) => ({ ...current, map_slot: value as MapSlot }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona punto" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAP_SLOT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estado">
                <Select
                  value={cabinForm.status}
                  onValueChange={(value) => setCabinForm((current) => ({ ...current, status: value as CabinStatus }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions
                      .filter((option) => option.value !== 'all')
                      .map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Capacidad comoda">
                <Input
                  type="number"
                  min={1}
                  value={cabinForm.guest_capacity}
                  onChange={(event) => setCabinForm((current) => ({ ...current, guest_capacity: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Capacidad maxima">
                <Input
                  type="number"
                  min={1}
                  value={cabinForm.max_guests}
                  onChange={(event) => setCabinForm((current) => ({ ...current, max_guests: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Camas">
                <Input
                  type="number"
                  min={0}
                  value={cabinForm.beds_count}
                  onChange={(event) => setCabinForm((current) => ({ ...current, beds_count: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Banos">
                <Input
                  type="number"
                  min={0}
                  value={cabinForm.bathrooms_count}
                  onChange={(event) => setCabinForm((current) => ({ ...current, bathrooms_count: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Piso">
                <Input
                  type="number"
                  value={cabinForm.floor}
                  onChange={(event) => setCabinForm((current) => ({ ...current, floor: event.target.value }))}
                />
              </Field>
              <Field label="Orden">
                <Input
                  type="number"
                  min={0}
                  value={cabinForm.sort_order}
                  onChange={(event) => setCabinForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </Field>
              <Field label="Portada">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                />
              </Field>
              <Field label="Galeria inicial" className="sm:col-span-2">
                <Input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  onChange={(event) => setCabinMediaFiles(Array.from(event.target.files ?? []))}
                />
                {cabinMediaFiles.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {cabinMediaFiles.length} archivos listos para subir
                  </p>
                ) : null}
              </Field>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={cabinForm.is_active}
                  onChange={(event) => setCabinForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                Visible en la pagina publica
              </label>
              <Field label="Resumen" className="sm:col-span-2">
                <Textarea
                  value={cabinForm.short_description}
                  onChange={(event) => setCabinForm((current) => ({ ...current, short_description: event.target.value }))}
                  rows={2}
                />
              </Field>
              <Field label="Descripcion" className="sm:col-span-2">
                <Textarea
                  value={cabinForm.description}
                  onChange={(event) => setCabinForm((current) => ({ ...current, description: event.target.value }))}
                  rows={5}
                />
              </Field>
              <Field label="Notas internas" className="sm:col-span-2">
                <Textarea
                  value={cabinForm.notes}
                  onChange={(event) => setCabinForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                />
              </Field>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setCabinDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
                {saveCabinMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUploadSubmit}>
            <DialogHeader>
              <DialogTitle>Subir media</DialogTitle>
              <DialogDescription>
                Elige una cabaña, el Kiosco o la Cocina y Comedor como destino.
              </DialogDescription>
              <DialogDescription>
                Para Kiosco y Cocina/Comedor se publican imagenes en el mapa y la galeria.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4">
              <Field label="Destino">
                <Select
                  value={uploadForm.destination}
                  onValueChange={(value) => setUploadForm((current) => ({ ...current, destination: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {cabins.map((cabin) => (
                      <SelectItem key={cabin.id} value={cabinDestination(cabin.id)}>
                        Cabaña - {cabin.name}
                      </SelectItem>
                    ))}
                    {MAP_FEATURE_OPTIONS.map((feature) => (
                      <SelectItem key={feature.value} value={featureDestination(feature.value)}>
                        {feature.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Archivos">
                <Input
                  type="file"
                  multiple
                  accept={uploadAccept}
                  onChange={(event) =>
                    setUploadForm((current) => ({ ...current, files: Array.from(event.target.files ?? []) }))
                  }
                />
                {selectedUploadDestination?.kind === 'feature' ? (
                  <p className="text-xs text-muted-foreground">
                    Para Kiosco y Cocina/Comedor solo se publican imagenes.
                  </p>
                ) : null}
                {uploadForm.files.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {uploadForm.files.length} archivos listos para subir
                  </p>
                ) : null}
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
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
                {uploadMediaMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Subir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingMedia)} onOpenChange={(open) => !open && setEditingMedia(null)}>
        <DialogContent>
          <form onSubmit={handleMediaUpdate}>
            <DialogHeader>
              <DialogTitle>Editar media</DialogTitle>
              <DialogDescription>{editingMedia?.display_name}</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4">
              {editingMedia?.source === 'cabin' ? (
                <Field label="Tipo">
                  <Select
                    value={mediaForm.type}
                    onValueChange={(value) => setMediaForm((current) => ({ ...current, type: value as 'image' | 'video' }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Imagen</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field label="Texto alternativo">
                <Input
                  value={mediaForm.alt}
                  onChange={(event) => setMediaForm((current) => ({ ...current, alt: event.target.value }))}
                />
              </Field>
              <Field label="Orden">
                <Input
                  type="number"
                  min={0}
                  value={mediaForm.sort_order}
                  onChange={(event) => setMediaForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </Field>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setEditingMedia(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={tariffDialogOpen} onOpenChange={setTariffDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleTariffSubmit}>
            <DialogHeader>
              <DialogTitle>{editingTariff ? 'Editar tarifa' : 'Nueva tarifa'}</DialogTitle>
              <DialogDescription>Las tarifas son globales para Cabañas Playa Terco.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Titulo">
                <Input
                  value={tariffForm.title}
                  onChange={(event) => setTariffForm((current) => ({ ...current, title: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Precio COP">
                <Input
                  type="number"
                  min={0}
                  value={tariffForm.price_cop}
                  onChange={(event) => setTariffForm((current) => ({ ...current, price_cop: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Unidad">
                <Input
                  value={tariffForm.unit_label}
                  onChange={(event) => setTariffForm((current) => ({ ...current, unit_label: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Orden">
                <Input
                  type="number"
                  min={0}
                  value={tariffForm.sort_order}
                  onChange={(event) => setTariffForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </Field>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={tariffForm.is_active}
                  onChange={(event) => setTariffForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                Visible para clientes
              </label>
              <Field label="Descripcion" className="sm:col-span-2">
                <Textarea
                  value={tariffForm.description}
                  onChange={(event) => setTariffForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                />
              </Field>
              <Field label="Incluye" className="sm:col-span-2">
                <Textarea
                  value={tariffForm.includes}
                  onChange={(event) => setTariffForm((current) => ({ ...current, includes: event.target.value }))}
                  rows={4}
                />
              </Field>
              <Field label="No incluye" className="sm:col-span-2">
                <Textarea
                  value={tariffForm.excludes}
                  onChange={(event) => setTariffForm((current) => ({ ...current, excludes: event.target.value }))}
                  rows={4}
                />
              </Field>
              <Field label="Notas publicas" className="sm:col-span-2">
                <Textarea
                  value={tariffForm.public_notes}
                  onChange={(event) => setTariffForm((current) => ({ ...current, public_notes: event.target.value }))}
                  rows={3}
                />
              </Field>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setTariffDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
                {saveTariffMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={amenityDialogOpen} onOpenChange={setAmenityDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAmenitySubmit}>
            <DialogHeader>
              <DialogTitle>{editingAmenity ? 'Editar amenidad' : 'Nueva amenidad'}</DialogTitle>
            </DialogHeader>
            <div className="mt-5 grid gap-4">
              <Field label="Nombre">
                <Input
                  value={amenityForm.name}
                  onChange={(event) => setAmenityForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Icono lucide">
                <Input
                  value={amenityForm.icon}
                  onChange={(event) => setAmenityForm((current) => ({ ...current, icon: event.target.value }))}
                  placeholder="wifi, waves, utensils"
                />
              </Field>
              <Field label="Categoria">
                <Input
                  value={amenityForm.category}
                  onChange={(event) => setAmenityForm((current) => ({ ...current, category: event.target.value }))}
                />
              </Field>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setAmenityDialogOpen(false)}>
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
      <Home className="mx-auto h-8 w-8 text-cyan-700" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <Button onClick={onAction} className="mt-5">
        <Plus className="h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  );
}

function StatusBadge({ status, label }: { status: CabinStatus; label?: string }) {
  const className =
    status === 'available'
      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
      : status === 'maintenance'
        ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
        : status === 'inactive'
          ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-100'
          : 'bg-sky-100 text-sky-800 hover:bg-sky-100';

  return <Badge className={className}>{label ?? status}</Badge>;
}
