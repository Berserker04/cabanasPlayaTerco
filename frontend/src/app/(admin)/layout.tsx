'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AdminMobileHeader, AdminSidebar } from '@/components/layout/admin-sidebar';
import { canAccessPanelPath, panelPermissions } from '@/lib/panel-access';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const { canEnter, canOperate } = panelPermissions(user);
  const canViewPage = canAccessPanelPath(user, pathname);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!canEnter) router.replace('/');
    else if (!canViewPage) router.replace('/admin');
  }, [isLoading, isAuthenticated, canEnter, canViewPage, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated || !canEnter || !canViewPage) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileHeader />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 sm:p-6">
            {!canOperate && (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Acceso de solo lectura. Puedes consultar la información, sin crear, editar ni eliminar registros.
              </p>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
