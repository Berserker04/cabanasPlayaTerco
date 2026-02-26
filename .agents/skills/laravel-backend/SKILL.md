```skill
---
name: laravel-backend-cabanas
description: Implementación del backend Laravel 11 para Cabañas Playa Terco. CRUD de cabañas, reservas, huéspedes, reseñas, blog, pagos, personal. Auth con Sanctum + Google OAuth.
metadata:
  domain: backend
  triggers: Laravel, Eloquent, API, Sanctum, migration, controller, model, service, policy, cabin, reservation, review, blog, payment, staff, guest
  role: specialist
  scope: implementation
  output-format: code
---

# Laravel Backend — Cabañas Playa Terco

Backend API REST para el sistema de gestión turística.

## Arquitectura

```
backend/
├── app/
│   ├── Enums/                    # PHP 8.2 Enums
│   │   ├── CabinStatus.php
│   │   ├── ReservationStatus.php
│   │   ├── ReviewStatus.php
│   │   ├── PostStatus.php
│   │   ├── PaymentMethod.php
│   │   ├── PaymentStatus.php
│   │   ├── DocumentType.php
│   │   ├── LeadStatus.php
│   │   ├── LeadSource.php
│   │   ├── GalleryCategory.php
│   │   └── StaffRole.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── Api/
│   │   │       ├── AuthController.php
│   │   │       ├── CabinController.php
│   │   │       ├── ReservationController.php
│   │   │       ├── ReviewController.php
│   │   │       ├── PostController.php
│   │   │       ├── CommentController.php
│   │   │       ├── GalleryController.php
│   │   │       ├── ContactController.php
│   │   │       ├── AvailabilityController.php
│   │   │       └── Admin/
│   │   │           ├── CabinAdminController.php
│   │   │           ├── ReservationAdminController.php
│   │   │           ├── ReviewAdminController.php
│   │   │           ├── PostAdminController.php
│   │   │           ├── GuestGroupController.php
│   │   │           ├── PaymentController.php
│   │   │           ├── StaffController.php
│   │   │           ├── LeadController.php
│   │   │           ├── DashboardController.php
│   │   │           └── UserController.php
│   │   ├── Middleware/
│   │   │   ├── EnsureIsAdmin.php
│   │   │   └── EnsureIsStaff.php
│   │   ├── Requests/              # Form Requests (validación)
│   │   └── Resources/             # API Resources (transformación)
│   ├── Models/
│   │   ├── User.php
│   │   ├── Role.php
│   │   ├── CabinType.php
│   │   ├── Cabin.php
│   │   ├── Amenity.php
│   │   ├── CabinMedia.php
│   │   ├── Reservation.php
│   │   ├── GuestGroup.php
│   │   ├── GuestMember.php
│   │   ├── Document.php
│   │   ├── PaymentIncome.php
│   │   ├── Staff.php
│   │   ├── StaffPayment.php
│   │   ├── Review.php
│   │   ├── ReviewMedia.php
│   │   ├── Post.php
│   │   ├── Category.php
│   │   ├── Tag.php
│   │   ├── Comment.php
│   │   ├── Lead.php
│   │   ├── GalleryItem.php
│   │   └── Setting.php
│   ├── Services/
│   │   ├── AvailabilityService.php
│   │   ├── ReservationService.php
│   │   ├── ReviewService.php
│   │   ├── BlogService.php
│   │   ├── FileUploadService.php
│   │   ├── DashboardService.php
│   │   └── EmailService.php
│   └── Policies/
│       ├── ReviewPolicy.php
│       ├── PostPolicy.php
│       ├── CommentPolicy.php
│       └── ReservationPolicy.php
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── routes/
│   └── api.php
├── config/
│   └── filesystems.php  (DigitalOcean Spaces)
└── tests/
    ├── Feature/
    └── Unit/
```

## Convenciones

### Modelos
- Typed properties (PHP 8.2+)
- $casts con Enums nativos
- Relationships definidas explícitamente
- Scopes para filtros frecuentes
- $fillable o $guarded

### Controllers
- Inyección de Services (no lógica en controller)
- Form Requests para validación
- API Resources para respuesta
- Respuestas consistentes: `{ data, message, meta }`

### Services
- Lógica de negocio aislada
- Typed parameters y returns
- Exceptions personalizadas
- Transacciones DB cuando necesario

### Migrations
- Nombres descriptivos
- Foreign keys explícitas
- Índices para performance
- Enums como strings (no DB enums)

### Tests
- Pest PHP
- Feature tests para endpoints
- Unit tests para services
- Factories para datos de prueba
- DatabaseTransactions trait

## Endpoints Principales

### Públicos (sin auth)
```
GET    /api/cabins                    # Tipos de cabaña activos
GET    /api/cabins/{slug}             # Detalle tipo cabaña
GET    /api/gallery                   # Galería por categoría
GET    /api/reviews                   # Reseñas aprobadas
GET    /api/reviews/latest            # Últimas 3
GET    /api/posts                     # Blog publicados
GET    /api/posts/{slug}              # Detalle post
GET    /api/availability              # Consulta disponibilidad
GET    /api/availability/calendar     # Calendario mensual
POST   /api/contact                   # Lead de contacto
```

### Autenticados (user)
```
POST   /api/reviews                   # Crear reseña
POST   /api/posts/{id}/comments       # Comentar
GET    /api/auth/user                 # Mi perfil
PUT    /api/auth/profile              # Actualizar perfil
```

### Admin
```
# Cabañas
GET/POST/PUT/DELETE /api/admin/cabin-types
GET/POST/PUT/DELETE /api/admin/cabins
GET/POST/DELETE     /api/admin/cabin-media

# Reservas
GET/POST/PUT/DELETE /api/admin/reservations
GET                 /api/admin/reservations/occupancy

# Reseñas
GET/PUT/DELETE      /api/admin/reviews

# Blog
GET/POST/PUT/DELETE /api/admin/posts
GET/POST/DELETE     /api/admin/categories
GET/POST/DELETE     /api/admin/tags

# Huéspedes
GET/POST/PUT        /api/admin/guest-groups
POST/PUT/DELETE     /api/admin/guest-members
GET                 /api/admin/guest-groups/export

# Pagos
GET/POST/PUT        /api/admin/payments
GET                 /api/admin/payments/summary

# Personal
GET/POST/PUT/DELETE /api/admin/staff
POST/GET            /api/admin/staff/{id}/payments

# Dashboard
GET                 /api/admin/dashboard/stats

# Leads
GET/PUT             /api/admin/leads

# Usuarios
GET/PUT             /api/admin/users
```
```
