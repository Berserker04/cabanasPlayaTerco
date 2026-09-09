'use client';

import { useConfirm } from '@/providers/confirmation-provider';

import Link from 'next/link';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Bath,
  BedDouble,
  Eye,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api } from '@/lib/api';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { cabinFormSchema, type CabinFormInput } from '@/lib/validations';
import type { ApiResponse } from '@/types/api';
import type {
  Cabin,
  CabinMapPoint,
  CabinMedia,
  CabinStatus,
  MapSlot,
} from '@/types/cabin';

const COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const GALLERY_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 150 * 1024 * 1024;
const MAX_NEW_MEDIA = 20;

const statusOptions: Array<{ label: string; value: CabinStatus }> = [
  { label: 'Disponible', value: 'available' },
  { label: 'Ocupada', value: 'occupied' },
  { label: 'Mantenimiento', value: 'maintenance' },
  { label: 'Inactiva', value: 'inactive' },
];

const formFieldNames = new Set<keyof CabinFormInput>([
  'name',
  'status',
  'floor',
  'short_description',
  'description',
  'min_guests',
  'guest_capacity',
  'max_guests',
  'beds_count',
  'bathrooms_count',
  'map_slot',
  'is_active',
  'sort_order',
  'notes',
]);

type ExistingMediaDraft = {
  id: number;
  url: string;
  type: 'image' | 'video';
  alt: string;
  sortOrder: string;
  originalAlt: string;
  originalSortOrder: string;
  removed: boolean;
};

type PendingMedia = {
  key: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  alt: string;
  sortOrder: string;
};

type CabinFormPageProps =
  | { mode: 'create'; initialMapSlot?: MapSlot }
  | { mode: 'edit'; cabinId: number };

function createDefaultValues(initialMapSlot?: MapSlot): CabinFormInput {
  return {
    name: '',
    status: 'available',
    floor: '',
    short_description: '',
    description: '',
    min_guests: '1',
    guest_capacity: '4',
    max_guests: '8',
    beds_count: '3',
    bathrooms_count: '1',
    map_slot: initialMapSlot ?? '',
    is_active: true,
    sort_order: '0',
    notes: '',
  };
}

function cabinToFormValues(cabin: Cabin): CabinFormInput {
  return {
    name: cabin.name,
    status: cabin.status,
    floor: cabin.floor === null ? '' : String(cabin.floor),
    short_description: cabin.short_description ?? '',
    description: cabin.description ?? '',
    min_guests: String(cabin.min_guests),
    guest_capacity: String(cabin.guest_capacity),
    max_guests: String(cabin.max_guests),
    beds_count: String(cabin.beds_count),
    bathrooms_count: String(cabin.bathrooms_count),
    map_slot: cabin.map_slot ?? '',
    is_active: cabin.is_active,
    sort_order: String(cabin.sort_order),
    notes: cabin.notes ?? '',
  };
}

function cabinMediaToDraft(media: CabinMedia): ExistingMediaDraft {
  return {
    id: media.id,
    url: media.url,
    type: media.type,
    alt: media.alt ?? '',
    sortOrder: String(media.sort_order),
    originalAlt: media.alt ?? '',
    originalSortOrder: String(media.sort_order),
    removed: false,
  };
}

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'No pudimos guardar la cabaña. Revisa tu conexion e intentalo de nuevo.';
}

