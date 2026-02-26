```skill
---
name: nextjs-frontend-cabanas
description: Frontend Next.js 14+ para Cabañas Playa Terco. Sitio público turístico (SSR/SEO) + panel administrativo. App Router, Server Components, Tailwind CSS, shadcn/ui.
metadata:
  domain: frontend
  triggers: Next.js, React, page, component, layout, admin, TipTap, gallery, calendar, form
  role: specialist
  scope: implementation
  output-format: code
---

# Next.js Frontend — Cabañas Playa Terco

Frontend del sitio web público y panel administrativo.

## Arquitectura

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout (fonts, providers, metadata)
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   ├── (public)/                  # Grupo: sitio público
│   │   │   ├── layout.tsx             # Navbar + Footer
│   │   │   ├── page.tsx               # Home
│   │   │   ├── cabanas/
│   │   │   │   ├── page.tsx           # Lista de tipos de cabaña
│   │   │   │   └── [slug]/page.tsx    # Detalle tipo
│   │   │   ├── experiencias/
│   │   │   │   └── page.tsx
│   │   │   ├── galeria/
│   │   │   │   └── page.tsx
│   │   │   ├── resenas/
│   │   │   │   └── page.tsx
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx           # Lista posts
│   │   │   │   └── [slug]/page.tsx    # Detalle post
│   │   │   ├── como-llegar/
│   │   │   │   └── page.tsx
│   │   │   ├── contacto/
│   │   │   │   └── page.tsx
│   │   │   ├── disponibilidad/
│   │   │   │   └── page.tsx
│   │   │   ├── politica-privacidad/
│   │   │   │   └── page.tsx
│   │   │   ├── terminos/
│   │   │   │   └── page.tsx
│   │   │   └── faq/
│   │   │       └── page.tsx
│   │   ├── (auth)/                    # Grupo: autenticación
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── registro/
│   │   │   │   └── page.tsx
│   │   │   └── perfil/
│   │   │       └── page.tsx
│   │   └── admin/                     # Panel administrativo
│   │       ├── layout.tsx             # Sidebar + header admin
│   │       ├── page.tsx               # Dashboard
│   │       ├── reservas/
│   │       │   ├── page.tsx
│   │       │   ├── nueva/page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── cabanas/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── huespedes/
│   │       │   ├── page.tsx
│   │       │   ├── nuevo/page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── ingresos/
│   │       │   └── page.tsx
│   │       ├── personal/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── resenas/
│   │       │   └── page.tsx           # Moderación
│   │       ├── blog/
│   │       │   ├── page.tsx
│   │       │   ├── nuevo/page.tsx
│   │       │   └── [id]/editar/page.tsx
│   │       ├── galeria/
│   │       │   └── page.tsx
│   │       ├── leads/
│   │       │   └── page.tsx
│   │       └── usuarios/
│   │           └── page.tsx
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── sheet.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── navbar.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   ├── admin-sidebar.tsx
│   │   │   └── admin-header.tsx
│   │   ├── home/
│   │   │   ├── hero-section.tsx
│   │   │   ├── featured-cabins.tsx
│   │   │   ├── latest-reviews.tsx
│   │   │   ├── cta-section.tsx
│   │   │   └── experiences-preview.tsx
│   │   ├── cabins/
│   │   │   ├── cabin-card.tsx
│   │   │   ├── cabin-gallery.tsx
│   │   │   ├── amenity-badge.tsx
│   │   │   └── cabin-detail.tsx
│   │   ├── gallery/
│   │   │   ├── masonry-grid.tsx
│   │   │   ├── lightbox.tsx
│   │   │   └── gallery-filter.tsx
│   │   ├── reviews/
│   │   │   ├── review-card.tsx
│   │   │   ├── review-form.tsx
│   │   │   ├── star-rating.tsx
│   │   │   └── review-list.tsx
│   │   ├── blog/
│   │   │   ├── post-card.tsx
│   │   │   ├── post-content.tsx
│   │   │   ├── tiptap-editor.tsx
│   │   │   ├── comment-section.tsx
│   │   │   └── category-pills.tsx
│   │   ├── availability/
│   │   │   ├── search-form.tsx
│   │   │   ├── availability-calendar.tsx
│   │   │   └── results-list.tsx
│   │   ├── contact/
│   │   │   ├── contact-form.tsx
│   │   │   ├── whatsapp-button.tsx
│   │   │   └── phone-button.tsx
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   ├── google-button.tsx
│   │   │   └── profile-form.tsx
│   │   └── admin/
│   │       ├── data-table.tsx
│   │       ├── stats-card.tsx
│   │       ├── chart-wrapper.tsx
│   │       ├── file-upload.tsx
│   │       └── export-button.tsx
│   ├── lib/
│   │   ├── api.ts                     # API client (fetch wrapper)
│   │   ├── auth.ts                    # Auth helpers (Sanctum)
│   │   ├── utils.ts                   # cn(), formatDate, etc.
│   │   ├── validations.ts            # Zod schemas
│   │   └── constants.ts              # URLs, config
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-api.ts
│   │   ├── use-debounce.ts
│   │   └── use-media-query.ts
│   ├── types/
│   │   ├── api.ts                     # Response types
│   │   ├── cabin.ts
│   │   ├── reservation.ts
│   │   ├── review.ts
│   │   ├── blog.ts
│   │   ├── guest.ts
│   │   ├── payment.ts
│   │   ├── staff.ts
│   │   └── user.ts
│   ├── styles/
│   │   └── globals.css               # Tailwind + custom
│   └── providers/
│       ├── auth-provider.tsx
│       ├── theme-provider.tsx
│       └── query-provider.tsx
├── public/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
└── package.json
```

## Convenciones

### Componentes
- Server Components por defecto (sin 'use client')
- Client Components solo para: formularios, estado interactivo, hooks de browser
- Props tipados con interfaces
- Composición sobre herencia
- Nombres descriptivos en español para rutas, inglés para código

### Estilos
- Tailwind CSS + CSS Modules solo si necesario
- shadcn/ui como base de componentes
- Utility function `cn()` para condicionales
- Design tokens vía tailwind.config.ts
- Paleta turística: verdes bosque, azules mar, arena, blancos

### Data Fetching
- Server Components: fetch directo al API Laravel
- Client Components: hooks con SWR o React Query (para admin)
- Revalidación ISR para contenido público
- No-cache para datos admin

### Formularios
- React Hook Form + Zod
- Validación client-side y server-side
- Feedback visual (loading, error, success)
- File uploads con preview

### Auth
- Laravel Sanctum (SPA mode con cookies)
- AuthProvider context
- Middleware Next.js para rutas protegidas
- Redirect a login si no autenticado

### SEO
- Metadata API de Next.js
- Open Graph images
- Structured data (JSON-LD)
- Sitemap generado
- robots.txt
```
