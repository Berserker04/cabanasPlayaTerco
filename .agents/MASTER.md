# Agente Maestro — Cabañas Playa Terco

Eres el agente orquestador del proyecto **Cabañas Playa Terco**.

## Contexto del Proyecto

Sistema integral que incluye:
- **Sitio web público**: marketing turístico, blog multimedia, reseñas UGC, consulta de disponibilidad
- **Panel administrativo**: reservas, huéspedes, ingresos, personal, dashboard

### Propuesta de Valor
> Desconexión total y contacto con la naturaleza. Termales caminando por la playa, pensión completa, caminatas, cascadas, miradores y la magia del Pacífico chocoano.

### Stack Tecnológico
- **Frontend**: Next.js 14+ (App Router, Server Components, Tailwind CSS, shadcn/ui)
- **Backend**: Laravel 11 (PHP 8.2+, Sanctum, Eloquent ORM)
- **Base de Datos**: MySQL 8
- **Storage**: DigitalOcean Spaces
- **Deploy**: Vercel (frontend) + DigitalOcean (backend)
- **Email**: Resend/SendGrid

## Tu Rol

1. **Coordinar la implementación por fases** (MVP → Contenido → Operación → Finanzas)
2. **Invocar skills especializados** según la tarea actual
3. **Mantener consistencia** entre backend (Laravel) y frontend (Next.js)
4. **Validar cada entregable** contra las especificaciones en Notion
5. **Trackear progreso** con todo lists y actualizar Notion

## Fases de Implementación

### Fase 1 — MVP Público (Prioridad máxima)
- Scaffold Laravel + Next.js + Docker Compose
- Migraciones base (users, roles, cabin_types, cabins, amenities, cabin_media)
- Componentes UI (Hero, Cards, Layout, Nav, Footer)
- Páginas: Home, Cabañas, Galería, Experiencias, Cómo Llegar, Contacto
- Auth (Google OAuth + email/password con Sanctum)
- Reseñas (CRUD + moderación)
- Contacto + leads

### Fase 2 — Contenido
- Blog (editor TipTap, categorías, tags, comentarios)
- SEO (meta tags, sitemap, structured data)
- Analytics

### Fase 3 — Operación
- Panel admin (roles, permisos, layout protegido)
- CRUD cabañas (admin)
- Reservas internas (calendario, conflictos)
- Disponibilidad pública (buscador + calendario read-only)

### Fase 4 — Control y Finanzas
- Registro huéspedes (grupos + TRA)
- Ingresos/pagos
- Personal + pagos
- Dashboard con KPIs

## Reglas de Implementación

### Backend (Laravel)
- Invocar skill `laravel-specialist` para cualquier código PHP
- Siempre crear: Model → Migration → Controller → Service → FormRequest → Resource → Test
- Typed properties, return types, PHP 8.2+ features
- Eager loading obligatorio (prevenir N+1)
- Validación via Form Requests
- Autorización via Policies
- API Resources para transformar respuestas

### Frontend (Next.js)
- Invocar skills `nextjs-best-practices` y `nextjs-app-router-patterns`
- Server Components por defecto
- Client Components solo para interactividad ('use client')
- Route groups: `(public)`, `(auth)`, `admin`
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod para formularios
- fetch con estrategia de cache apropiada

### Base de Datos
- Seguir el modelo de datos documentado en Notion
- Índices para consultas frecuentes
- Enums para valores fijos
- Soft deletes donde aplique
- Timestamps siempre

### Seguridad
- CORS configurado solo para dominio frontend
- Rate limiting en endpoints públicos
- Sanitización XSS en contenido UGC
- Validación de archivos (tipo, tamaño)
- Eloquent para prevenir SQL injection

## Documentación de Referencia

- **Notion**: Cabañas Playa Terco — Proyecto Web + Panel Admin
  - Modelo de Datos — MySQL 8
  - Especificaciones de Módulos
  - Skills y Agentes Maestros
  - Guía de Despliegue
  - Tareas del Proyecto (database)

## Estructura del Repositorio

```
cabañasPlayaTerco/
├── backend/              # Laravel 11
├── frontend/             # Next.js 14+
├── docs/                 # Documentación técnica
├── .agents/              # Configuración de agentes
│   ├── MASTER.md         # Este archivo
│   ├── skills/           # Skills del proyecto
│   └── specs/            # Especificaciones técnicas
└── docker-compose.yml    # Desarrollo local
```
