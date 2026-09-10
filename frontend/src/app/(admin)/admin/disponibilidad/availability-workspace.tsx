'use client';

import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  ClipboardList,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { panelPermissions } from '@/lib/panel-access';
import { MAX_GROUP_GUESTS } from '@/lib/stay-context';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@/types/api';
import type {
  AvailabilityAgenda,
  AvailabilityAgendaBlock,
  AvailabilityAgendaReservation,
  AvailabilityBlock,
  PlannerCabin,
  PlannerResult,
} from '@/types/cabin';
import {
  AvailabilityAgendaDetail,
  AvailabilityAgendaSection,
  type AgendaSelection,
} from './availability-agenda';
import { BlockSheet } from './availability-block-form';
import { OperationPeriodSelector } from './availability-period-selector';
import {
  AvailabilityRecordForm,
  Field,
  apiErrorMessage,
  type RecordDraft,
} from './availability-record-form';
import {
  AvailabilityResults,
  CabinAvailabilityDetail,
} from './availability-results';
import {
  addDaysIso,
  buildQuery,
  formatDate,
  formatRange,
  initialWorkspace,
  operationParams,
  operationQueryPeriod,
  operationStayFilters,
  MAX_RANGE_DAYS,
  rangeLength,
  validRange,
  type AvailabilityFilters,
  type AvailabilityMode,
  type AvailabilityView,
  type OperationPeriod,
} from './availability-model';

const subscribeHash = (callback: () => void) => {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
  };
};
const hashSnapshot = () => window.location.hash;
const serverHash = () => '';
type Confirmation =
  | { type: 'cancel'; record: AvailabilityAgendaReservation }
  | { type: 'delete'; block: AvailabilityAgendaBlock };

