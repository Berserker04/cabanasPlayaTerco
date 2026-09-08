import type { User } from '@/types/user';

export function panelPermissions(user: User | null | undefined) {
  const canEnter = Boolean(
    user?.status === 'active' &&
      (user.can_access_panel ?? (user.is_admin || user.is_staff || user.roles?.includes('viewer'))),
  );

  return {
    canEnter,
    canOperate: canEnter && Boolean(user?.is_admin || user?.is_staff),
    canAdminister: canEnter && Boolean(user?.is_admin),
  };
}

export function canAccessPanelPath(user: User | null | undefined, path: string): boolean {
  const { canEnter, canAdminister } = panelPermissions(user);
  if (!canEnter) return false;
  const pathname = path.split(/[?#]/)[0].replace(/\/+$/, '');
  if (pathname !== '/admin' && !pathname.startsWith('/admin/')) return false;
  if (canAdminister) return true;

  return ['/admin', '/admin/disponibilidad', '/admin/cabanas'].includes(pathname);
}

export function panelRoleLabel(user: User | null | undefined): string {
  const { canAdminister, canOperate, canEnter } = panelPermissions(user);
  if (canAdminister) return 'Administrador';
  if (canOperate) return 'Personal';
  if (canEnter) return 'Visualizador · Solo lectura';
  return 'Usuario';
}
