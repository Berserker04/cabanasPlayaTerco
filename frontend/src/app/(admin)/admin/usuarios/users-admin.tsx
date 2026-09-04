'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash2,
  LoaderCircle,
  MailCheck,
  MailX,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundCog,
  Users,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useAuth } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  AdminUserListResponse,
  UpdateAdminUserPayload,
  User,
  UserRole,
  UserStatus,
} from '@/types/user';

const DEFAULT_COUNTS = {
  total: 0,
  active: 0,
  suspended: 0,
  active_admins: 0,
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : '';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function roleBadgeClass(role: string) {
  return {
    admin: 'border-violet-200 bg-violet-50 text-violet-800',
    staff: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    viewer: 'border-amber-200 bg-amber-50 text-amber-800',
    user: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  }[role] ?? 'border-neutral-200 bg-neutral-50 text-neutral-700';
}

export function UsersAdmin() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState<UserStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>('active');
  const [editError, setEditError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 350);

  const usersQuery = useQuery({
    queryKey: ['admin-users', debouncedSearch, role, status, page],
    queryFn: () =>
      api.get<AdminUserListResponse>(
        `/admin/users${buildQuery({
          search: debouncedSearch || undefined,
          role: role === 'all' ? undefined : role,
          status: status === 'all' ? undefined : status,
          page,
          per_page: 20,
        })}`,
      ),
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ target, payload }: { target: User; payload: UpdateAdminUserPayload }) => {
      await fetchCsrfCookie();

      return api.put<{ data: User; message: string }>(`/admin/users/${target.id}`, payload);
    },
    onSuccess: (response) => {
      setEditingUser(null);
      setEditError(null);
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Inténtalo de nuevo.';
      setEditError(message);
      toast.error('No pudimos actualizar el usuario', { description: message });
    },
  });

  const users = usersQuery.data?.data ?? [];
  const meta = usersQuery.data?.meta;
  const roles = meta?.available_roles ?? [];
  const counts = meta?.counts ?? DEFAULT_COUNTS;
  const isSelf = editingUser?.id === currentUser?.id;
  const editingIsActiveAdmin = Boolean(
    editingUser?.status === 'active' && editingUser.roles?.includes('admin'),
  );
  const isLastActiveAdmin = editingIsActiveAdmin && counts.active_admins <= 1;
  const statusLocked = isSelf || isLastActiveAdmin;
  const originalRoleIds = editingUser?.role_ids ?? [];
  const rolesChanged = [...originalRoleIds].sort().join(',') !== [...selectedRoleIds].sort().join(',');
  const statusChanged = editingUser?.status !== selectedStatus;
  const canSubmit = selectedRoleIds.length > 0 && (rolesChanged || statusChanged) && !updateMutation.isPending;

  function openEditor(user: User) {
    setEditingUser(user);
    setSelectedRoleIds(user.role_ids ?? []);
    setSelectedStatus(user.status);
    setEditError(null);
  }

  function closeEditor() {
    if (!updateMutation.isPending) {
      setEditingUser(null);
      setEditError(null);
    }
  }

  function toggleRole(roleId: number) {
    setEditError(null);
    setSelectedRoleIds((current) => {
      if (!current.includes(roleId)) {
        return [...current, roleId];
      }

      if (current.length === 1) {
        setEditError('Cada usuario debe conservar al menos un rol.');
        return current;
      }

      return current.filter((id) => id !== roleId);
    });
  }

  function clearFilters() {
    setSearch('');
    setRole('all');
    setStatus('all');
    setPage(1);
  }

  function submitUpdate() {
    if (!editingUser || !canSubmit) {
      return;
    }

    setEditError(null);
    updateMutation.mutate({
      target: editingUser,
      payload: {
        role_ids: selectedRoleIds,
        status: selectedStatus,
      },
    });
  }

  const hasFilters = search !== '' || role !== 'all' || status !== 'all';

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Administración</p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal text-neutral-950">Usuarios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Consulta las cuentas registradas, define sus permisos y controla su acceso al sistema.
        </p>
      </header>

      <section aria-label="Resumen de usuarios" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total" value={counts.total} icon={Users} />
        <MetricCard label="Activos" value={counts.active} icon={UserCheck} tone="success" />
        <MetricCard label="Suspendidos" value={counts.suspended} icon={CircleSlash2} tone="danger" />
        <MetricCard label="Administradores" value={counts.active_admins} icon={ShieldCheck} tone="accent" />
      </section>

      <section aria-label="Filtros de usuarios" className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nombre, correo o teléfono"
              className="pl-9"
              aria-label="Buscar usuarios"
            />
          </div>

          <Select
            value={role}
            onValueChange={(value) => {
              setRole(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full" aria-label="Filtrar por rol">
              <SelectValue placeholder="Todos los roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {roles.map((item) => (
                <SelectItem key={item.id} value={item.name}>
                  {item.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as UserStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full" aria-label="Filtrar por estado">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="suspended">Suspendidos</SelectItem>
            </SelectContent>
          </Select>

          <Button type="button" variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
            Limpiar
          </Button>
        </div>
      </section>

      {usersQuery.isLoading ? (
        <LoadingState />
      ) : usersQuery.isError ? (
        <ErrorState
          message={usersQuery.error instanceof ApiError ? usersQuery.error.message : 'No pudimos cargar los usuarios.'}
          onRetry={() => void usersQuery.refetch()}
        />
      ) : users.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-white shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50/80">
                  <TableHead className="pl-4">Usuario</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="pr-4 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="pl-4">
                      <UserIdentity user={user} currentUserId={currentUser?.id} />
                    </TableCell>
                    <TableCell>
                      <ContactDetails user={user} />
                    </TableCell>
                    <TableCell>
                      <RoleBadges user={user} roles={roles} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEditor(user)}>
                        <UserRoundCog className="size-4" />
                        Gestionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                roles={roles}
                currentUserId={currentUser?.id}
                onEdit={() => openEditor(user)}
              />
            ))}
          </div>

          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-h-[92vh] overflow-x-hidden overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Gestionar usuario</DialogTitle>
            <DialogDescription>
              Ajusta los permisos y el acceso de {editingUser?.name}. Los datos personales no se modifican aquí.
            </DialogDescription>
          </DialogHeader>

          {editingUser ? (
            <div className="grid gap-5">
              <div className="flex items-center gap-3 rounded-lg border bg-neutral-50 p-3">
                <Avatar size="lg">
                  {editingUser.avatar ? <AvatarImage src={editingUser.avatar} alt="" /> : null}
                  <AvatarFallback className="bg-cyan-100 font-semibold text-cyan-900">
                    {initials(editingUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-950">{editingUser.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{editingUser.email}</p>
                </div>
                {isSelf ? <Badge className="ml-auto bg-cyan-100 text-cyan-800">Tu cuenta</Badge> : null}
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-neutral-900">Roles asignados</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roles.map((item) => {
                    const checked = selectedRoleIds.includes(item.id);
                    const protectsAdminRole = item.name === 'admin' && checked && (isSelf || isLastActiveAdmin);

                    return (
                      <label
                        key={item.id}
                        className={cn(
                          'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors',
                          checked ? 'border-cyan-300 bg-cyan-50/70' : 'border-neutral-200 hover:bg-neutral-50',
                          protectsAdminRole && 'cursor-not-allowed opacity-70',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4 accent-cyan-700"
                          checked={checked}
                          disabled={protectsAdminRole}
                          onChange={() => toggleRole(item.id)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-neutral-900">{item.display_name}</span>
                          {item.description ? (
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="user-status">Estado de la cuenta</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => {
                    setSelectedStatus(value as UserStatus);
                    setEditError(null);
                  }}
                  disabled={statusLocked}
                >
                  <SelectTrigger id="user-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="suspended">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
                {statusLocked ? (
                  <p className="text-xs leading-5 text-amber-800">
                    {isSelf
                      ? 'No puedes suspender tu propia cuenta ni retirar tu acceso de administrador.'
                      : 'Este es el último administrador activo y debe conservar el acceso.'}
                  </p>
                ) : null}
              </div>

              {selectedStatus === 'suspended' && editingUser.status !== 'suspended' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  Al guardar, se cerrarán inmediatamente todas las sesiones y dispositivos de este usuario.
                </div>
              ) : null}

              {editError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                  {editError}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditor} disabled={updateMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              className={cn(
                'bg-cyan-700 text-white hover:bg-cyan-800',
                selectedStatus === 'suspended' && 'bg-amber-700 hover:bg-amber-800',
              )}
              disabled={!canSubmit}
              onClick={submitUpdate}
            >
              {updateMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {selectedStatus === 'suspended' && editingUser?.status !== 'suspended'
                ? 'Suspender y guardar'
                : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone?: 'default' | 'success' | 'danger' | 'accent';
}) {
  const tones = {
    default: 'bg-neutral-100 text-neutral-700',
    success: 'bg-emerald-100 text-emerald-700',
    danger: 'bg-red-100 text-red-700',
    accent: 'bg-violet-100 text-violet-700',
  };

  return (
    <article className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-neutral-950 sm:text-3xl">{value}</p>
        </div>
        <span className={cn('flex size-9 items-center justify-center rounded-lg', tones[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function UserIdentity({ user, currentUserId }: { user: User; currentUserId?: number }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar size="lg">
        {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
        <AvatarFallback className="bg-cyan-100 font-semibold text-cyan-900">{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="max-w-[220px] truncate font-medium text-neutral-950">{user.name}</p>
          {user.id === currentUserId ? <Badge variant="outline">Tú</Badge> : null}
        </div>
        <p className="max-w-[240px] truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

function ContactDetails({ user }: { user: User }) {
  return (
    <div className="min-w-[160px] space-y-1.5 text-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {user.email_verified_at ? (
          <MailCheck className="size-3.5 text-emerald-700" aria-hidden="true" />
        ) : (
          <MailX className="size-3.5 text-amber-700" aria-hidden="true" />
        )}
        <span>{user.email_verified_at ? 'Correo verificado' : 'Sin verificar'}</span>
      </div>
      <p className="text-muted-foreground">{user.phone || 'Sin teléfono'}</p>
    </div>
  );
}

function RoleBadges({ user, roles }: { user: User; roles: UserRole[] }) {
  const labels = new Map(roles.map((role) => [role.name, role.display_name]));

  return (
    <div className="flex max-w-[260px] flex-wrap gap-1.5">
      {(user.roles ?? []).map((role) => (
        <Badge key={role} variant="outline" className={roleBadgeClass(role)}>
          {labels.get(role) ?? role}
        </Badge>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  return status === 'active' ? (
    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
      <CheckCircle2 className="size-3" />
      Activo
    </Badge>
  ) : (
    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">
      <CircleSlash2 className="size-3" />
      Suspendido
    </Badge>
  );
}

function UserCard({
  user,
  roles,
  currentUserId,
  onEdit,
}: {
  user: User;
  roles: UserRole[];
  currentUserId?: number;
  onEdit: () => void;
}) {
  return (
    <article className="w-full min-w-0 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <UserIdentity user={user} currentUserId={currentUserId} />
        <StatusBadge status={user.status} />
      </div>
      <div className="mt-4 border-t pt-4">
        <RoleBadges user={user} roles={roles} />
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <ContactDetails user={user} />
            <p className="mt-2 text-xs text-muted-foreground">Registrado {formatDate(user.created_at)}</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            <UserRoundCog className="size-4" />
            Gestionar
          </Button>
        </div>
      </div>
    </article>
  );
}

function Pagination({
  meta,
  onPageChange,
}: {
  meta?: AdminUserListResponse['meta'];
  onPageChange: (page: number) => void;
}) {
  if (!meta || meta.last_page <= 1) {
    return null;
  }

  return (
    <nav aria-label="Paginación de usuarios" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Mostrando {meta.from ?? 0}–{meta.to ?? 0} de {meta.total} resultados
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.current_page <= 1}
          onClick={() => onPageChange(meta.current_page - 1)}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <span className="px-2 text-sm font-medium">
          {meta.current_page} de {meta.last_page}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.current_page >= meta.last_page}
          onClick={() => onPageChange(meta.current_page + 1)}
        >
          Siguiente
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-xl border bg-white text-sm text-muted-foreground shadow-sm">
      <LoaderCircle className="mr-2 size-5 animate-spin" />
      Cargando usuarios…
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <CircleSlash2 className="mx-auto size-8 text-red-700" />
      <h2 className="mt-3 font-semibold text-red-950">No pudimos cargar los usuarios</h2>
      <p className="mt-1 text-sm text-red-800">{message}</p>
      <Button type="button" variant="outline" className="mt-4 border-red-300 bg-white" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed bg-white p-10 text-center">
      <Users className="mx-auto size-9 text-cyan-700" />
      <h2 className="mt-4 text-lg font-semibold">{hasFilters ? 'No encontramos coincidencias' : 'Aún no hay usuarios'}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters ? 'Prueba con otros filtros o una búsqueda diferente.' : 'Los usuarios registrados aparecerán aquí.'}
      </p>
      {hasFilters ? (
        <Button type="button" variant="outline" className="mt-5" onClick={onClear}>
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}
