# Cabanas Playa Terco

Proyecto con dos partes:

- `backend`: API Laravel 12 para PHP + MySQL.
- `frontend`: aplicacion Next.js.

La configuración de producción en Hostinger, Vercel y GitHub Actions está en
[`docs/production.md`](docs/production.md).

## Despliegue En Hostinger

El backend puede trabajar en Hostinger sin Docker y sin Redis usando MySQL:

```env
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=public
UPLOADS_DISK=public
```

La guia completa del backend esta en [`backend/README.md`](backend/README.md).

## Nota Sobre El Frontend

El frontend es Next.js. En un plan Hostinger solo PHP/MySQL normalmente no se ejecuta como aplicacion Node. Las opciones practicas son:

- Publicar el frontend en Vercel, Hostinger Node/VPS u otro hosting Node.
- Adaptarlo a exportacion estatica si todas las rutas y datos lo permiten.

En ambos casos, `NEXT_PUBLIC_API_URL` debe apuntar a la URL publica del backend Laravel.
