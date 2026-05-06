'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Home,
  Users,
  DollarSign,
  UserCog,
  Star,
  FileText,
  Image,
  Mail,
  Shield,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  CalendarDays,
  Home,
  Users,
  DollarSign,
  UserCog,
  Star,
  FileText,
  Image,
  Mail,
  Shield,
};

const ADMIN_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/admin/reservas', label: 'Reservas', icon: 'CalendarDays' },
  { href: '/admin/cabanas', label: 'Cabañas', icon: 'Home' },
  { href: '/admin/huespedes', label: 'Huéspedes', icon: 'Users' },
  { href: '/admin/ingresos', label: 'Ingresos', icon: 'DollarSign' },
  { href: '/admin/personal', label: 'Personal', icon: 'UserCog' },
  { href: '/admin/resenas', label: 'Reseñas', icon: 'Star' },
  { href: '/admin/blog', label: 'Blog', icon: 'FileText' },
  { href: '/admin/galeria', label: 'Galería', icon: 'Image' },
  { href: '/admin/leads', label: 'Leads', icon: 'Mail' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: 'Shield' },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Link href="/admin" className="text-base font-bold">
          🏖️ Admin
        </Link>
        <span className="ml-auto">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Volver al sitio</span>
            </Link>
          </Button>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {ADMIN_LINKS.map((link) => {
            const Icon = ICON_MAP[link.icon];
            const isActive =
              link.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(link.href);

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="mb-2 truncate text-sm font-medium">{user?.name}</div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
