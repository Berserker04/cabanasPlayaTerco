'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { NAV_LINKS, SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { panelPermissions } from '@/lib/panel-access';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const { canEnter } = panelPermissions(user);
  const isActiveLink = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="flex min-w-0 max-w-[calc(100%-3rem)] items-center gap-2 text-base font-bold tracking-tight sm:text-lg"
        >
          <Image
            src="/assets/terco_logo_nav.png"
            alt=""
            width={500}
            height={328}
            quality={100}
            priority
            unoptimized
            sizes="(min-width: 640px) 73px, 61px"
            className="h-10 w-[61px] shrink-0 object-contain sm:h-12 sm:w-[73px]"
          />
          <span className="truncate">{SITE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const isActive = isActiveLink(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-foreground/75 hover:bg-accent/70 hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.avatar ?? undefined} alt={user?.name ?? 'Usuario'} />
                    <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil">
                    <User className="mr-2 h-4 w-4" />
                    Mi perfil
                  </Link>
                </DropdownMenuItem>
                {canEnter && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Panel admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden gap-2 lg:flex">
              <Button variant="ghost" asChild>
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild>
                <Link href="/registro">Registrarse</Link>
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu principal</SheetTitle>
              <nav className="mt-8 flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const isActive = isActiveLink(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/75 hover:bg-accent/70 hover:text-foreground',
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                {!isAuthenticated && (
                  <>
                    <DropdownMenuSeparator className="my-2" />
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium"
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/registro"
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium"
                    >
                      Registrarse
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
