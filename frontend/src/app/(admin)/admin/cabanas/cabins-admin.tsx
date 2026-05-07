'use client';

import {
  Edit,
  Home,
  ImagePlus,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
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
import { formatCurrencyCOP, getCabinCover } from '@/lib/cabin-utils';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type { Amenity, Cabin, CabinMedia, CabinStatus, CabinType } from '@/types/cabin';

type CabinTypeFormState = {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  base_price: string;
  max_guests: string;
  bedrooms: string;
  bathrooms: string;
  size_sqm: string;
  image: string;
  is_active: boolean;
  sort_order: string;
  amenity_ids: number[];
};

type CabinFormState = {
  cabin_type_id: string;
  name: string;
  code: string;
  status: CabinStatus;
  floor: string;
  notes: string;
};

type AmenityFormState = {
  name: string;
  icon: string;
  category: string;
};

type UploadFormState = {
  cabin_type_id: string;
  alt: string;
  type: 'image' | 'video';
  sort_order: string;
  file: File | null;
};

type MediaEditState = {
  alt: string;
  type: 'image' | 'video';
  sort_order: string;
};

type MediaWithType = CabinMedia & {
  cabin_type_name: string;
};

const statusOptions: Array<{ label: string; value: CabinStatus | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Disponible', value: 'available' },
  { label: 'Ocupada', value: 'occupied' },
  { label: 'Mantenimiento', value: 'maintenance' },
  { label: 'Inactiva', value: 'inactive' },
];

const emptyTypeForm: CabinTypeFormState = {
  name: '',
  slug: '',
  short_description: '',
  description: '',
  base_price: '',
  max_guests: '2',
  bedrooms: '1',
  bathrooms: '1',
  size_sqm: '',
  image: '',
  is_active: true,
  sort_order: '0',
  amenity_ids: [],
};

const emptyCabinForm: CabinFormState = {
  cabin_type_id: '',
  name: '',
  code: '',
  status: 'available',
  floor: '',
  notes: '',
};

const emptyAmenityForm: AmenityFormState = {
  name: '',
  icon: '',
  category: '',
};

const emptyUploadForm: UploadFormState = {
  cabin_type_id: '',
  alt: '',
  type: 'image',
  sort_order: '0',
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

export function CabinsAdmin() {
  const queryClient = useQueryClient();
  const [typeSearch, setTypeSearch] = useState('');
  const [typeActive, setTypeActive] = useState('all');
  const [unitSearch, setUnitSearch] = useState('');
  const [unitStatus, setUnitStatus] = useState('all');
  const [unitTypeId, setUnitTypeId] = useState('all');
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CabinType | null>(null);
  const [typeForm, setTypeForm] = useState<CabinTypeFormState>(emptyTypeForm);
  const [cabinDialogOpen, setCabinDialogOpen] = useState(false);
  const [editingCabin, setEditingCabin] = useState<Cabin | null>(null);
  const [cabinForm, setCabinForm] = useState<CabinFormState>(emptyCabinForm);
  const [amenityDialogOpen, setAmenityDialogOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [amenityForm, setAmenityForm] = useState<AmenityFormState>(emptyAmenityForm);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(emptyUploadForm);
  const [editingMedia, setEditingMedia] = useState<MediaWithType | null>(null);
  const [mediaForm, setMediaForm] = useState<MediaEditState>({
    alt: '',
    type: 'image',
    sort_order: '0',
  });

  const cabinTypesQuery = useQuery({
    queryKey: ['admin-cabin-types', typeSearch, typeActive],
    queryFn: () =>
      api.get<ApiListResponse<CabinType>>(
        `/admin/cabin-types${buildQuery({
          search: typeSearch,
          is_active: typeActive === 'all' ? undefined : typeActive === 'active',
        })}`,
      ),
  });

  const cabinsQuery = useQuery({
    queryKey: ['admin-cabins', unitSearch, unitStatus, unitTypeId],
    queryFn: () =>
      api.get<ApiListResponse<Cabin>>(
        `/admin/cabins${buildQuery({
          search: unitSearch,
          status: unitStatus === 'all' ? undefined : unitStatus,
          cabin_type_id: unitTypeId === 'all' ? undefined : unitTypeId,
        })}`,
      ),
  });

  const amenitiesQuery = useQuery({
    queryKey: ['admin-amenities'],
    queryFn: () => api.get<ApiResponse<Amenity[]>>('/admin/amenities'),
  });

  const cabinTypes = useMemo(() => cabinTypesQuery.data?.data ?? [], [cabinTypesQuery.data?.data]);
  const cabins = useMemo(() => cabinsQuery.data?.data ?? [], [cabinsQuery.data?.data]);
  const amenities = useMemo(() => amenitiesQuery.data?.data ?? [], [amenitiesQuery.data?.data]);

  const mediaItems = useMemo<MediaWithType[]>(() => {
    return cabinTypes.flatMap((cabinType) =>
      (cabinType.media ?? []).map((media) => ({
        ...media,
        cabin_type_name: cabinType.name,
      })),
    );
  }, [cabinTypes]);

  const totals = useMemo(() => {
    return {
      types: cabinTypes.length,
      activeTypes: cabinTypes.filter((cabinType) => cabinType.is_active).length,
      units: cabins.length,
      availableUnits: cabins.filter((cabin) => cabin.status === 'available').length,
      media: mediaItems.length,
    };
  }, [cabinTypes, cabins, mediaItems]);

  const saveTypeMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingType
        ? api.put<ApiResponse<CabinType>>(`/admin/cabin-types/${editingType.id}`, payload)
        : api.post<ApiResponse<CabinType>>('/admin/cabin-types', payload),
    onSuccess: () => {
      toast.success(editingType ? 'Tipo actualizado' : 'Tipo creado');
      setTypeDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-cabin-types'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/cabin-types/${id}`),
    onSuccess: () => {
      toast.success('Tipo eliminado');
      void queryClient.invalidateQueries({ queryKey: ['admin-cabin-types'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const saveCabinMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingCabin
        ? api.put<ApiResponse<Cabin>>(`/admin/cabins/${editingCabin.id}`, payload)
        : api.post<ApiResponse<Cabin>>('/admin/cabins', payload),
    onSuccess: () => {
      toast.success(editingCabin ? 'Unidad actualizada' : 'Unidad creada');
      setCabinDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-cabin-types'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteCabinMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/cabins/${id}`),
    onSuccess: () => {
      toast.success('Unidad eliminada');
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-cabin-types'] });
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
      void queryClient.invalidateQueries({ queryKey: ['admin-cabin-types'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteAmenityMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/amenities/${id}`),
    onSuccess: () => {
      toast.success('Amenidad eliminada');
      void queryClient.invalidateQueries({ queryKey: ['admin-amenities'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-cabin-types'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const uploadMediaMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post<ApiResponse<CabinMedia>>('/admin/cabin-media', formData),
    onSuccess: () => {
      toast.success('Imagen subida');
      setUploadDialogOpen(false);
      setUploadForm(emptyUploadForm);
      void queryClient.invalidateQueries({ queryKey: ['admin-cabin-types'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const updateMediaMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      api.put<ApiResponse<CabinMedia>>(`/admin/cabin-media/${id}`, payload),
    onSuccess: () => {
      toast.success('Imagen actualizada');
      setEditingMedia(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-cabin-types'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/cabin-media/${id}`),
    onSuccess: () => {
      toast.success('Imagen eliminada');
      void queryClient.invalidateQueries({ queryKey: ['admin-cabin-types'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  function openCreateType() {
    setEditingType(null);
    setTypeForm(emptyTypeForm);
    setTypeDialogOpen(true);
  }

  function openEditType(cabinType: CabinType) {
    setEditingType(cabinType);
    setTypeForm({
      name: cabinType.name,
      slug: cabinType.slug,
      short_description: cabinType.short_description ?? '',
      description: cabinType.description ?? '',
      base_price: String(cabinType.base_price),
      max_guests: String(cabinType.max_guests),
      bedrooms: String(cabinType.bedrooms),
      bathrooms: String(cabinType.bathrooms),
      size_sqm: cabinType.size_sqm ? String(cabinType.size_sqm) : '',
      image: cabinType.image ?? '',
      is_active: cabinType.is_active,
      sort_order: String(cabinType.sort_order),
      amenity_ids: cabinType.amenities?.map((amenity) => amenity.id) ?? [],
    });
    setTypeDialogOpen(true);
  }

  function openCreateCabin() {
    setEditingCabin(null);
    setCabinForm({
      ...emptyCabinForm,
      cabin_type_id: cabinTypes[0] ? String(cabinTypes[0].id) : '',
    });
    setCabinDialogOpen(true);
  }

  function openEditCabin(cabin: Cabin) {
    setEditingCabin(cabin);
    setCabinForm({
      cabin_type_id: String(cabin.cabin_type_id),
      name: cabin.name,
      code: cabin.code,
      status: cabin.status,
      floor: cabin.floor ? String(cabin.floor) : '',
      notes: cabin.notes ?? '',
    });
    setCabinDialogOpen(true);
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

  function openUpload(cabinType?: CabinType) {
    setUploadForm({
      ...emptyUploadForm,
      cabin_type_id: cabinType ? String(cabinType.id) : cabinTypes[0] ? String(cabinTypes[0].id) : '',
    });
    setUploadDialogOpen(true);
  }

  function openEditMedia(media: MediaWithType) {
    setEditingMedia(media);
    setMediaForm({
      alt: media.alt ?? '',
      type: media.type,
      sort_order: String(media.sort_order),
    });
  }

  function handleTypeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!typeForm.name || !typeForm.slug || !typeForm.base_price) {
      toast.error('Completa nombre, slug y precio base.');
      return;
    }

    saveTypeMutation.mutate(
      cleanPayload({
        ...typeForm,
        base_price: Number(typeForm.base_price),
        max_guests: Number(typeForm.max_guests),
        bedrooms: Number(typeForm.bedrooms),
        bathrooms: Number(typeForm.bathrooms),
        size_sqm: typeForm.size_sqm ? Number(typeForm.size_sqm) : '',
        sort_order: Number(typeForm.sort_order),
      }),
    );
  }

  function handleCabinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cabinForm.cabin_type_id || !cabinForm.name || !cabinForm.code) {
      toast.error('Completa tipo, nombre y codigo.');
      return;
    }

    saveCabinMutation.mutate(
      cleanPayload({
        ...cabinForm,
        cabin_type_id: Number(cabinForm.cabin_type_id),
        floor: cabinForm.floor ? Number(cabinForm.floor) : '',
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

  function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadForm.cabin_type_id || !uploadForm.file) {
      toast.error('Selecciona tipo de cabaña y archivo.');
      return;
    }

    const formData = new FormData();
    formData.append('cabin_type_id', uploadForm.cabin_type_id);
    formData.append('file', uploadForm.file);
    formData.append('type', uploadForm.type);
    formData.append('sort_order', uploadForm.sort_order || '0');

    if (uploadForm.alt) {
      formData.append('alt', uploadForm.alt);
    }

    uploadMediaMutation.mutate(formData);
  }

  function handleMediaUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingMedia) {
      return;
    }

    updateMediaMutation.mutate({
      id: editingMedia.id,
      payload: cleanPayload({
        alt: mediaForm.alt,
        type: mediaForm.type,
        sort_order: Number(mediaForm.sort_order),
      }),
    });
  }

  function toggleAmenity(id: number) {
    setTypeForm((current) => ({
      ...current,
      amenity_ids: current.amenity_ids.includes(id)
        ? current.amenity_ids.filter((amenityId) => amenityId !== id)
        : [...current.amenity_ids, id],
    }));
  }

  const isBusy =
    saveTypeMutation.isPending ||
    saveCabinMutation.isPending ||
    saveAmenityMutation.isPending ||
    uploadMediaMutation.isPending ||
    updateMediaMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Alojamiento
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">Cabañas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Gestiona fichas públicas, unidades físicas, amenidades e imágenes del catálogo.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => openUpload()} variant="outline">
            <ImagePlus className="h-4 w-4" />
            Subir imagen
          </Button>
          <Button onClick={openCreateType}>
            <Plus className="h-4 w-4" />
            Nuevo tipo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Tipos" value={totals.types} />
        <Metric label="Activos" value={totals.activeTypes} />
        <Metric label="Unidades" value={totals.units} />
        <Metric label="Disponibles" value={totals.availableUnits} />
        <Metric label="Imágenes" value={totals.media} />
      </div>

      <Tabs defaultValue="types" className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="types">Tipos</TabsTrigger>
          <TabsTrigger value="units">Unidades</TabsTrigger>
          <TabsTrigger value="amenities">Amenidades</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_180px_auto]">
            <SearchInput value={typeSearch} onChange={setTypeSearch} placeholder="Buscar tipo o slug" />
            <Select value={typeActive} onValueChange={setTypeActive}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreateType}>
              <Plus className="h-4 w-4" />
              Tipo
            </Button>
          </div>

          {cabinTypesQuery.isLoading ? (
            <LoadingState />
          ) : cabinTypesQuery.isError ? (
            <ErrorState message="No pudimos cargar los tipos de cabaña." />
          ) : cabinTypes.length > 0 ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {cabinTypes.map((cabinType) => (
                <article key={cabinType.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="grid sm:grid-cols-[220px_1fr]">
                    <div
                      className="min-h-[180px] bg-cover bg-center"
                      style={{ backgroundImage: `url(${getCabinCover(cabinType)})` }}
                    />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-semibold tracking-normal">{cabinType.name}</h2>
                            <Badge variant={cabinType.is_active ? 'default' : 'secondary'}>
                              {cabinType.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {cabinType.short_description ?? cabinType.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <MiniStat label="Precio" value={formatCurrencyCOP(cabinType.base_price)} />
                        <MiniStat label="Capacidad" value={`${cabinType.max_guests}`} />
                        <MiniStat label="Unidades" value={`${cabinType.cabins_count ?? 0}`} />
                        <MiniStat label="Libres" value={`${cabinType.available_cabins_count ?? 0}`} />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(cabinType.amenities ?? []).slice(0, 5).map((amenity) => (
                          <Badge key={amenity.id} variant="outline">
                            {amenity.name}
                          </Badge>
                        ))}
                        {(cabinType.amenities?.length ?? 0) > 5 ? (
                          <Badge variant="secondary">+{(cabinType.amenities?.length ?? 0) - 5}</Badge>
                        ) : null}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditType(cabinType)}>
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openUpload(cabinType)}>
                          <Upload className="h-4 w-4" />
                          Imagen
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTypeMutation.mutate(cabinType.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No hay tipos de cabaña" actionLabel="Crear tipo" onAction={openCreateType} />
          )}
        </TabsContent>

        <TabsContent value="units" className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_180px_220px_auto]">
            <SearchInput value={unitSearch} onChange={setUnitSearch} placeholder="Buscar unidad o código" />
            <Select value={unitStatus} onValueChange={setUnitStatus}>
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
            <Select value={unitTypeId} onValueChange={setUnitTypeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {cabinTypes.map((cabinType) => (
                  <SelectItem key={cabinType.id} value={String(cabinType.id)}>
                    {cabinType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreateCabin}>
              <Plus className="h-4 w-4" />
              Unidad
            </Button>
          </div>

          <div className="rounded-lg border bg-white">
            {cabinsQuery.isLoading ? (
              <LoadingState />
            ) : cabinsQuery.isError ? (
              <ErrorState message="No pudimos cargar las unidades." />
            ) : cabins.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Piso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cabins.map((cabin) => (
                    <TableRow key={cabin.id}>
                      <TableCell>
                        <div className="font-medium">{cabin.name}</div>
                        <div className="text-xs text-muted-foreground">{cabin.code}</div>
                      </TableCell>
                      <TableCell>{cabin.type?.name ?? 'Sin tipo'}</TableCell>
                      <TableCell>
                        <StatusBadge status={cabin.status} label={cabin.status_label} />
                      </TableCell>
                      <TableCell>{cabin.floor ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon-sm" variant="ghost" onClick={() => openEditCabin(cabin)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteCabinMutation.mutate(cabin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No hay unidades registradas" actionLabel="Crear unidad" onAction={openCreateCabin} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="amenities" className="space-y-5">
          <div className="flex justify-end">
            <Button onClick={openCreateAmenity}>
              <Plus className="h-4 w-4" />
              Amenidad
            </Button>
          </div>
          <div className="rounded-lg border bg-white">
            {amenitiesQuery.isLoading ? (
              <LoadingState />
            ) : amenitiesQuery.isError ? (
              <ErrorState message="No pudimos cargar las amenidades." />
            ) : amenities.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Icono</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amenities.map((amenity) => (
                    <TableRow key={amenity.id}>
                      <TableCell className="font-medium">{amenity.name}</TableCell>
                      <TableCell>{amenity.icon ?? '-'}</TableCell>
                      <TableCell>{amenity.category ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon-sm" variant="ghost" onClick={() => openEditAmenity(amenity)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteAmenityMutation.mutate(amenity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No hay amenidades" actionLabel="Crear amenidad" onAction={openCreateAmenity} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-5">
          <div className="flex justify-end">
            <Button onClick={() => openUpload()}>
              <ImagePlus className="h-4 w-4" />
              Subir imagen
            </Button>
          </div>
          {mediaItems.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {mediaItems.map((media) => (
                <article key={media.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div
                    className="aspect-[4/3] bg-cover bg-center"
                    style={{ backgroundImage: `url(${media.url})` }}
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{media.cabin_type_name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {media.alt ?? 'Sin texto alternativo'}
                        </p>
                      </div>
                      <Badge variant="outline">#{media.sort_order}</Badge>
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
                        onClick={() => deleteMediaMutation.mutate(media.id)}
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
            <EmptyState title="No hay imágenes cargadas" actionLabel="Subir imagen" onAction={() => openUpload()} />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <form onSubmit={handleTypeSubmit}>
            <DialogHeader>
              <DialogTitle>{editingType ? 'Editar tipo' : 'Nuevo tipo de cabaña'}</DialogTitle>
              <DialogDescription>
                Esta ficha alimenta el catálogo público y la disponibilidad agrupada.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre">
                <Input
                  value={typeForm.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setTypeForm((current) => ({
                      ...current,
                      name,
                      slug: current.slug && editingType ? current.slug : slugify(name),
                    }));
                  }}
                  required
                />
              </Field>
              <Field label="Slug">
                <Input
                  value={typeForm.slug}
                  onChange={(event) => setTypeForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                  required
                />
              </Field>
              <Field label="Precio base">
                <Input
                  type="number"
                  min={0}
                  value={typeForm.base_price}
                  onChange={(event) => setTypeForm((current) => ({ ...current, base_price: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Orden">
                <Input
                  type="number"
                  min={0}
                  value={typeForm.sort_order}
                  onChange={(event) => setTypeForm((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </Field>
              <Field label="Huéspedes">
                <Input
                  type="number"
                  min={1}
                  value={typeForm.max_guests}
                  onChange={(event) => setTypeForm((current) => ({ ...current, max_guests: event.target.value }))}
                />
              </Field>
              <Field label="Habitaciones">
                <Input
                  type="number"
                  min={0}
                  value={typeForm.bedrooms}
                  onChange={(event) => setTypeForm((current) => ({ ...current, bedrooms: event.target.value }))}
                />
              </Field>
              <Field label="Baños">
                <Input
                  type="number"
                  min={0}
                  value={typeForm.bathrooms}
                  onChange={(event) => setTypeForm((current) => ({ ...current, bathrooms: event.target.value }))}
                />
              </Field>
              <Field label="Metros cuadrados">
                <Input
                  type="number"
                  min={0}
                  value={typeForm.size_sqm}
                  onChange={(event) => setTypeForm((current) => ({ ...current, size_sqm: event.target.value }))}
                />
              </Field>
              <Field label="Imagen principal URL">
                <Input
                  value={typeForm.image}
                  onChange={(event) => setTypeForm((current) => ({ ...current, image: event.target.value }))}
                  placeholder="https://..."
                />
              </Field>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={typeForm.is_active}
                  onChange={(event) => setTypeForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                Visible en la página pública
              </label>
              <Field label="Resumen" className="sm:col-span-2">
                <Textarea
                  value={typeForm.short_description}
                  onChange={(event) => setTypeForm((current) => ({ ...current, short_description: event.target.value }))}
                  rows={2}
                />
              </Field>
              <Field label="Descripción" className="sm:col-span-2">
                <Textarea
                  value={typeForm.description}
                  onChange={(event) => setTypeForm((current) => ({ ...current, description: event.target.value }))}
                  rows={5}
                />
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium">Amenidades</p>
                <div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
                  {amenities.length > 0 ? (
                    amenities.map((amenity) => (
                      <label key={amenity.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={typeForm.amenity_ids.includes(amenity.id)}
                          onChange={() => toggleAmenity(amenity.id)}
                        />
                        {amenity.name}
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Crea amenidades para asignarlas.</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setTypeDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
                {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cabinDialogOpen} onOpenChange={setCabinDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCabinSubmit}>
            <DialogHeader>
              <DialogTitle>{editingCabin ? 'Editar unidad' : 'Nueva unidad física'}</DialogTitle>
              <DialogDescription>Las unidades alimentan disponibilidad y operación interna.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Tipo">
                <Select
                  value={cabinForm.cabin_type_id}
                  onValueChange={(value) => setCabinForm((current) => ({ ...current, cabin_type_id: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cabinTypes.map((cabinType) => (
                      <SelectItem key={cabinType.id} value={String(cabinType.id)}>
                        {cabinType.name}
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
              <Field label="Nombre">
                <Input
                  value={cabinForm.name}
                  onChange={(event) => setCabinForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Código">
                <Input
                  value={cabinForm.code}
                  onChange={(event) => setCabinForm((current) => ({ ...current, code: event.target.value }))}
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
              <Field label="Notas" className="sm:col-span-2">
                <Textarea
                  value={cabinForm.notes}
                  onChange={(event) => setCabinForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                />
              </Field>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setCabinDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isBusy}>
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
              <Field label="Categoría">
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

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUploadSubmit}>
            <DialogHeader>
              <DialogTitle>Subir imagen</DialogTitle>
              <DialogDescription>Adjunta una imagen JPG, PNG o WebP para una ficha pública.</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4">
              <Field label="Tipo de cabaña">
                <Select
                  value={uploadForm.cabin_type_id}
                  onValueChange={(value) => setUploadForm((current) => ({ ...current, cabin_type_id: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cabinTypes.map((cabinType) => (
                      <SelectItem key={cabinType.id} value={String(cabinType.id)}>
                        {cabinType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Archivo">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setUploadForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
                  }
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
              <DialogTitle>Editar imagen</DialogTitle>
              <DialogDescription>{editingMedia?.cabin_type_name}</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid gap-4">
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
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
