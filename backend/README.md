# Cabanas Playa Terco Backend

Backend Laravel para el sitio y panel administrativo de Cabanas Playa Terco.

## Requisitos

- PHP 8.2 o superior.
- Composer.
- MySQL.
- Extensiones PHP habituales para Laravel: `ctype`, `curl`, `dom`, `fileinfo`, `filter`, `hash`, `mbstring`, `openssl`, `pdo`, `pdo_mysql`, `session`, `tokenizer`, `xml`.
- Redis no es necesario para este proyecto.

## Configuracion Recomendada En Hostinger

Usa base de datos para sesiones y cache, y ejecucion directa para colas:

```env
APP_ENV=production
APP_DEBUG=false
DB_CONNECTION=mysql
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=public
UPLOADS_DISK=public
```

Con `QUEUE_CONNECTION=sync` no necesitas worker permanente. Es lo mas simple para hosting compartido, y actualmente el proyecto no tiene jobs en cola.

## Despliegue

1. Sube el contenido de `backend` al hosting.
2. Apunta el document root del dominio o subdominio a la carpeta `public`.
3. Copia `.env.example` como `.env` y completa `APP_URL`, `FRONTEND_URL`, credenciales de MySQL y SMTP.
4. Instala dependencias:

```bash
composer install --no-dev --optimize-autoloader
```

5. Genera la llave si `APP_KEY` esta vacia:

```bash
php artisan key:generate
```

6. Ejecuta migraciones:

```bash
php artisan migrate --force
```

7. Publica el enlace de storage para uploads locales:

```bash
php artisan storage:link
```

8. Optimiza configuracion:

```bash
php artisan config:cache
php artisan route:cache
```

## Notas

- No configures `REDIS_HOST`, `SESSION_DRIVER=redis`, `CACHE_STORE=redis` ni `QUEUE_CONNECTION=redis` en Hostinger si no tienes Redis contratado.
- Si mas adelante quieres usar DigitalOcean Spaces o S3 para archivos, cambia `UPLOADS_DISK=s3` y completa las variables `AWS_*` / `DO_SPACES_*`.
- El frontend es Next.js. En un plan PHP/MySQL de Hostinger normalmente conviene publicarlo aparte en un hosting Node/Vercel, o convertirlo a exportacion estatica si el proyecto lo permite.
