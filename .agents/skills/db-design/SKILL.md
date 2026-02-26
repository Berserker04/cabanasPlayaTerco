```skill
---
name: db-design-cabanas
description: Diseño y mantenimiento del esquema MySQL 8 para Cabañas Playa Terco. Migraciones Laravel, índices, relaciones, seeders, factories.
metadata:
  domain: database
  triggers: migration, schema, database, table, index, relation, seeder, factory, MySQL
  role: specialist
  scope: implementation
  output-format: code
---

# Database Design — Cabañas Playa Terco

MySQL 8 schema design para el sistema de gestión turística.

## Tablas (26 total)

### Core
1. `users` — Usuarios del sistema (visitantes + admin)
2. `roles` — Roles (admin, staff, viewer, user)
3. `role_user` — Pivot users↔roles

### Cabañas
4. `cabin_types` — Tipos de cabaña (familiar, pareja, etc.)
5. `cabins` — Unidades individuales de cabaña
6. `amenities` — Amenidades disponibles
7. `cabin_type_amenity` — Pivot cabin_types↔amenities
8. `cabin_media` — Fotos/videos de cabañas

### Reservas y Huéspedes
9. `reservations` — Reservas internas
10. `guest_groups` — Grupos de huéspedes (titular)
11. `guest_members` — Integrantes del grupo
12. `documents` — Comprobantes y archivos (polimórfico)

### Finanzas
13. `payments_income` — Ingresos por grupo/reserva
14. `staff` — Personal de servicio
15. `staff_payments` — Pagos a personal

### Contenido UGC
16. `reviews` — Reseñas de huéspedes
17. `review_media` — Fotos de reseñas

### Blog
18. `posts` — Publicaciones del blog
19. `categories` — Categorías del blog
20. `category_post` — Pivot posts↔categories
21. `tags` — Etiquetas
22. `post_tag` — Pivot posts↔tags
23. `comments` — Comentarios (polimórfico)

### Marketing
24. `leads` — Contactos y cotizaciones
25. `gallery_items` — Galería general

### Sistema
26. `settings` — Configuración key-value

## Orden de Migraciones

```
01 - create_users_table (extend default)
02 - create_roles_table
03 - create_role_user_table
04 - create_cabin_types_table
05 - create_cabins_table
06 - create_amenities_table
07 - create_cabin_type_amenity_table
08 - create_cabin_media_table
09 - create_reservations_table
10 - create_guest_groups_table
11 - create_guest_members_table
12 - create_documents_table
13 - create_payments_income_table
14 - create_staff_table
15 - create_staff_payments_table
16 - create_reviews_table
17 - create_review_media_table
18 - create_posts_table
19 - create_categories_table
20 - create_category_post_table
21 - create_tags_table
22 - create_post_tag_table
23 - create_comments_table
24 - create_leads_table
25 - create_gallery_items_table
26 - create_settings_table
```

## Índices Críticos

```sql
-- Disponibilidad (consulta más frecuente)
INDEX idx_reservations_availability ON reservations(cabin_id, check_in, check_out, status);

-- Reseñas públicas
INDEX idx_reviews_public ON reviews(status, created_at DESC);

-- Blog público
INDEX idx_posts_public ON posts(status, published_at DESC);

-- Leads sin responder
INDEX idx_leads_status ON leads(status, created_at DESC);

-- Pagos por grupo
INDEX idx_payments_group ON payments_income(guest_group_id, status);

-- Pagos personal por mes
INDEX idx_staff_payments_date ON staff_payments(staff_id, payment_date);

-- Comentarios por post
INDEX idx_comments_target ON comments(commentable_type, commentable_id, status);
```

## Seeders

```
DatabaseSeeder
├── RoleSeeder           (admin, staff, viewer, user)
├── AdminUserSeeder      (usuario admin inicial)
├── AmenitySeeder        (wifi, cocina, baño privado, etc.)
├── CabinTypeSeeder      (tipos de prueba)
├── CabinSeeder          (unidades de prueba)
├── SettingSeeder        (configuración base)
└── (dev only)
    ├── ReviewFactory     (reseñas de prueba)
    ├── PostFactory       (posts de prueba)
    └── ReservationFactory
```

## Reglas
- NO usar DB enums (usar string + PHP Enum para flexibilidad)
- Foreign keys con `->constrained()->cascadeOnDelete()` o `->nullOnDelete()` según caso
- Timestamps siempre
- SoftDeletes en: users, posts, reservations
- UUIDs para documents.url (no exponer IDs secuenciales en storage)
```
