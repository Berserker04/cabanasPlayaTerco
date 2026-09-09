'use client';

import { useConfirm } from '@/providers/confirmation-provider';

import Link from 'next/link';
import {
  Bath,
  BedDouble,
  DollarSign,
  Edit,
  Home,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CabinMapEditor } from '@/components/cabins/cabin-map-editor';
import { LodgingTariffDetails } from '@/components/cabins/lodging-tariff-details';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { panelPermissions } from '@/lib/panel-access';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
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
import { getCabinCover } from '@/lib/cabin-utils';
import type { ApiListResponse, ApiResponse } from '@/types/api';
import type { Amenity, Cabin, CabinStatus, LodgingTariff } from '@/types/cabin';

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

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
) {
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
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, value === '' ? null : value]),
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
  const { user } = useAuth();
  const { canAdminister } = panelPermissions(user);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [cabinSearch, setCabinSearch] = useState('');
  const [activeTab, setActiveTab] = useState('cabins');
  const [mapDirty, setMapDirty] = useState(false);
  const [cabinStatus, setCabinStatus] = useState('all');
  const [cabinActive, setCabinActive] = useState('all');
  const [page, setPage] = useState(1);
  const [trashed, setTrashed] = useState('without');
  const [tariffPage, setTariffPage] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [dialogBaseline, setDialogBaseline] = useState('');
  const [tariffDialogOpen, setTariffDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<LodgingTariff | null>(
    null,
  );
  const [tariffForm, setTariffForm] =
    useState<TariffFormState>(emptyTariffForm);
  const [amenityDialogOpen, setAmenityDialogOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [amenityForm, setAmenityForm] =
    useState<AmenityFormState>(emptyAmenityForm);

  const cabinsQuery = useQuery({
    queryKey: [
      'admin-cabins',
      cabinSearch,
      cabinStatus,
      cabinActive,
      page,
      trashed,
    ],
    queryFn: () =>
      api.get<
        ApiListResponse<Cabin> & {
          summary: {
            total: number;
            public: number;
            available: number;
            deleted: number;
          };
        }
      >(
        `/admin/cabins${buildQuery({
          search: cabinSearch,
          page,
          trashed,
          per_page: 12,
          status: cabinStatus === 'all' ? undefined : cabinStatus,
          is_active:
            cabinActive === 'all' ? undefined : cabinActive === 'active',
        })}`,
      ),
  });

  const tariffsQuery = useQuery({
    queryKey: ['admin-lodging-tariffs', tariffPage],
    queryFn: () =>
      api.get<ApiListResponse<LodgingTariff>>(
        `/admin/lodging-tariffs?page=${tariffPage}`,
      ),
  });

  const amenitiesQuery = useQuery({
    queryKey: ['admin-amenities'],
    queryFn: () => api.get<ApiResponse<Amenity[]>>('/admin/amenities'),
  });

  const cabins = useMemo(
    () => cabinsQuery.data?.data ?? [],
    [cabinsQuery.data?.data],
  );
  const tariffs = useMemo(
    () => tariffsQuery.data?.data ?? [],
    [tariffsQuery.data?.data],
  );
  const amenities = useMemo(
    () => amenitiesQuery.data?.data ?? [],
    [amenitiesQuery.data?.data],
  );

  const summary = cabinsQuery.data?.summary;
  const totals = {
    cabins: summary?.total ?? 0,
    activeCabins: summary?.public ?? 0,
    availableCabins: summary?.available ?? 0,
    deleted: summary?.deleted ?? 0,
  };
  const dialogDirty =
    (tariffDialogOpen || amenityDialogOpen) &&
    dialogBaseline !==
      JSON.stringify(tariffDialogOpen ? tariffForm : amenityForm);
  useUnsavedChanges(dialogDirty);
  async function closeDialog(kind: 'tariff' | 'amenity', open: boolean) {
    if (
      !open &&
      (saveTariffMutation.isPending || saveAmenityMutation.isPending)
    )
      return;
    if (
      !open &&
      dialogDirty &&
      !(await confirm('¿Descartar los cambios sin guardar?'))
    )
      return;
    if (kind === 'tariff') setTariffDialogOpen(open);
    else setAmenityDialogOpen(open);
  }
  function formFailure(error: unknown) {
    setFieldErrors(
      error instanceof ApiError
        ? { form: [error.message], ...error.errors }
        : { form: ['No pudimos guardar. Reintenta sin cerrar el formulario.'] },
    );
    toast.error(apiErrorMessage(error));
  }
  const restoreCabinMutation = useMutation({
    mutationFn: (id: number) =>
      api.post('/admin/cabins/' + id + '/restore', {}),
    onSuccess: () => {
      toast.success('Cabaña restaurada. Está oculta hasta que la publiques.');
      void queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteCabinMutation = useMutation({
    mutationFn: (id: number) =>
      api.delete<{ message: string }>(`/admin/cabins/${id}`),
    onSuccess: () => {
      toast.success('Cabaña eliminada. Se conservan sus reservas y archivos.');
      void queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const saveTariffMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingTariff
        ? api.put<ApiResponse<LodgingTariff>>(
            `/admin/lodging-tariffs/${editingTariff.id}`,
            payload,
          )
        : api.post<ApiResponse<LodgingTariff>>(
            '/admin/lodging-tariffs',
            payload,
          ),
    onSuccess: () => {
      toast.success(editingTariff ? 'Tarifa actualizada' : 'Tarifa creada');
      setFieldErrors({});
      setTariffDialogOpen(false);
      void queryClient.invalidateQueries();
    },
    onError: formFailure,
  });

  const deleteTariffMutation = useMutation({
    mutationFn: (id: number) =>
      api.delete<{ message: string }>(`/admin/lodging-tariffs/${id}`),
    onSuccess: () => {
      toast.success('Tarifa eliminada');
      void queryClient.invalidateQueries({
        queryKey: ['admin-lodging-tariffs'],
      });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const saveAmenityMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingAmenity
        ? api.put<ApiResponse<Amenity>>(
            `/admin/amenities/${editingAmenity.id}`,
            payload,
          )
        : api.post<ApiResponse<Amenity>>('/admin/amenities', payload),
    onSuccess: () => {
      toast.success(
        editingAmenity ? 'Amenidad actualizada' : 'Amenidad creada',
      );
      setFieldErrors({});
      setAmenityDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-amenities'] });
      void queryClient.invalidateQueries();
    },
    onError: formFailure,
  });

  const deleteAmenityMutation = useMutation({
    mutationFn: (id: number) =>
      api.delete<{ message: string }>(`/admin/amenities/${id}`),
    onSuccess: () => {
      toast.success('Amenidad eliminada');
      void queryClient.invalidateQueries({ queryKey: ['admin-amenities'] });
      void queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  function openCreateTariff() {
    setEditingTariff(null);
    setFieldErrors({});
    setDialogBaseline(JSON.stringify(emptyTariffForm));
    setTariffForm(emptyTariffForm);
    setTariffDialogOpen(true);
  }

  function openEditTariff(tariff: LodgingTariff) {
    setEditingTariff(tariff);
    const nextForm = {
      title: tariff.title,
      price_cop: String(tariff.price_cop),
      unit_label: tariff.unit_label,
      description: tariff.description ?? '',
      includes: joinLines(tariff.includes),
      excludes: joinLines(tariff.excludes),
      public_notes: tariff.public_notes ?? '',
      is_active: tariff.is_active,
      sort_order: String(tariff.sort_order),
    };
    setTariffForm(nextForm);
    setFieldErrors({});
    setDialogBaseline(JSON.stringify(nextForm));
    setTariffDialogOpen(true);
  }

  function openCreateAmenity() {
    setEditingAmenity(null);
    setFieldErrors({});
    setDialogBaseline(JSON.stringify(emptyAmenityForm));
    setAmenityForm(emptyAmenityForm);
    setAmenityDialogOpen(true);
  }

  function openEditAmenity(amenity: Amenity) {
    setEditingAmenity(amenity);
    const nextForm = {
      name: amenity.name,
      icon: amenity.icon ?? '',
      category: amenity.category ?? '',
    };
    setAmenityForm(nextForm);
    setFieldErrors({});
    setDialogBaseline(JSON.stringify(nextForm));
    setAmenityDialogOpen(true);
  }

  function handleTariffSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tariffForm.title || !tariffForm.price_cop || !tariffForm.unit_label) {
      setFieldErrors({
        title: !tariffForm.title.trim() ? ['El título es obligatorio.'] : [],
        price_cop: !tariffForm.price_cop ? ['El precio es obligatorio.'] : [],
        unit_label: !tariffForm.unit_label.trim()
          ? ['La unidad es obligatoria.']
          : [],
      });
      return;
    }

    setFieldErrors({});
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
      setFieldErrors({ name: ['El nombre es obligatorio.'] });
      return;
    }

    setFieldErrors({});
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
            {canAdminister
              ? 'Gestiona cabañas reales, ubicación interna, tarifas globales y amenidades.'
              : 'Consulta las cabañas, su ubicación, tarifas y amenidades. La edición del catálogo está reservada al Administrador.'}
          </p>
        </div>
        {canAdminister && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/admin/cabanas/nueva">
                <Plus className="h-4 w-4" />
                Nueva cabaña
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Cabañas" value={totals.cabins} />
        <Metric label="Publicadas" value={totals.activeCabins} />
        <Metric label="Disponibles" value={totals.availableCabins} />
        <Metric label="Eliminadas" value={totals.deleted} />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={async (value) => {
          if (
            mapDirty &&
            !(await confirm(
              'Hay cambios del mapa sin guardar. ¿Descartarlos y cambiar de pestaña?',
            ))
          )
            return;
          setActiveTab(value);
        }}
        className="space-y-5"
      >
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="cabins">Cabañas</TabsTrigger>
          <TabsTrigger value="map">Mapa</TabsTrigger>
          <TabsTrigger value="tariffs">Tarifas</TabsTrigger>
          <TabsTrigger value="amenities">Amenidades</TabsTrigger>
        </TabsList>

        <TabsContent value="cabins" className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[minmax(0,1fr)_150px_150px_160px]">
            <SearchInput
              value={cabinSearch}
              onChange={(value) => {
                setCabinSearch(value);
                setPage(1);
              }}
              placeholder="Buscar cabaña"
            />
            <Select
              value={cabinStatus}
              onValueChange={(value) => {
                setCabinStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filtrar por estado" className="w-full">
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
            <Select
              value={cabinActive}
              onValueChange={(value) => {
                setCabinActive(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Filtrar por visibilidad"
                className="w-full"
              >
                <SelectValue placeholder="Visibilidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Publicas</SelectItem>
                <SelectItem value="inactive">Ocultas</SelectItem>
              </SelectContent>
            </Select>
            <select
              aria-label="Filtrar eliminadas"
              className="h-9 w-full rounded-md border px-3 text-sm"
              value={trashed}
              onChange={(event) => {
                setTrashed(event.target.value);
                setPage(1);
              }}
            >
              <option value="without">Sin eliminar</option>
              <option value="only">Eliminadas</option>
              <option value="with">Todas, incluidas eliminadas</option>
            </select>{' '}
          </div>

          {cabinsQuery.isLoading ? (
            <LoadingState />
          ) : cabinsQuery.isError ? (
            <ErrorState
              message="No pudimos cargar las cabañas."
              onRetry={() => void cabinsQuery.refetch()}
            />
          ) : cabins.length > 0 ? (
            <div className="overflow-hidden rounded-lg border bg-white">
              <Table>
                <TableHeader className="hidden sm:table-header-group">
                  <TableRow>
                    <TableHead>Cabaña</TableHead>
                    <TableHead>Mapa</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Estado</TableHead>
                    {canAdminister && (
                      <TableHead className="text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cabins.map((cabin) => (
                    <TableRow
                      key={cabin.id}
                      className="block p-3 sm:table-row sm:p-0"
                    >
                      <TableCell className="block whitespace-normal sm:table-cell">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-14 w-20 shrink-0 rounded-md bg-cover bg-center"
                            style={{
                              backgroundImage: `url(${getCabinCover(cabin)})`,
                            }}
                          />
                          <div>
                            <p className="font-medium">{cabin.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {cabin.code}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="block whitespace-normal sm:table-cell">
                        {cabin.map_slot ? (
                          <Badge variant="outline">
                            {cabin.map_point?.label ?? cabin.map_slot}
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="block whitespace-normal sm:table-cell">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-1 text-cyan-900">
                            <Users className="h-3 w-3" />
                            {cabin.min_guests}-{cabin.max_guests}
                            <span className="sr-only"> huéspedes</span>
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1">
                            <BedDouble className="h-3 w-3" />
                            {cabin.beds_count}
                            <span className="sr-only"> camas</span>
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1">
                            <Bath className="h-3 w-3" />
                            {cabin.bathrooms_count}
                            <span className="sr-only"> baños</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="block whitespace-normal sm:table-cell">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            status={cabin.status}
                            label={cabin.status_label}
                          />
                          {cabin.deleted_at && (
                            <Badge variant="destructive">Eliminada</Badge>
                          )}
                          {!cabin.is_active ? (
                            <Badge variant="outline">Oculta</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      {canAdminister && (
                        <TableCell className="block whitespace-normal sm:table-cell sm:text-right">
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            {!cabin.deleted_at && (
                              <Button size="sm" variant="outline" asChild>
                                <Link
                                  href={`/admin/cabanas/${cabin.id}/editar`}
                                  aria-label={`Editar ${cabin.name}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                            {cabin.deleted_at ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={restoreCabinMutation.isPending}
                                onClick={async () => {
                                  if (
                                    await confirm(
                                      `¿Restaurar «${cabin.name}»? Volverá oculta y conservará sus recursos y posición.`,
                                    )
                                  )
                                    restoreCabinMutation.mutate(cabin.id);
                                }}
                              >
                                Restaurar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                aria-label={`Eliminar ${cabin.name}`}
                                disabled={deleteCabinMutation.isPending}
                                onClick={async () => {
                                  if (
                                    await confirm(
                                      `¿Eliminar «${cabin.name}»? Se conservarán sus reservas, archivos y posición. Podrás restaurarla.`,
                                    )
                                  )
                                    deleteCabinMutation.mutate(cabin.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title={
                cabinSearch ||
                cabinStatus !== 'all' ||
                cabinActive !== 'all' ||
                trashed !== 'without'
                  ? 'No hay cabañas que coincidan con estos filtros'
                  : 'No hay cabañas registradas'
              }
              actionLabel="Crear cabaña"
              href={canAdminister ? '/admin/cabanas/nueva' : undefined}
            />
          )}
          <Pagination
            page={page}
            pages={cabinsQuery.data?.meta.last_page ?? 1}
            total={cabinsQuery.data?.meta.total ?? 0}
            onChange={setPage}
          />
        </TabsContent>

        <TabsContent value="map" className="space-y-5">
          <CabinMapEditor canEdit={canAdminister} onDirtyChange={setMapDirty} />
        </TabsContent>

        <TabsContent value="tariffs" className="space-y-5">
          {canAdminister && (
            <div className="flex justify-end">
              <Button onClick={openCreateTariff}>
                <DollarSign className="h-4 w-4" />
                Nueva tarifa
              </Button>
            </div>
          )}

          {tariffsQuery.isLoading ? (
            <LoadingState />
          ) : tariffsQuery.isError ? (
            <ErrorState
              message="No pudimos cargar las tarifas."
              onRetry={() => void tariffsQuery.refetch()}
            />
          ) : tariffs.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {tariffs.map((tariff) => (
                <article
                  key={tariff.id}
                  className="rounded-lg border bg-white p-5 shadow-sm"
                >
                  <LodgingTariffDetails
                    tariff={tariff}
                    headerAccessory={
                      <>
                        <Badge variant="outline">
                          Orden {tariff.sort_order}
                        </Badge>
                        <Badge
                          variant={tariff.is_active ? 'default' : 'outline'}
                        >
                          {tariff.is_active ? 'Publica' : 'Oculta'}
                        </Badge>
                      </>
                    }
                  />
                  {canAdminister && (
                    <div className="mt-5 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditTariff(tariff)}
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleteTariffMutation.isPending}
                        onClick={async () => {
                          if (
                            await confirm(
                              `¿Eliminar la tarifa «${tariff.title}»?`,
                            )
                          )
                            deleteTariffMutation.mutate(tariff.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No hay tarifas registradas"
              actionLabel="Crear tarifa"
              onAction={canAdminister ? openCreateTariff : undefined}
            />
          )}
          <Pagination
            page={tariffPage}
            pages={tariffsQuery.data?.meta.last_page ?? 1}
            total={tariffsQuery.data?.meta.total ?? 0}
            onChange={setTariffPage}
          />
        </TabsContent>

        <TabsContent value="amenities" className="space-y-5">
          {canAdminister && (
            <div className="flex justify-end">
              <Button onClick={openCreateAmenity}>
                <Plus className="h-4 w-4" />
                Nueva amenidad
              </Button>
            </div>
          )}

          {amenitiesQuery.isPending ? (
            <LoadingState />
          ) : amenitiesQuery.isError ? (
            <ErrorState
              message="No pudimos cargar las amenidades."
              onRetry={() => void amenitiesQuery.refetch()}
            />
          ) : amenities.length > 0 ? (
            <div className="overflow-hidden rounded-lg border bg-white">
              <Table>
                <TableHeader className="hidden sm:table-header-group">
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Icono</TableHead>
                    <TableHead>Categoria</TableHead>
                    {canAdminister && (
                      <TableHead className="text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amenities.map((amenity) => (
                    <TableRow
                      key={amenity.id}
                      className="block p-3 sm:table-row sm:p-0"
                    >
                      <TableCell className="block whitespace-normal font-medium sm:table-cell">
                        {amenity.name}
                      </TableCell>
                      <TableCell className="block whitespace-normal sm:table-cell">
                        {amenity.icon ?? 'Sin icono'}
                      </TableCell>
                      <TableCell className="block whitespace-normal sm:table-cell">
                        {amenity.category ?? 'General'}
                      </TableCell>
                      {canAdminister && (
                        <TableCell className="block whitespace-normal sm:table-cell sm:text-right">
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              aria-label={`Editar ${amenity.name}`}
                              onClick={() => openEditAmenity(amenity)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              aria-label={`Eliminar ${amenity.name}`}
                              disabled={deleteAmenityMutation.isPending}
                              onClick={async () => {
                                if (
                                  await confirm(
                                    `¿Eliminar la amenidad «${amenity.name}» del catálogo global?`,
                                  )
                                )
                                  deleteAmenityMutation.mutate(amenity.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No hay amenidades registradas"
              actionLabel="Crear amenidad"
              onAction={canAdminister ? openCreateAmenity : undefined}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={canAdminister && tariffDialogOpen}
        onOpenChange={(open) => closeDialog('tariff', open)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleTariffSubmit} noValidate>
            <fieldset disabled={isBusy}>
              <DialogHeader>
                <DialogTitle>
                  {editingTariff ? 'Editar tarifa' : 'Nueva tarifa'}
                </DialogTitle>
                <DialogDescription>
                  Las tarifas son globales para Cabañas Playa Terco.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) => key === 'title' || key.startsWith('title.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="Titulo"
                >
                  <Input
                    value={tariffForm.title}
                    onChange={(event) =>
                      setTariffForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) =>
                        key === 'price_cop' || key.startsWith('price_cop.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="Precio COP"
                >
                  <Input
                    type="number"
                    min={0}
                    value={tariffForm.price_cop}
                    onChange={(event) =>
                      setTariffForm((current) => ({
                        ...current,
                        price_cop: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) =>
                        key === 'unit_label' || key.startsWith('unit_label.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="Unidad"
                >
                  <Input
                    value={tariffForm.unit_label}
                    onChange={(event) =>
                      setTariffForm((current) => ({
                        ...current,
                        unit_label: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) =>
                        key === 'sort_order' || key.startsWith('sort_order.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="Orden"
                >
                  <Input
                    type="number"
                    min={0}
                    value={tariffForm.sort_order}
                    onChange={(event) =>
                      setTariffForm((current) => ({
                        ...current,
                        sort_order: event.target.value,
                      }))
                    }
                  />
                </Field>
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={tariffForm.is_active}
                    onChange={(event) =>
                      setTariffForm((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                  />
                  Visible para clientes
                </label>
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) =>
                        key === 'description' || key.startsWith('description.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="Descripcion"
                  className="sm:col-span-2"
                >
                  <Textarea
                    value={tariffForm.description}
                    onChange={(event) =>
                      setTariffForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </Field>
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) =>
                        key === 'includes' || key.startsWith('includes.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="Incluye"
                  className="sm:col-span-2"
                >
                  <Textarea
                    value={tariffForm.includes}
                    onChange={(event) =>
                      setTariffForm((current) => ({
                        ...current,
                        includes: event.target.value,
                      }))
                    }
                    rows={4}
                  />
                </Field>
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) =>
                        key === 'excludes' || key.startsWith('excludes.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="No incluye"
                  className="sm:col-span-2"
                >
                  <Textarea
                    value={tariffForm.excludes}
                    onChange={(event) =>
                      setTariffForm((current) => ({
                        ...current,
                        excludes: event.target.value,
                      }))
                    }
                    rows={4}
                  />
                </Field>
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) =>
                        key === 'public_notes' ||
                        key.startsWith('public_notes.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="Notas publicas"
                  className="sm:col-span-2"
                >
                  <Textarea
                    value={tariffForm.public_notes}
                    onChange={(event) =>
                      setTariffForm((current) => ({
                        ...current,
                        public_notes: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </Field>
              </div>
              {fieldErrors.form && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {fieldErrors.form.join(' ')}
                </p>
              )}
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => closeDialog('tariff', false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isBusy}>
                  {saveTariffMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : null}
                  Guardar
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={canAdminister && amenityDialogOpen}
        onOpenChange={(open) => closeDialog('amenity', open)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <form onSubmit={handleAmenitySubmit} noValidate>
            <fieldset disabled={isBusy}>
              <DialogHeader>
                <DialogTitle>
                  {editingAmenity ? 'Editar amenidad' : 'Nueva amenidad'}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-5 grid gap-4">
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) => key === 'name' || key.startsWith('name.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="Nombre"
                >
                  <Input
                    value={amenityForm.name}
                    onChange={(event) =>
                      setAmenityForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </Field>
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) => key === 'icon' || key.startsWith('icon.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="Icono lucide"
                >
                  <Input
                    value={amenityForm.icon}
                    onChange={(event) =>
                      setAmenityForm((current) => ({
                        ...current,
                        icon: event.target.value,
                      }))
                    }
                    placeholder="wifi, waves, utensils"
                  />
                </Field>
                <Field
                  error={Object.entries(fieldErrors)
                    .filter(
                      ([key]) =>
                        key === 'category' || key.startsWith('category.'),
                    )
                    .flatMap(([, messages]) => messages)
                    .join(' ')}
                  label="Categoria"
                >
                  <Input
                    value={amenityForm.category}
                    onChange={(event) =>
                      setAmenityForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              {fieldErrors.form && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {fieldErrors.form.join(' ')}
                </p>
              )}
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => closeDialog('amenity', false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isBusy}>
                  Guardar
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
  error,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-sm text-destructive">
          {error}
        </span>
      )}
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
      <Input
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
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

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
      {message}{' '}
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
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
      ) : onAction ? (
        <Button onClick={onAction} className="mt-5">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: CabinStatus;
  label?: string;
}) {
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

function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p>
        {total} resultados · Página {page} de {Math.max(1, pages)}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
