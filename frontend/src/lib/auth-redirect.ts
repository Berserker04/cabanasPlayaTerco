import type { User } from '@/types/user';

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
  return path === '/admin' || path.startsWith('/admin/') || path.startsWith('/admin?');
}

export function resolvePostAuthPath(user: User, nextPath: string): string {
  const safeNext = sanitizeLocalPath(nextPath);

  if (user.is_admin) {
    return safeNext === '/' ? '/admin' : safeNext;
  }

  return isAdminPath(safeNext) ? '/' : safeNext;
}