export function CabinFormPage(props: CabinFormPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const editCabinId = props.mode === 'edit' ? props.cabinId : null;
  const initialMapSlot =
    props.mode === 'create' ? props.initialMapSlot : undefined;
  const initialValues = useMemo(
    () => createDefaultValues(initialMapSlot),
    [initialMapSlot],
  );
  const [persistedCabinId, setPersistedCabinId] = useState<number | null>(
    editCabinId,
  );
  const [currentCabin, setCurrentCabin] = useState<Cabin | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [createdDraft, setCreatedDraft] = useState(props.mode === 'create');
  const initialPointApplied = useRef(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [existingMedia, setExistingMedia] = useState<ExistingMediaDraft[]>([]);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const initializedCabinRef = useRef<number | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const pointsQuery = useQuery({
    queryKey: ['admin-cabin-map-points'],
    queryFn: () =>
      api.get<ApiResponse<CabinMapPoint[]>>('/admin/cabin-map-points'),
  });

  const cabinQuery = useQuery({
    queryKey: ['admin-cabin', editCabinId],
    queryFn: () => api.get<ApiResponse<Cabin>>(`/admin/cabins/${editCabinId}`),
    enabled:
      props.mode === 'edit' &&
      Number.isInteger(editCabinId) &&
      Number(editCabinId) > 0,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CabinFormInput>({
    resolver: zodResolver(cabinFormSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    const point = pointsQuery.data?.data.find(
      (item) => item.key === initialMapSlot,
    );
    if (props.mode === 'create' && point && !initialPointApplied.current) {
      initialPointApplied.current = true;
      if (!getValues('name')) setValue('name', point.label);
    }
  }, [pointsQuery.data, initialMapSlot, props.mode, getValues, setValue]);

  useEffect(() => {
    const cabin = cabinQuery.data?.data;

    if (!cabin || initializedCabinRef.current === cabin.id) {
      return;
    }

    initializedCabinRef.current = cabin.id;
    const cabinValues = cabinToFormValues(cabin);
    setCurrentCabin(cabin);
    setPersistedCabinId(cabin.id);
    setExistingMedia((cabin.media ?? []).map(cabinMediaToDraft));
    reset(cabinValues, { keepDefaultValues: false, keepDirty: false });
  }, [cabinQuery.data, reset]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  const effectiveMode = persistedCabinId ? 'edit' : 'create';
  const pageTitle =
    effectiveMode === 'edit'
      ? `Editar ${currentCabin?.name ?? 'cabaña'}`
      : 'Nueva cabaña';
  const pageDescription =
    effectiveMode === 'edit'
      ? 'Actualiza la ficha publica, la operacion y los recursos visuales de la cabaña.'
      : 'Registra la ficha completa y prepara su portada y galeria antes de publicarla.';
  const currentCoverUrl =
    coverPreviewUrl ?? (removeCover ? null : currentCabin?.cover_image) ?? null;
  const removedMedia = existingMedia.filter((media) => media.removed);
  const visibleMedia = existingMedia.filter((media) => !media.removed);
  const hasPendingMediaChanges = existingMedia.some(
    (media) =>
      media.removed ||
      media.alt !== media.originalAlt ||
      media.sortOrder !== media.originalSortOrder,
  );
  const hasPendingChanges =
    (createdDraft && persistedCabinId !== null) ||
    removeCover ||
    isDirty ||
    Boolean(coverFile) ||
    pendingMedia.length > 0 ||
    hasPendingMediaChanges;

  useUnsavedChanges(hasPendingChanges && !isSaving);

  function applyApiErrors(error: ApiError) {
    Object.entries(error.errors ?? {}).forEach(([field, messages]) => {
      if (formFieldNames.has(field as keyof CabinFormInput) && messages[0]) {
        setError(field as keyof CabinFormInput, {
          type: 'server',
          message: messages[0],
        });
      }
    });
  }

  function selectCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setCoverError(null);

    if (!file) {
      setCoverFile(null);
      return;
    }

    if (!COVER_TYPES.has(file.type)) {
      setCoverError('Selecciona una imagen JPG, PNG o WebP.');
      event.target.value = '';
      return;
    }

    if (file.size > IMAGE_LIMIT) {
      setCoverError('La portada no puede superar los 10 MB.');
      event.target.value = '';
      return;
    }

    setRemoveCover(false);
    setCoverPreviewUrl(URL.createObjectURL(file));
    setCoverFile(file);
  }

  function clearCoverSelection() {
    setCoverFile(null);
    setCoverPreviewUrl(null);
    setCoverError(null);
    setCoverInputKey((current) => current + 1);
  }

  function selectGalleryFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setGalleryError(null);

    if (files.length === 0) {
      return;
    }

    if (pendingMedia.length + files.length > MAX_NEW_MEDIA) {
      setGalleryError(
        `Puedes preparar hasta ${MAX_NEW_MEDIA} archivos por guardado.`,
      );
      event.target.value = '';
      return;
    }

    const invalidFile = files.find((file) => {
      const limit = file.type.startsWith('video/') ? VIDEO_LIMIT : IMAGE_LIMIT;
      return !GALLERY_TYPES.has(file.type) || file.size > limit;
    });

    if (invalidFile) {
      const limitLabel = invalidFile.type.startsWith('video/')
        ? '150 MB'
        : '10 MB';
      setGalleryError(
        GALLERY_TYPES.has(invalidFile.type)
          ? `${invalidFile.name} supera el limite de ${limitLabel}.`
          : `${invalidFile.name} no tiene un formato compatible.`,
      );
      event.target.value = '';
      return;
    }

    const usedOrders = [...visibleMedia, ...pendingMedia].map(
      (media) => Number(media.sortOrder) || 0,
    );
    const nextOrder = usedOrders.length > 0 ? Math.max(...usedOrders) + 1 : 0;
    const fallbackAlt = getValues('name').trim();
    const additions = files.map((file, index): PendingMedia => {
      const previewUrl = URL.createObjectURL(file);

      return {
        key: crypto.randomUUID(),
        file,
        previewUrl,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        alt: fallbackAlt,
        sortOrder: String(nextOrder + index),
      };
    });

    setPendingMedia((current) => [...current, ...additions]);
    event.target.value = '';
  }

  function removePendingMedia(key: string) {
    setPendingMedia((current) => {
      const target = current.find((media) => media.key === key);

      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((media) => media.key !== key);
    });
  }

  async function markMediaForRemoval(id: number) {
    const media = existingMedia.find((item) => item.id === id);

    if (
      !media ||
      !(await confirm(
        'Este archivo se eliminara cuando guardes la cabaña. ¿Continuar?',
      ))
    ) {
      return;
    }

    setExistingMedia((current) =>
      current.map((item) =>
        item.id === id ? { ...item, removed: true } : item,
      ),
    );
  }

  async function uploadCover(cabinId: number) {
    if (!coverFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', coverFile);
    const response = await api.post<ApiResponse<Cabin>>(
      `/admin/cabins/${cabinId}/cover`,
      formData,
    );
    setCurrentCabin(response.data);
    clearCoverSelection();
  }

  async function updateExistingMedia() {
    const changedMedia = existingMedia.filter(
      (media) =>
        !media.removed &&
        (media.alt !== media.originalAlt ||
          media.sortOrder !== media.originalSortOrder),
    );

    for (const media of changedMedia) {
      const response = await api.put<ApiResponse<CabinMedia>>(
        `/admin/cabin-media/${media.id}`,
        {
          alt: media.alt || null,
          type: media.type,
          sort_order: Number(media.sortOrder),
        },
      );
      const saved = response.data;
      setExistingMedia((current) =>
        current.map((item) =>
          item.id === saved.id
            ? {
                ...item,
                alt: saved.alt ?? '',
                sortOrder: String(saved.sort_order),
                originalAlt: saved.alt ?? '',
                originalSortOrder: String(saved.sort_order),
              }
            : item,
        ),
      );
    }
  }

  async function uploadPendingMedia(cabinId: number) {
    for (const media of pendingMedia) {
      const formData = new FormData();
      formData.append('cabin_id', String(cabinId));
      formData.append('file', media.file);
      formData.append('type', media.type);
      formData.append('sort_order', media.sortOrder);

      if (media.alt.trim()) {
        formData.append('alt', media.alt.trim());
      }

      const response = await api.post<ApiResponse<CabinMedia>>(
        '/admin/cabin-media',
        formData,
      );
      setExistingMedia((current) => [
        ...current,
        cabinMediaToDraft(response.data),
      ]);
      removePendingMedia(media.key);
    }
  }

  async function deleteRemovedMedia() {
    const removals = existingMedia.filter((media) => media.removed);

    for (const media of removals) {
      await api.delete<{ message: string }>(`/admin/cabin-media/${media.id}`);
      setExistingMedia((current) =>
        current.filter((item) => item.id !== media.id),
      );
    }
  }

  async function saveCabin(values: CabinFormInput) {
    if (isSaving) {
      return;
    }

    setFormError(null);
    setGalleryError(null);

    const invalidMediaOrder = [
      ...existingMedia.filter((media) => !media.removed),
      ...pendingMedia,
    ].some(
      (media) =>
        !/^\d+$/.test(media.sortOrder) ||
        Number(media.sortOrder) < 0 ||
        Number(media.sortOrder) > 65535,
    );

    if (invalidMediaOrder) {
      setGalleryError(
        'El orden de cada archivo debe ser un número entero entre 0 y 65535.',
      );
      document
        .getElementById('galeria')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setIsSaving(true);
    let cabinId = persistedCabinId;
    let createdDuringSave = false;
    const completed: string[] = [];
    let stage = 'ficha';

    const payload = {
      name: values.name.trim(),
      status: values.status,
      floor: values.floor === '' ? null : Number(values.floor),
      short_description: values.short_description || null,
      description: values.description || null,
      min_guests: Number(values.min_guests),
      guest_capacity: Number(values.guest_capacity),
      max_guests: Number(values.max_guests),
      beds_count: Number(values.beds_count),
      bathrooms_count: Number(values.bathrooms_count),
      map_slot: values.map_slot,
      is_active: createdDraft ? false : values.is_active,
      sort_order: Number(values.sort_order),
      notes: values.notes || null,
    };

    try {
      const response = cabinId
        ? await api.put<ApiResponse<Cabin>>(`/admin/cabins/${cabinId}`, payload)
        : await api.post<ApiResponse<Cabin>>('/admin/cabins', payload);

      cabinId = response.data.id;
      createdDuringSave = persistedCabinId === null;
      setPersistedCabinId(cabinId);
      setCurrentCabin(response.data);
      reset(values);
      completed.push('ficha');

      if (createdDuringSave) {
        window.history.replaceState(
          window.history.state,
          '',
          `/admin/cabanas/${cabinId}/editar`,
        );
      }

      stage = 'portada';
      if (removeCover) {
        const coverResponse = await api.delete<ApiResponse<Cabin>>(
          '/admin/cabins/' + cabinId + '/cover',
        );
        setCurrentCabin(coverResponse.data);
        setRemoveCover(false);
      }
      await uploadCover(cabinId);
      completed.push('portada');
      stage = 'metadatos de la galería';
      await updateExistingMedia();
      completed.push('metadatos');
      stage = 'archivos nuevos';
      await uploadPendingMedia(cabinId);
      completed.push('archivos nuevos');
      stage = 'retiro de archivos';
      await deleteRemovedMedia();
      completed.push('retiro de archivos');
      stage = 'publicación';
      if (createdDraft && values.is_active)
        await api.put('/admin/cabins/' + cabinId, { is_active: true });
      setCreatedDraft(false);
      await queryClient.invalidateQueries({
        queryKey: ['admin-cabin-map-points'],
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
      await queryClient.invalidateQueries({
        queryKey: ['admin-cabin', cabinId],
      });
      toast.success(createdDuringSave ? 'Cabaña creada' : 'Cabaña actualizada');
      router.push('/admin/cabanas');
    } catch (error) {
      if (error instanceof ApiError) {
        applyApiErrors(error);
      }

      const message = apiErrorMessage(error);

      setFormError(
        completed.length
          ? 'Guardado: ' +
              completed.join(', ') +
              '. Pendiente: ' +
              stage +
              '. Los archivos confirmados se conservan; vuelve a guardar para reintentar. ' +
              message
          : message,
      );
      toast.error(
        completed.length
          ? 'Guardado parcial. Puedes reintentar sin duplicar la cabaña.'
          : message,
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (
    props.mode === 'edit' &&
    (!Number.isInteger(editCabinId) || Number(editCabinId) <= 0)
  ) {
    return (
      <CabinLoadError
        title="Identificador invalido"
        message="La cabaña solicitada no es valida."
      />
    );
  }

  if (props.mode === 'edit' && cabinQuery.isLoading) {
    return <CabinLoading />;
  }

  if (props.mode === 'edit' && cabinQuery.isError) {
    const notFound =
      cabinQuery.error instanceof ApiError && cabinQuery.error.status === 404;

    return (
      <CabinLoadError
        title={
          notFound ? 'Cabaña no encontrada' : 'No pudimos cargar la cabaña'
        }
        message={
          notFound
            ? 'Puede que haya sido eliminada o que el enlace no sea correcto.'
            : apiErrorMessage(cabinQuery.error)
        }
        onRetry={notFound ? undefined : () => void cabinQuery.refetch()}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(saveCabin)} noValidate>
      <fieldset disabled={isSaving} className="min-w-0 space-y-6 pb-4">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
              <Link href="/admin/cabanas">
                <ArrowLeft />
                Volver a cabañas
              </Link>
            </Button>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
              Alojamiento
            </p>
            <h1 className="mt-2 truncate text-3xl font-bold tracking-normal">
              {pageTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {pageDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasPendingChanges ? (
              <Badge variant="outline">Cambios sin guardar</Badge>
            ) : null}
            {currentCabin?.code ? (
              <Badge variant="secondary">{currentCabin.code}</Badge>
            ) : null}
          </div>
        </header>

        {formError ? (
          <div
            className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">No se completo el guardado</p>
              <p className="mt-1 text-destructive/90">{formError}</p>
            </div>
          </div>
        ) : null}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informacion general</CardTitle>
                <CardDescription>
                  Identificacion y posicion de la cabaña dentro del complejo.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <FormField
                  id="cabin-name"
                  label="Nombre"
                  error={errors.name?.message}
                >
                  <Input
                    id="cabin-name"
                    autoFocus={props.mode === 'create'}
                    aria-invalid={Boolean(errors.name)}
                    {...register('name')}
                  />
                </FormField>
                <FormField
                  id="cabin-map-slot"
                  label="Ubicacion en mapa"
                  error={errors.map_slot?.message}
                >
                  <select
                    id="cabin-map-slot"
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-invalid={Boolean(errors.map_slot)}
                    {...register('map_slot')}
                  >
                    <option value="">Selecciona un punto</option>
                    {(pointsQuery.data?.data ?? []).map((point) => (
                      <option
                        key={point.key}
                        value={point.key}
                        disabled={Boolean(
                          point.cabin_id && point.cabin_id !== persistedCabinId,
                        )}
                      >
                        {point.label}
                        {point.cabin_id && point.cabin_id !== persistedCabinId
                          ? ' · Reservado'
                          : ''}
                      </option>
                    ))}
                  </select>
                  {props.mode === 'create' && pointsQuery.isSuccess && !pointsQuery.data.data.some((point) => !point.cabin_id) && (
                    <p className="text-sm text-muted-foreground">
                      No hay puntos libres. Vuelve a Cabañas y abre la pestaña Mapa para añadir una ubicación; desde ese punto podrás crear la cabaña.
                    </p>
                  )}
                  {pointsQuery.isError && (
                    <p role="alert" className="text-sm text-destructive">
                      No pudimos cargar las ubicaciones.{' '}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void pointsQuery.refetch()}
                      >
                        Reintentar
                      </button>
                    </p>
                  )}
                </FormField>
                <FormField
                  id="cabin-floor"
                  label="Piso"
                  error={errors.floor?.message}
                >
                  <Input
                    id="cabin-floor"
                    inputMode="numeric"
                    aria-invalid={Boolean(errors.floor)}
                    {...register('floor')}
                  />
                </FormField>
                <FormField
                  id="cabin-sort-order"
                  label="Orden"
                  error={errors.sort_order?.message}
                >
                  <Input
                    id="cabin-sort-order"
                    type="number"
                    min={0}
                    aria-invalid={Boolean(errors.sort_order)}
                    {...register('sort_order')}
                  />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Capacidad y distribucion</CardTitle>
                <CardDescription>
                  Valores usados en el catalogo y los calculos de
                  disponibilidad.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                  id="cabin-minimum"
                  label="Capacidad mínima"
                  error={errors.min_guests?.message}
                  icon={<Users />}
                >
                  <Input
                    id="cabin-minimum"
                    type="number"
                    min={1}
                    max={50}
                    aria-invalid={Boolean(errors.min_guests)}
                    {...register('min_guests')}
                  />
                </FormField>
                <FormField
                  id="cabin-comfort"
                  label="Capacidad comoda"
                  error={errors.guest_capacity?.message}
                  icon={<Users />}
                >
                  <Input
                    id="cabin-comfort"
                    type="number"
                    min={1}
                    max={50}
                    aria-invalid={Boolean(errors.guest_capacity)}
                    {...register('guest_capacity')}
                  />
                </FormField>
                <FormField
                  id="cabin-maximum"
                  label="Capacidad maxima"
                  error={errors.max_guests?.message}
                  icon={<Users />}
                >
                  <Input
                    id="cabin-maximum"
                    type="number"
                    min={1}
                    max={50}
                    aria-invalid={Boolean(errors.max_guests)}
                    {...register('max_guests')}
                  />
                </FormField>
                <FormField
                  id="cabin-beds"
                  label="Camas"
                  error={errors.beds_count?.message}
                  icon={<BedDouble />}
                >
                  <Input
                    id="cabin-beds"
                    type="number"
                    min={0}
                    max={50}
                    aria-invalid={Boolean(errors.beds_count)}
                    {...register('beds_count')}
                  />
                </FormField>
                <FormField
                  id="cabin-bathrooms"
                  label="Baños"
                  error={errors.bathrooms_count?.message}
                  icon={<Bath />}
                >
                  <Input
                    id="cabin-bathrooms"
                    type="number"
                    min={0}
                    max={50}
                    aria-invalid={Boolean(errors.bathrooms_count)}
                    {...register('bathrooms_count')}
                  />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contenido</CardTitle>
                <CardDescription>
                  Textos publicos y notas exclusivas para el equipo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  id="cabin-summary"
                  label="Resumen"
                  error={errors.short_description?.message}
                  description="Maximo 500 caracteres."
                >
                  <Textarea
                    id="cabin-summary"
                    rows={3}
                    aria-invalid={Boolean(errors.short_description)}
                    {...register('short_description')}
                  />
                </FormField>
                <FormField
                  id="cabin-description"
                  label="Descripcion"
                  error={errors.description?.message}
                >
                  <Textarea
                    id="cabin-description"
                    rows={7}
                    aria-invalid={Boolean(errors.description)}
                    {...register('description')}
                  />
                </FormField>
                <FormField
                  id="cabin-notes"
                  label="Notas internas"
                  error={errors.notes?.message}
                  description="Estas notas no se muestran en el sitio publico."
                >
                  <Textarea
                    id="cabin-notes"
                    rows={4}
                    aria-invalid={Boolean(errors.notes)}
                    {...register('notes')}
                  />
                </FormField>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6">
            <Card>
              <CardHeader>
                <CardTitle>Publicacion</CardTitle>
                <CardDescription>
                  Controla el estado operativo y la visibilidad.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  id="cabin-status"
                  label="Estado"
                  error={errors.status?.message}
                >
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="cabin-status"
                          className="w-full"
                          aria-invalid={Boolean(errors.status)}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/20 p-4">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-primary"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                      <span>
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Eye className="size-4" /> Visible en la pagina
                          publica
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          Al ocultarla seguira disponible para gestion interna.
                        </span>
                      </span>
                    </label>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portada</CardTitle>
                <CardDescription>
                  Imagen principal del catalogo y el detalle publico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentCoverUrl ? (
                  <div
                    role="img"
                    aria-label={
                      coverFile
                        ? 'Vista previa de la nueva portada'
                        : `Portada de ${currentCabin?.name ?? 'la cabaña'}`
                    }
                    className="aspect-[4/3] w-full rounded-lg border bg-cover bg-center"
                    style={{ backgroundImage: `url(${currentCoverUrl})` }}
                  />
                ) : (
                  <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 text-center text-sm text-muted-foreground">
                    <ImagePlus className="mb-3 size-8 text-cyan-700" />
                    Sin portada seleccionada
                  </div>
                )}
                <Input
                  aria-label="Archivo de portada"
                  key={coverInputKey}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectCover}
                  aria-invalid={Boolean(coverError)}
                />
                {currentCabin?.cover_image && !coverFile && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      if (
                        removeCover ||
                        (await confirm('¿Retirar la portada al guardar?'))
                      )
                        setRemoveCover(!removeCover);
                    }}
                  >
                    {removeCover
                      ? 'Conservar portada actual'
                      : 'Retirar portada'}
                  </Button>
                )}
                <p className="text-xs leading-5 text-muted-foreground">
                  JPG, PNG o WebP. Maximo 10 MB.
                </p>
                {coverError ? (
                  <p className="text-sm text-destructive">{coverError}</p>
                ) : null}
                {coverFile ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={clearCoverSelection}
                  >
                    <RotateCcw />
                    Conservar portada actual
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>

        <Card id="galeria" className="scroll-mt-6">
          <CardHeader className="gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <CardTitle>Galeria</CardTitle>
              <CardDescription className="mt-2">
                Administra imagenes, videos, textos alternativos y orden de
                aparicion.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
            >
              <Upload />
              Agregar archivos
            </Button>
            <input
              aria-label="Archivos de galería"
              ref={galleryInputRef}
              type="file"
              multiple
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={selectGalleryFiles}
            />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>Imagenes hasta 10 MB</span>
              <span>Videos hasta 150 MB</span>
              <span>Maximo 20 archivos nuevos por guardado</span>
            </div>
            {galleryError ? (
              <p className="text-sm text-destructive" role="alert">
                {galleryError}
              </p>
            ) : null}

            {visibleMedia.length + pendingMedia.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {visibleMedia.map((media) => (
                  <MediaEditorCard
                    key={`existing-${media.id}`}
                    badge="Guardado"
                    media={media}
                    onAltChange={(alt) =>
                      setExistingMedia((current) =>
                        current.map((item) =>
                          item.id === media.id ? { ...item, alt } : item,
                        ),
                      )
                    }
                    onOrderChange={(sortOrder) =>
                      setExistingMedia((current) =>
                        current.map((item) =>
                          item.id === media.id ? { ...item, sortOrder } : item,
                        ),
                      )
                    }
                    onRemove={() => markMediaForRemoval(media.id)}
                  />
                ))}
                {pendingMedia.map((media) => (
                  <MediaEditorCard
                    key={media.key}
                    badge="Nuevo"
                    media={{ ...media, url: media.previewUrl }}
                    onAltChange={(alt) =>
                      setPendingMedia((current) =>
                        current.map((item) =>
                          item.key === media.key ? { ...item, alt } : item,
                        ),
                      )
                    }
                    onOrderChange={(sortOrder) =>
                      setPendingMedia((current) =>
                        current.map((item) =>
                          item.key === media.key
                            ? { ...item, sortOrder }
                            : item,
                        ),
                      )
                    }
                    onRemove={() => removePendingMedia(media.key)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/10 px-6 py-12 text-center">
                <ImagePlus className="mx-auto size-9 text-cyan-700" />
                <h2 className="mt-4 font-semibold">La galeria esta vacia</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Agrega imagenes o videos para mostrar mejor la cabaña.
                </p>
              </div>
            )}

            {removedMedia.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  Pendientes de eliminar al guardar
                </p>
                {removedMedia.map((media) => (
                  <div
                    key={media.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {media.alt || `Archivo #${media.id}`}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExistingMedia((current) =>
                          current.map((item) =>
                            item.id === media.id
                              ? { ...item, removed: false }
                              : item,
                          ),
                        )
                      }
                    >
                      Deshacer
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="sm:sticky bottom-0 z-20 flex flex-col-reverse gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {isSaving
              ? 'Guardando ficha y recursos...'
              : hasPendingChanges
                ? 'Hay cambios pendientes.'
                : 'Todos los cambios estan guardados.'}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              asChild
            >
              <Link href="/admin/cabanas">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              className="flex-1 sm:flex-none"
              disabled={isSaving}
            >
              {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
              {isSaving ? 'Guardando...' : 'Guardar cabaña'}
            </Button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}

function FormField({
  id,
  label,
  error,
  description,
  icon,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        {icon ? (
          <span className="text-cyan-700 [&_svg]:size-4">{icon}</span>
        ) : null}
        {label}
      </Label>
      {children}
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MediaEditorCard({
  media,
  badge,
  onAltChange,
  onOrderChange,
  onRemove,
}: {
  media: {
    url: string;
    type: 'image' | 'video';
    alt: string;
    sortOrder: string;
  };
  badge: string;
  onAltChange: (value: string) => void;
  onOrderChange: (value: string) => void;
  onRemove: () => void;
}) {
  const fieldId = useId();

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border bg-background shadow-sm">
      <div className="relative">
        {media.type === 'video' ? (
          <video
            src={media.url}
            controls
            className="aspect-[4/3] w-full bg-neutral-950 object-cover"
          />
        ) : (
          <div
            role="img"
            aria-label={media.alt || 'Imagen de la galeria'}
            className="aspect-[4/3] w-full bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${media.url})` }}
          />
        )}
        <Badge className="absolute left-3 top-3 bg-background/90 text-foreground shadow-sm hover:bg-background/90">
          {badge}
        </Badge>
        {media.type === 'video' ? (
          <Video className="absolute right-3 top-3 size-5 text-white drop-shadow" />
        ) : null}
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_88px]">
        <FormField id={`${fieldId}-alt`} label="Texto alternativo">
          <Input
            id={`${fieldId}-alt`}
            maxLength={255}
            value={media.alt}
            onChange={(event) => onAltChange(event.target.value)}
            placeholder="Describe el contenido"
          />
        </FormField>
        <FormField id={`${fieldId}-order`} label="Orden">
          <Input
            id={`${fieldId}-order`}
            type="number"
            min={0}
            value={media.sortOrder}
            onChange={(event) => onOrderChange(event.target.value)}
          />
        </FormField>
        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {badge === 'Nuevo'
              ? 'Se subira al guardar'
              : 'Los cambios se aplicaran al guardar'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            {badge === 'Nuevo' ? <X /> : <Trash2 />}
            {badge === 'Nuevo' ? 'Quitar' : 'Eliminar'}
          </Button>
        </div>
      </div>
    </article>
  );
}

function CabinLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-xl border bg-card">
      <LoaderCircle className="mr-2 size-5 animate-spin text-cyan-700" />
      <span className="text-sm text-muted-foreground">Cargando cabaña...</span>
    </div>
  );
}

function CabinLoadError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-xl text-center">
        <CardContent className="space-y-4 pt-2">
          <AlertCircle className="mx-auto size-9 text-destructive" />
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {message}
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/cabanas">
                <ArrowLeft /> Volver
              </Link>
            </Button>
            {onRetry ? (
              <Button type="button" onClick={onRetry}>
                <RotateCcw /> Reintentar
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
