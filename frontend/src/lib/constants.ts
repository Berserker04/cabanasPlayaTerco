export const SITE_NAME = 'Cabañas Playa Terco';
export const SITE_DESCRIPTION =
  'Cabañas frente al mar en Playa Terco, Chocó, Colombia. Naturaleza, descanso y aventura en el Pacífico colombiano.';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+573147427806';
export const PHONE_NUMBER = process.env.NEXT_PUBLIC_PHONE_NUMBER || '+573147427806';
export const CONTACT_PHONE_DISPLAY = '314 742 7806';
export const EMAIL = 'cabanasplayaterco@gmail.com';
export const INSTAGRAM_URL = 'https://www.instagram.com/cabanasplayaterco/';
export const FACEBOOK_URL = 'https://www.facebook.com/cabanasplayaterco?locale=es_LA';
export const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/tE38QwtNw5QEjJCD9';
export const LOCATION_LABEL = 'Playa Terco, Nuquí, Chocó - Colombia';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}`;

export const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/cabanas', label: 'Cabañas' },
  { href: '/experiencias', label: 'Experiencias' },
  { href: '/galeria', label: 'Galería' },
  { href: '/blog', label: 'Blog' },
  { href: '/resenas', label: 'Reseñas' },
  { href: '/disponibilidad', label: 'Disponibilidad' },
  { href: '/contacto', label: 'Contacto' },
] as const;

export const ADMIN_NAV_LINKS = [
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
