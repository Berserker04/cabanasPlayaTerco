'use client';

import { useConfirm } from '@/providers/confirmation-provider';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CabinMap } from './cabin-map';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { getAllAdminCabins } from '@/lib/cabin-queries';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import type { ApiResponse } from '@/types/api';
import type { CabinMapPoint } from '@/types/cabin';

export function CabinMapEditor({
  canEdit,
  onDirtyChange,
}: {
  canEdit: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const pointsQuery = useQuery({
    queryKey: ['admin-cabin-map-points'],
    queryFn: () =>
      api.get<ApiResponse<CabinMapPoint[]>>('/admin/cabin-map-points'),
  });
  const inventoryQuery = useQuery({
    queryKey: ['admin-cabins', 'inventory'],
    queryFn: getAllAdminCabins,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<CabinMapPoint | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const points = pointsQuery.data?.data ?? [];
  const original = points.find((point) => point.key === selected);
  const dirty = Boolean(
    draft && JSON.stringify(draft) !== JSON.stringify(original),
  );
  useUnsavedChanges(dirty && !busy);
  useEffect(() => {
    onDirtyChange?.(dirty || busy);
    return () => onDirtyChange?.(false);
  }, [dirty, busy, onDirtyChange]);
  const selectedPoint = draft ?? original;
  const cabin = inventoryQuery.data?.find(
    (item) => item.map_slot === selectedPoint?.key,
  );
  async function select(key: string) {
    if (key === selected) return;
    if (
      dirty &&
      !(await confirm('Hay cambios en el punto sin guardar. ¿Descartarlos?'))
    )
      return;
    setSelected(key);
    setDraft(null);
    setAdding(false);
    setError('');
  }
  async function add(x = 50, y = 50) {
    if (dirty && !(await confirm('¿Descartar los cambios del punto actual?')))
      return;
    setSelected('new');
    setDraft({
      id: 0,
      key: 'new',
      label: '',
      x,
      y,
      sort_order: points.length + 1,
    });
    setAdding(false);
    setError('');
  }
  function change(field: keyof CabinMapPoint, value: string | number) {
    if (selectedPoint) setDraft({ ...selectedPoint, [field]: value });
  }
  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ['admin-cabin-map-points'],
    });
    await queryClient.invalidateQueries({ queryKey: ['admin-cabins'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-cabin'] });
  }
  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = {
        label: draft.label.trim(),
        x: draft.x,
        y: draft.y,
        sort_order: draft.sort_order,
      };
      const response = draft.id
        ? await api.put<ApiResponse<CabinMapPoint>>(
            `/admin/cabin-map-points/${draft.id}`,
            payload,
          )
        : await api.post<ApiResponse<CabinMapPoint>>(
            '/admin/cabin-map-points',
            payload,
          );
      await refresh();
      setSelected(response.data.key);
      setDraft(null);
      toast.success('Punto guardado');
    } catch (error) {
      setError(
        error instanceof ApiError
          ? Object.values(error.errors ?? {})
              .flat()
              .join(' ') || error.message
          : 'No pudimos guardar el punto. Puedes reintentar.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !original ||
      busy ||
      !(await confirm(`¿Eliminar el punto «${original.label}»?`))
    )
      return;
    setBusy(true);
    try {
      await api.delete(`/admin/cabin-map-points/${original.id}`);
      await refresh();
      setSelected(null);
      setDraft(null);
      toast.success('Punto eliminado');
    } catch (error) {
      setError(
        error instanceof ApiError
          ? Object.values(error.errors ?? {})
              .flat()
              .join(' ') || error.message
          : 'No pudimos eliminar el punto.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (pointsQuery.isPending || inventoryQuery.isPending)
    return <p role="status">Cargando mapa e inventario…</p>;
  if (pointsQuery.isError || inventoryQuery.isError)
    return (
      <div role="alert">
        No pudimos cargar el mapa.{' '}
        <Button
          onClick={() => {
            void pointsQuery.refetch();
            void inventoryQuery.refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  const displayPoints = draft
    ? [...points.filter((point) => point.key !== draft.key), draft]
    : points;
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy}
            onClick={async () => {
              if (
                !dirty ||
                (await confirm('¿Descartar los cambios del punto actual?'))
              ) {
                setDraft(null);
                setSelected(null);
                setAdding(true);
              }
            }}
          >
            Añadir punto en el mapa
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => add()}>
            Añadir con coordenadas
          </Button>
          {adding && (
            <>
              <p className="self-center text-sm" role="status">
                Toca una ubicación en el mapa.
              </p>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
            </>
          )}
        </div>
      )}
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <CabinMap
          points={displayPoints}
          cabins={inventoryQuery.data}
          selectedSlot={selected}
          onSelectSlot={select}
          onPlacePoint={adding ? add : undefined}
          onMovePoint={
            canEdit && !busy
              ? (key, x, y) => {
                  if (key === selected) {
                    const point =
                      draft ?? points.find((item) => item.key === key);
                    if (point) setDraft({ ...point, x, y });
                  }
                }
              : undefined
          }
        />
        <aside className="min-w-0 space-y-4 rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold">
            {selectedPoint?.label || 'Mapa interno'}
          </h2>
          {selectedPoint ? (
            <>
              <p className="text-sm">
                {cabin
                  ? `${cabin.name} · ${cabin.deleted_at ? 'Eliminada; posición reservada' : cabin.is_active ? 'Publicada' : 'Oculta'}`
                  : 'Punto libre para una nueva cabaña.'}
              </p>
              {canEdit && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                  }}
                  className="space-y-3"
                >
                  <fieldset disabled={busy} className="space-y-3">
                    <label className="block text-sm">
                      Etiqueta
                      <Input
                        required
                        maxLength={100}
                        value={selectedPoint.label}
                        onChange={(event) =>
                          change('label', event.target.value)
                        }
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Arrastra el punto o ajusta sus coordenadas de 0 a 100 %.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {(['x', 'y'] as const).map((axis) => (
                        <label className="text-sm" key={axis}>
                          Coordenada {axis.toUpperCase()} (%)
                          <Input
                            type="number"
                            required
                            min={0}
                            max={100}
                            step="0.01"
                            value={
                              Number.isNaN(selectedPoint[axis])
                                ? ''
                                : selectedPoint[axis]
                            }
                            onChange={(event) =>
                              change(
                                axis,
                                event.target.value === ''
                                  ? NaN
                                  : Number(event.target.value),
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <label className="block text-sm">
                      Orden del punto
                      <Input
                        type="number"
                        required
                        min={0}
                        max={65535}
                        step={1}
                        value={
                          Number.isNaN(selectedPoint.sort_order)
                            ? ''
                            : selectedPoint.sort_order
                        }
                        onChange={(event) =>
                          change(
                            'sort_order',
                            event.target.value === ''
                              ? NaN
                              : Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    {error && (
                      <p role="alert" className="text-sm text-destructive">
                        {error}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={!dirty}>
                        Guardar punto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDraft(null);
                          setError('');
                          if (!original) setSelected(null);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </fieldset>
                </form>
              )}
              {canEdit &&
                original &&
                !dirty &&
                (cabin ? (
                  !cabin.deleted_at && (
                    <Button asChild variant="outline">
                      <Link href={`/admin/cabanas/${cabin.id}/editar`}>
                        Editar cabaña
                      </Link>
                    </Button>
                  )
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link
                        href={`/admin/cabanas/nueva?map_slot=${encodeURIComponent(original.key)}`}
                      >
                        Nueva cabaña en este punto
                      </Link>
                    </Button>
                    <Button
                      disabled={busy}
                      variant="destructive"
                      onClick={() => void remove()}
                    >
                      Eliminar punto
                    </Button>
                  </div>
                ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecciona una ubicación. El mapa incluye todo el inventario,
              también las cabañas ocultas y eliminadas.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