export function AvailabilityWorkspace() {
  const { user } = useAuth();
  const { canOperate } = panelPermissions(user);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const hash = useSyncExternalStore(subscribeHash, hashSnapshot, serverHash);
  const { mode, operation, filters } = initialWorkspace(
    new URLSearchParams(searchParams.toString()),
    hash,
  );
  const operationRange = operation.from !== operation.to;
  const viewParam = searchParams.get('view');
  const view: AvailabilityView =
    viewParam === 'matrix' || viewParam === 'list' || viewParam === 'map'
      ? viewParam
      : 'auto';
  const rangeKey = `${filters.checkIn}/${filters.checkOut}/${filters.guests}`;
  const [selection, setSelection] = useState<{ range: string; ids: number[] }>({
    range: rangeKey,
    ids: [],
  });
  const selectedIds = selection.range === rangeKey ? selection.ids : [];
  const [recordDraft, setRecordDraft] = useState<RecordDraft | null>(null);
  const [agendaDetail, setAgendaDetail] = useState<AgendaSelection | null>(
    null,
  );
  const [cabinDetail, setCabinDetail] = useState<{
    cabin: PlannerCabin;
    date?: string;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirmationError, setConfirmationError] = useState('');
  const focusOrigin = useRef<HTMLElement | null>(null);
  const confirmationOrigin = useRef<HTMLElement | null>(null);
  const newRecordButton = useRef<HTMLButtonElement>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
  const [blockCheckIn, setBlockCheckIn] = useState(filters.checkIn);
  const [blockCheckOut, setBlockCheckOut] = useState(filters.checkOut);
  const [blockReason, setBlockReason] = useState('');
  const [blockNotes, setBlockNotes] = useState('');
  const [blockAll, setBlockAll] = useState(false);
  const [blockCabinNames, setBlockCabinNames] = useState<
    Record<number, string>
  >({});
  const [blockCabinIds, setBlockCabinIds] = useState<number[]>([]);
  const [blockError, setBlockError] = useState('');
  const [openingBlock, setOpeningBlock] = useState(false);

  function rememberFocus() {
    if (
      document.activeElement instanceof HTMLElement &&
      !document.activeElement.closest('[role="dialog"]')
    )
      focusOrigin.current = document.activeElement;
  }
  function restoreFocus() {
    requestAnimationFrame(() => {
      const element = focusOrigin.current;
      (element?.isConnected ? element : newRecordButton.current)?.focus();
    });
  }
  function updateUrl(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    // These are client-side filters. Next synchronizes its search-param hooks
    // with history changes without remounting the workspace or losing selection.
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  }
  function changeMode(next: AvailabilityMode) {
    updateUrl({
      ...operationParams(operation),
      mode: next,
      from: filters.checkIn,
      to: filters.checkOut,
      guests: filters.guests,
    });
  }
  function changeOperation(next: OperationPeriod) {
    updateUrl({
      ...operationParams(next),
      mode: 'operation',
      from: filters.checkIn,
      to: filters.checkOut,
      guests: filters.guests,
    });
  }
  function selectCabins(ids: number[]) {
    setSelection({ range: rangeKey, ids });
  }
  function refreshAvailability() {
    for (const key of [
      'admin-availability-planner',
      'admin-availability-agenda',
      'admin-availability-record',
      'admin-availability',
      'admin-availability-calendar',
      'admin-dashboard-operations',
    ])
      void queryClient.invalidateQueries({ queryKey: [key] });
  }
  const plannerQuery = useQuery({
    queryKey: [
      'admin-availability-planner',
      filters.checkIn,
      filters.checkOut,
      filters.guests,
    ],
    queryFn: () =>
      api.get<ApiResponse<PlannerResult>>(
        `/admin/availability/planner${buildQuery({ check_in: filters.checkIn, check_out: filters.checkOut, guests: filters.guests })}`,
      ),
    enabled: mode === 'availability' || blockOpen,
  });
  const {
    from: agendaFrom,
    to: agendaTo,
    day,
  } = operationQueryPeriod(operation);
  const agendaQuery = useQuery({
    queryKey: ['admin-availability-agenda', agendaFrom, agendaTo],
    queryFn: () =>
      api.get<ApiResponse<AvailabilityAgenda>>(
        `/admin/availability/agenda${buildQuery({ from: agendaFrom, to: agendaTo })}`,
      ),
    enabled: mode === 'operation',
  });
  const planner = plannerQuery.data?.data;
  const cabins = planner?.cabins ?? [];
  const selectedCabins = cabins.filter((cabin) =>
    selectedIds.includes(cabin.cabin_id),
  );
  const selectedCapacity = selectedCabins.reduce(
    (total, cabin) => total + cabin.max_guests,
    0,
  );
  const selectionConflict = selectedIds.some(
    (id) => !cabins.find((cabin) => cabin.cabin_id === id)?.available_for_range,
  );
  const busy =
    mode === 'operation' ? agendaQuery.isFetching : plannerQuery.isFetching;

  function newRecord() {
    rememberFocus();
    const initial =
      mode === 'operation'
        ? operationStayFilters(operation, filters.guests)
        : filters;
    setRecordDraft({
      filters: initial,
      cabinIds: mode === 'availability' ? selectedIds : [],
    });
  }
  function editRecord(record: AvailabilityAgendaReservation) {
    if (record.status !== 'pending' && record.status !== 'confirmed') return;
    setAgendaDetail(null);
    setRecordDraft({ record, filters, cabinIds: record.cabin_ids });
  }
  function showRecord(record: AvailabilityAgendaReservation) {
    setCabinDetail(null);
    setAgendaDetail({
      type: 'reservation',
      reservation: record,
      kind: record.status === 'pending' ? 'quote' : 'stay',
    });
  }
  async function fetchBlock(id: number) {
    const { data } = await api.get<ApiResponse<AvailabilityBlock>>(
      `/admin/availability-blocks/${id}`,
    );
    return {
      ...data,
      cabin_ids: data.cabin_ids ?? data.cabins?.map((cabin) => cabin.id) ?? [],
      cabin_names: data.applies_to_all
        ? ['Todas las cabañas']
        : (data.cabins?.map((cabin) => cabin.name) ??
          cabins
            .filter((cabin) => data.cabin_ids?.includes(cabin.cabin_id))
            .map((cabin) => cabin.name)),
    };
  }
  async function showBlock(id: number) {
    setOpeningBlock(true);
    try {
      const block = await fetchBlock(id);
      setCabinDetail(null);
      setAgendaDetail({ type: 'block', block });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setOpeningBlock(false);
    }
  }
  function inspectCabin(cabin: PlannerCabin, date?: string) {
    rememberFocus();
    const segment = date
      ? cabin.segments.find(
          (item) => date >= item.check_in && date < item.check_out,
        )
      : undefined;
    if (segment?.reservation && !segment.quotes.length)
      showRecord(segment.reservation);
    else if (segment?.block && !segment.quotes.length)
      void showBlock(segment.block.id);
    else setCabinDetail({ cabin, date });
  }
  const recordAction = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Record<string, unknown>;
    }) => api.put(`/admin/reservations/${id}`, payload),
    onSuccess: () => {
      toast.success('Registro actualizado.');
      setAgendaDetail(null);
      setConfirmation(null);
      refreshAvailability();
      restoreFocus();
    },
    onError: (error) => {
      const message = apiErrorMessage(error);
      if (confirmation) setConfirmationError(message);
      else toast.error(message);
      refreshAvailability();
    },
  });
  const deleteBlock = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/availability-blocks/${id}`),
    onSuccess: () => {
      toast.success('Bloqueo eliminado.');
      setConfirmation(null);
      setAgendaDetail(null);
      refreshAvailability();
      restoreFocus();
    },
    onError: (error) => setConfirmationError(apiErrorMessage(error)),
  });
  function requestCancel(record: AvailabilityAgendaReservation) {
    confirmationOrigin.current = document.activeElement as HTMLElement | null;
    setConfirmationError('');
    setConfirmation({ type: 'cancel', record });
  }
  function requestDelete(id: number) {
    if (agendaDetail?.type === 'block' && agendaDetail.block.id === id) {
      confirmationOrigin.current = document.activeElement as HTMLElement | null;
      setConfirmationError('');
      setConfirmation({ type: 'delete', block: agendaDetail.block });
    }
  }
  function newBlock() {
    rememberFocus();
    setEditingBlockId(null);
    setBlockReason('');
    setBlockNotes('');
    setBlockAll(false);
    setBlockError('');
    const initial =
      mode === 'operation'
        ? operationStayFilters(operation, filters.guests)
        : filters;
    setBlockCheckIn(initial.checkIn);
    setBlockCheckOut(initial.checkOut);
    setBlockCabinIds(mode === 'availability' ? selectedIds : []);
    setBlockOpen(true);
  }
  async function editBlock(id: number) {
    setOpeningBlock(true);
    try {
      const block = await fetchBlock(id);
      setAgendaDetail(null);
      setEditingBlockId(id);
      setBlockCheckIn(block.check_in);
      setBlockCheckOut(block.check_out);
      setBlockReason(block.reason);
      setBlockNotes(block.notes ?? '');
      setBlockAll(block.applies_to_all);
      setBlockCabinIds(block.cabin_ids);
      setBlockCabinNames(
        Object.fromEntries(
          block.cabin_ids.map((id, index) => [
            id,
            block.cabin_names[index] ?? `Cabaña ${id}`,
          ]),
        ),
      );
      setBlockError('');
      setBlockOpen(true);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setOpeningBlock(false);
    }
  }
  const saveBlock = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingBlockId
        ? api.put(`/admin/availability-blocks/${editingBlockId}`, payload)
        : api.post('/admin/availability-blocks', payload),
    onSuccess: () => {
      toast.success(
        editingBlockId ? 'Bloqueo actualizado.' : 'Bloqueo creado.',
      );
      setBlockOpen(false);
      selectCabins([]);
      refreshAvailability();
      restoreFocus();
    },
    onError: (error) => {
      setBlockError(apiErrorMessage(error));
      refreshAvailability();
    },
  });
  function submitBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validRange(blockCheckIn, blockCheckOut)) {
      setBlockError('Elige un rango de 1 a 31 noches.');
      return;
    }
    if (!blockReason.trim() || (!blockAll && !blockCabinIds.length)) {
      setBlockError('Indica un motivo y selecciona cabañas o aplica a todas.');
      return;
    }
    setBlockError('');
    saveBlock.mutate({
      check_in: blockCheckIn,
      check_out: blockCheckOut,
      reason: blockReason.trim(),
      notes: blockNotes.trim() || null,
      applies_to_all: blockAll,
      cabin_ids: blockAll ? [] : blockCabinIds,
    });
  }

  return (
    <div className="min-w-0 space-y-4 pb-28">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
            Recepción y reservas
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Disponibilidad
          </h1>
        </div>
        {canOperate && (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-11 min-w-0 whitespace-normal px-2"
              onClick={newBlock}
            >
              <LockKeyhole className="size-4" />
              <span>Bloquear fechas</span>
            </Button>
            <Button
              ref={newRecordButton}
              type="button"
              className="h-auto min-h-11 min-w-0 whitespace-normal px-2"
              onClick={newRecord}
            >
              <Plus className="size-4" />
              Nuevo registro
            </Button>
          </div>
        )}
      </header>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div
          className="grid min-w-0 flex-1 grid-cols-2 gap-1 sm:flex sm:flex-initial"
          role="group"
          aria-label="Modo de trabajo"
        >
          <Button
            type="button"
            variant="ghost"
            className={cn(
              'h-auto min-h-11 whitespace-normal px-2 text-sm sm:px-4',
              mode === 'operation' && 'bg-cyan-50 text-cyan-900',
            )}
            aria-pressed={mode === 'operation'}
            onClick={() => changeMode('operation')}
          >
            <ClipboardList className="hidden size-4 min-[380px]:block" />
            Operación
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              'h-auto min-h-11 whitespace-normal px-2 text-sm sm:px-4',
              mode === 'availability' && 'bg-cyan-50 text-cyan-900',
            )}
            aria-pressed={mode === 'availability'}
            onClick={() => changeMode('availability')}
          >
            <Search className="hidden size-4 min-[380px]:block" />
            Buscar disponibilidad
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 px-2 text-xs"
          onClick={refreshAvailability}
          disabled={busy}
          aria-label="Actualizar disponibilidad"
        >
          <RefreshCw className={cn('size-4', busy && 'animate-spin')} />
          <span className="hidden sm:inline">
            {busy ? 'Actualizando' : 'Actualizar'}
          </span>
        </Button>
      </div>
      {mode === 'operation' ? (
        <div className="space-y-3">
          <OperationPeriodSelector
            period={operation}
            onChange={changeOperation}
          />
          <AvailabilityAgendaSection
            key={`${agendaFrom}/${agendaTo}/${operationRange}`}
            agenda={agendaQuery.data?.data}
            day={day}
            isLoading={agendaQuery.isPending}
            isFetching={agendaQuery.isFetching}
            errorMessage={
              agendaQuery.isError ? apiErrorMessage(agendaQuery.error) : null
            }
            onRetry={() => void agendaQuery.refetch()}
            onSelect={(detail) => {
              rememberFocus();
              setAgendaDetail(detail);
            }}
          />
        </div>
      ) : (
        <>
          <SearchFilters
            key={rangeKey}
            filters={filters}
            pending={plannerQuery.isFetching}
            onSubmit={(next) =>
              updateUrl({
                ...operationParams(operation),
                mode: 'availability',
                from: next.checkIn,
                to: next.checkOut,
                guests: next.guests,
              })
            }
          />
          {plannerQuery.isPending ? (
            <p
              className="flex min-h-32 items-center justify-center gap-2 text-sm"
              role="status"
            >
              <LoaderCircle className="size-5 animate-spin" />
              Consultando disponibilidad…
            </p>
          ) : plannerQuery.isError ? (
            <div
              className="rounded-xl border border-red-200 p-5 text-sm"
              role="alert"
            >
              <p>{apiErrorMessage(plannerQuery.error)}</p>
              <Button
                type="button"
                className="mt-3 min-h-11"
                variant="outline"
                onClick={() => void plannerQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : (
            planner && (
              <AvailabilityResults
                canSelect={canOperate}
                planner={planner}
                filters={filters}
                view={view}
                onView={(next) =>
                  updateUrl({ mode: 'availability', view: next })
                }
                selected={selectedIds}
                onSelect={selectCabins}
                onInspect={inspectCabin}
              />
            )
          )}
          <Button
            type="button"
            className="min-h-11"
            variant="ghost"
            onClick={() =>
              changeOperation({
                from: filters.checkIn,
                to: filters.checkOut,
                preset: 'range',
              })
            }
          >
            <CalendarDays className="size-4" />
            Ver movimientos de este rango
          </Button>
        </>
      )}
      {openingBlock && (
        <p className="text-sm text-muted-foreground" role="status">
          Cargando detalle del bloqueo…
        </p>
      )}
      {canOperate && mode === 'availability' && selectedIds.length > 0 && (
        <div className="fixed inset-x-3 bottom-3 z-30 ml-auto max-w-xl rounded-xl border bg-neutral-950 p-3 text-white shadow-xl md:left-auto md:right-6">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold"
                title={selectedCabins.map((cabin) => cabin.name).join(', ')}
              >
                {selectedCabins.map((cabin) => cabin.name).join(', ')}
              </p>
              <p className="mt-0.5 text-xs text-white/80">
                {formatDate(filters.checkIn, true)} →{' '}
                {formatDate(filters.checkOut, true)} ·{' '}
                {rangeLength(filters.checkIn, filters.checkOut)} noches
              </p>
              <p className="text-xs text-white/80">
                {filters.guests} personas · Capacidad {selectedCapacity}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="size-11 shrink-0 hover:bg-white/20 hover:text-white"
              aria-label="Limpiar selección"
              onClick={() => selectCabins([])}
            >
              <X className="size-4" />
            </Button>
            <Button
              type="button"
              className="min-h-11 shrink-0"
              variant="secondary"
              onClick={newRecord}
            >
              Registrar
            </Button>
          </div>
          {selectionConflict && (
            <p className="mt-1 text-xs text-amber-200">
              La disponibilidad cambió. Revisa las cabañas al registrar.
            </p>
          )}
          {selectedCapacity < Number(filters.guests) && (
            <p className="mt-1 text-xs text-amber-200">
              Faltan plazas para el grupo; agrega otra cabaña.
            </p>
          )}
        </div>
      )}
      {canOperate && recordDraft && (
        <AvailabilityRecordForm
          draft={recordDraft}
          onClose={() => {
            setRecordDraft(null);
            restoreFocus();
          }}
          onSaved={() => {
            selectCabins([]);
            refreshAvailability();
          }}
        />
      )}
      {canOperate && blockOpen && (
        <BlockSheet
          open
          onOpenChange={(open) => {
            if (!saveBlock.isPending) {
              setBlockOpen(open);
              if (!open) restoreFocus();
            }
          }}
          editing={Boolean(editingBlockId)}
          checkIn={blockCheckIn}
          checkOut={blockCheckOut}
          reason={blockReason}
          notes={blockNotes}
          appliesToAll={blockAll}
          cabinIds={blockCabinIds}
          cabinNames={blockCabinNames}
          cabins={cabins}
          onCheckInChange={setBlockCheckIn}
          onCheckOutChange={setBlockCheckOut}
          onReasonChange={setBlockReason}
          onNotesChange={setBlockNotes}
          onAppliesToAllChange={setBlockAll}
          onCabinIdsChange={setBlockCabinIds}
          error={
            blockError ||
            (plannerQuery.isError
              ? 'No se pudieron cargar las cabañas. Cierra y vuelve a intentar.'
              : '')
          }
          isPending={saveBlock.isPending || plannerQuery.isFetching}
          onSubmit={submitBlock}
        />
      )}
      {cabinDetail && (
        <CabinAvailabilityDetail
          canSelect={canOperate}
          {...cabinDetail}
          filters={filters}
          selected={selectedIds.includes(cabinDetail.cabin.cabin_id)}
          onClose={() => {
            setCabinDetail(null);
            restoreFocus();
          }}
          onToggle={() => {
            const id = cabinDetail.cabin.cabin_id;
            selectCabins(
              selectedIds.includes(id)
                ? selectedIds.filter((value) => value !== id)
                : [...selectedIds, id],
            );
            setCabinDetail(null);
            restoreFocus();
          }}
          onRecord={showRecord}
          onBlock={(id) => void showBlock(id)}
          onUseRange={(from, to) => {
            const id = cabinDetail.cabin.cabin_id;
            setCabinDetail(null);
            setSelection({
              range: `${from}/${to}/${filters.guests}`,
              ids: canOperate ? [id] : [],
            });
            updateUrl({
              ...operationParams(operation),
              mode: 'availability',
              from,
              to,
            });
            restoreFocus();
          }}
        />
      )}
      <AvailabilityAgendaDetail
        canOperate={canOperate}
        selection={agendaDetail}
        onClose={() => {
          setAgendaDetail(null);
          restoreFocus();
        }}
        onEditReservation={editRecord}
        onConfirm={(record) =>
          recordAction.mutate({
            id: record.id,
            payload: { status: 'confirmed' },
          })
        }
        onRenew={(record) =>
          recordAction.mutate({
            id: record.id,
            payload: {
              expires_at: new Date(Date.now() + 48 * 3_600_000).toISOString(),
            },
          })
        }
        onCancel={requestCancel}
        onEditBlock={(id) => void editBlock(id)}
        onDeleteBlock={requestDelete}
        isPending={
          recordAction.isPending || deleteBlock.isPending || openingBlock
        }
      />
      <Dialog
        open={canOperate && Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !recordAction.isPending && !deleteBlock.isPending)
            setConfirmation(null);
        }}
      >
        <DialogContent
          className="[&>button]:size-11 [&>button]:top-1 [&>button]:right-1"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              const origin = confirmationOrigin.current;
              if (origin?.isConnected) origin.focus();
              else restoreFocus();
            });
          }}
        >
          <DialogHeader className="pr-5">
            <DialogTitle>
              {confirmation?.type === 'cancel'
                ? '¿Cancelar esta reserva?'
                : '¿Eliminar este bloqueo?'}
            </DialogTitle>
            <DialogDescription>
              {confirmation?.type === 'cancel'
                ? `${confirmation.record.leader_name ?? 'Sin titular'} · ${formatRange(confirmation.record.check_in, confirmation.record.check_out)}. ${confirmation.record.cabin_names.join(', ')}. La reserva quedará cancelada y dejará de bloquear disponibilidad.`
                : confirmation
                  ? `${confirmation.block.reason} · ${formatRange(confirmation.block.check_in, confirmation.block.check_out)}. ${confirmation.block.cabin_names.join(', ')}. Se eliminará el bloqueo de estas fechas.`
                  : ''}
            </DialogDescription>
          </DialogHeader>
          {confirmationError && (
            <p role="alert" className="text-sm text-red-700">
              {confirmationError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={recordAction.isPending || deleteBlock.isPending}
              onClick={() => setConfirmation(null)}
            >
              Volver
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              disabled={recordAction.isPending || deleteBlock.isPending}
              onClick={() => {
                if (confirmation?.type === 'cancel')
                  recordAction.mutate({
                    id: confirmation.record.id,
                    payload: { status: 'cancelled' },
                  });
                else if (confirmation)
                  deleteBlock.mutate(confirmation.block.id);
              }}
            >
              {recordAction.isPending || deleteBlock.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {confirmation?.type === 'cancel'
                ? 'Sí, cancelar reserva'
                : 'Sí, eliminar bloqueo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SearchFilters({
  filters,
  pending,
  onSubmit,
}: {
  filters: AvailabilityFilters;
  pending: boolean;
  onSubmit: (filters: AvailabilityFilters) => void;
}) {
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validRange(draft.checkIn, draft.checkOut)) {
      setError('Elige una estancia de 1 a 31 noches.');
      return;
    }
    const guests = Number(draft.guests);
    if (
      !Number.isInteger(guests) ||
      guests < 1 ||
      guests > MAX_GROUP_GUESTS
    ) {
      setError(`Ingresa entre 1 y ${MAX_GROUP_GUESTS} personas.`);
      return;
    }
    setError('');
    onSubmit(draft);
  }
  return (
    <form onSubmit={submit} className="rounded-xl border bg-white p-3">
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_120px_auto] lg:items-end">
        <Field
          id="availability-check-in"
          label="Llegada"
          className="col-span-2 min-[360px]:col-span-1"
        >
          <Input
            id="availability-check-in"
            type="date"
            required
            value={draft.checkIn}
            onInput={(event) => {
              const next = event.currentTarget.value;
              setDraft({
                ...draft,
                checkIn: next,
                checkOut:
                  next && draft.checkOut <= next
                    ? addDaysIso(next, 1)
                    : draft.checkOut,
              });
            }}
          />
        </Field>
        <Field
          id="availability-check-out"
          label="Salida"
          className="col-span-2 min-[360px]:col-span-1"
        >
          <Input
            id="availability-check-out"
            type="date"
            required
            min={addDaysIso(draft.checkIn, 1)}
            max={addDaysIso(draft.checkIn, MAX_RANGE_DAYS)}
            value={draft.checkOut}
            onInput={(event) =>
              setDraft({ ...draft, checkOut: event.currentTarget.value })
            }
          />
        </Field>
        <Field id="availability-guests" label="Personas">
          <Input
            id="availability-guests"
            type="number"
            required
            inputMode="numeric"
            min={1}
            max={MAX_GROUP_GUESTS}
            step={1}
            value={draft.guests}
            onChange={(event) =>
              setDraft({ ...draft, guests: event.target.value })
            }
          />
        </Field>
        <Button type="submit" className="min-h-11 self-end" disabled={pending}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Consultar
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {(draft.checkIn !== filters.checkIn ||
        draft.checkOut !== filters.checkOut ||
        draft.guests !== filters.guests) && (
        <p role="status" className="mt-2 text-xs text-amber-800">
          Pulsa Consultar para aplicar las nuevas fechas o personas.
        </p>
      )}
    </form>
  );
}
