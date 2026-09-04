'use client';

import Link from 'next/link';
import {
  Bath,
  BedDouble,
  DollarSign,
  Edit,
  Home,
  LoaderCircle,
  MapPinned,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CabinMap } from '@/components/cabins/cabin-map';
import { LodgingTariffDetails } from '@/components/cabins/lodging-tariff-details';
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
  getCabinCover,
} from '@/lib/cabin-utils';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type {
  Amenity,
  Cabin,
  CabinStatus,
  LodgingTariff,
  MapSlot,
} from '@/types/cabin';

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

const statusOptions: Array<{ label: string; value: CabinStatus | 'all' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Disponible', value: 'available' },
  { label: 'Ocupada', value: 'occupied' },
  { label: 'Mantenimiento', value: 'maintenance' },
  { label: 'Inactiva', value: 'inactive' },
];

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

export function CabinsAdmin() {
  const queryClient = useQueryClient();
  const [cabinSearch, setCabinSearch] = useState('');
  const [cabinStatus, setCabinStatus] = useState('all');
  const [cabinActive, setCabinActive] = useState('all');
  const [selectedSlot, setSelectedSlot] = useState<MapSlot | null>(null);
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

  const cabins = useMemo(() => cabinsQuery.data?.data ?? [], [cabinsQuery.data?.data]);
  const tariffs = useMemo(() => tariffsQuery.data?.data ?? [], [tariffsQuery.data?.data]);
  const amenities = useMemo(() => amenitiesQuery.data?.data ?? [], [amenitiesQuery.data?.data]);

  const selectedSlotCabin = selectedSlot
    ? cabins.find((cabin) => cabin.map_slot === selectedSlot)
    : null;

  const totals = useMemo(() => {
    return {
      cabins: cabins.length,
      activeCabins: cabins.filter((cabin) => cabin.is_active).length,
      availableCabins: cabins.filter((cabin) => cabin.status === 'available').length,
      tariffs: tariffs.filter((tariff) => tariff.is_active).length,
    };
  }, [cabins, tariffs]);

  const deleteCabinMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/admin/cabins/${id}`),
    onSuccess: () => {
      toast.success('Cabaña eliminada');
      void queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
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

  const isBusy = saveTariffMutation.isPending || saveAmenityMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Alojamiento
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">Cabañas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Gestiona cabañas reales, ubicacion interna, tarifas globales y amenidades.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/admin/cabanas/nueva">
              <Plus className="h-4 w-4" />
              Nueva cabaña
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Cabañas" value={totals.cabins} />
        <Metric label="Activas" value={totals.activeCabins} />
        <Metric label="Disponibles" value={totals.availableCabins} />
        <Metric label="Tarifas" value={totals.tariffs} />
      </div>

      <Tabs defaultValue="cabins" className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="cabins">Cabañas</TabsTrigger>
          <TabsTrigger value="map">Mapa</TabsTrigger>
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
            <Button asChild>
              <Link href="/admin/cabanas/nueva">
                <Plus className="h-4 w-4" />
                Cabaña
              </Link>
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
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/admin/cabanas/${cabin.id}/editar`} aria-label={`Editar ${cabin.name}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
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
            <EmptyState title="No hay cabañas registradas" actionLabel="Crear cabaña" href="/admin/cabanas/nueva" />
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
                    <Button asChild className="w-full">
                      <Link href={`/admin/cabanas/${selectedSlotCabin.id}/editar`}>
                        <Edit className="h-4 w-4" />
                        Editar cabaña
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Punto disponible para asignar.</p>
                    <Button asChild className="mt-4 w-full">
                      <Link href={`/admin/cabanas/nueva?map_slot=${selectedSlot}`}>
                        <Plus className="h-4 w-4" />
                        Crear en este punto
                      </Link>
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
                  <LodgingTariffDetails
                    tariff={tariff}
                    headerAccessory={(
                      <>
                        <Badge variant="outline">Orden {tariff.sort_order}</Badge>
                        <Badge variant={tariff.is_active ? 'default' : 'outline'}>
                          {tariff.is_active ? 'Publica' : 'Oculta'}
                        </Badge>
                      </>
                    )}
                  />
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
  href,
}: {
  title: string;
  actionLabel: string;
  onAction?: () => void;
  href?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-white p-8 text-center">
      <Home className="mx-auto h-8 w-8 text-cyan-700" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {href ? (
        <Button asChild className="mt-5">
          <Link href={href}>
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Link>
        </Button>
      ) : (
        <Button onClick={onAction} className="mt-5">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
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
