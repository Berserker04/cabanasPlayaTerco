import type { User } from '@/types/user';
import { canAccessPanelPath, panelPermissions } from './panel-access';

export function firstStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function sanitizeLocalPath(path: string | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return '/';
  }

  if (path.includes('\\') || path.includes('\n') || path.includes('\r')) {
    return '/';
  }

  return path;
}

function isAdminPath(path: string): boolean {
  const pathname = path.split(/[?#]/)[0];
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function resolvePostAuthPath(user: User, nextPath: string): string {
  const safeNext = sanitizeLocalPath(nextPath);

  if (panelPermissions(user).canEnter) {
    if (isAdminPath(safeNext) && !canAccessPanelPath(user, safeNext)) return '/admin';
    return safeNext === '/' ? '/admin' : safeNext;
  }

  return isAdminPath(safeNext) ? '/' : safeNext;
}
