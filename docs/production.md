# Producción

El frontend Next.js se publica en Vercel como `cabanas-playa-terco`, desde la
carpeta `frontend` y la rama `main`. Sus variables públicas son:

```env
NEXT_PUBLIC_SITE_URL=https://cabanasplayaterco.com
NEXT_PUBLIC_API_URL=https://api-v1.cabanasplayaterco.com/api/v1
```

El backend Laravel usa PHP 8.2 CLI y MySQL de Hostinger. El subdominio
`api-v1.cabanasplayaterco.com` tiene como raíz:

```text
/home/u257359746/domains/cabanasplayaterco.com/public_html/api-v1
```

Esta ruta enlaza a la carpeta `api-app/current/public` del dominio. El código, las credenciales,
las versiones y las copias de la base de datos quedan fuera de `public_html`:

```text
/home/u257359746/domains/cabanasplayaterco.com/api-app/
  current -> releases/<commit-fecha>
  releases/
  incoming/
  backups/
  shared/.env
  shared/storage/
  deploy.sh
```

## Despliegue automático

1. Abrir un pull request a `main`. GitHub Actions comprueba Laravel, pruebas y
   lint del frontend, y una compilación de Next.js.
2. Al hacer merge, Vercel publica el frontend mediante su integración con GitHub.
3. El workflow `Verify and deploy production` verifica de nuevo y publica el
   backend por SSH. También se puede ejecutar manualmente sobre `main`.

El environment `production` de GitHub requiere `HOSTINGER_SSH_KEY` y
`HOSTINGER_KNOWN_HOSTS`. No se versionan secretos. La comprobación del servidor
SSH es estricta; si Hostinger cambia su clave, verificarla antes de actualizar
`HOSTINGER_KNOWN_HOSTS`.

Cada despliegue instala una versión nueva, crea una copia comprimida de MySQL,
ejecuta `migrate --force`, optimiza Laravel y cambia el enlace `current`.
Las actualizaciones nunca ejecutan `migrate:fresh` ni los seeders. Se mantienen
las sesiones, archivos y la clave de cifrado. Si falla la comprobación HTTP,
se restaura el enlace de código anterior; las migraciones no se revierten
automáticamente. Usar migraciones compatibles con la versión previa.

Las versiones y copias se conservan para recuperación manual. Revisar su espacio
periódicamente y retirar únicamente copias cuya conservación ya no sea necesaria.

El script crea los enlaces de almacenamiento mediante SSH porque Hostinger
deshabilita `symlink` y `exec` en PHP. LiteSpeed tiene permisos de recorrido hasta
`public`; el archivo `.env` y las copias SQL permanecen privados.

## Inicialización y mantenimiento

`deploy/production.env.example` documenta la configuración del servidor. Usar
una clave nueva para `APP_KEY`, credenciales MySQL privadas y el cliente OAuth
web existente de Google. No usar SMTP de pruebas en producción.

Solo en la primera instalación vacía:

```bash
php artisan db:seed --class=ProductionCatalogSeeder --force
```

Este seeder crea roles, cabañas, servicios, tarifas, galería y ajustes; no crea
usuarios ni reservas. Rechaza ejecutarse sobre una instalación que ya contiene
datos. El administrador de ejemplo está bloqueado en producción.

Programar en hPanel un cron cada minuto:

```bash
/opt/alt/php82/usr/bin/php /home/u257359746/domains/cabanasplayaterco.com/api-app/current/artisan schedule:run >> /home/u257359746/domains/cabanasplayaterco.com/api-app/shared/storage/logs/scheduler.log 2>&1
```

Las colas usan `sync`, por lo que no requieren un worker permanente. Los archivos
subidos usan el disco `s3` de DigitalOcean Spaces, bucket `nuquitoursfiles`, región
`nyc3`, raíz `cabañasPlayaTerco/production`. Local utiliza
`cabañasPlayaTerco/develop`. La URL base del bucket no incluye la raíz: Laravel
la incorpora al generar las URLs. Las credenciales se guardan únicamente en
`shared/.env`; el workflow conserva ese archivo entre despliegues.

El correo usa el buzón `admin@cabanasplayaterco.com` de Hostinger como remitente
y usuario SMTP: `smtp.hostinger.com`, puerto `465`, `MAIL_SCHEME=smtps`.
`MAIL_PASSWORD` es la contraseña del buzón, distinta de la cuenta administradora
de la aplicación. `CONTACT_TO_ADDRESS` determina quién recibe las solicitudes.
Los registros MX, SPF y DKIM del dominio deben estar configurados para Hostinger.
La configuración local de Mailtrap no se usa en producción.

En Google Cloud, el cliente web debe permitir:

```text
https://api-v1.cabanasplayaterco.com/api/v1/auth/google/callback
```

El frontend y el backend usan cookies seguras para `.cabanasplayaterco.com`.
Las vistas previas `vercel.app` no están autorizadas para iniciar sesiones contra
producción. Validar autenticación en el dominio de producción.

## Verificación y recuperación

- `https://api-v1.cabanasplayaterco.com/up`: arranque de Laravel.
- `https://api-v1.cabanasplayaterco.com/api/v1/lodging-tariffs`: conectividad MySQL.
- `https://cabanasplayaterco.com/cabanas`: integración frontend y API.
- `.env`, `/vendor/` y `/deploy/` deben permanecer inaccesibles por HTTP.

Para recuperar código, seleccionar una versión compatible en `releases`, cambiar
`current` con un enlace temporal y `mv -Tf`, ejecutar `artisan up` y verificar la
API. Restaurar una copia SQL únicamente tras revisar el incidente y respaldar
el estado actual; una restauración puede descartar datos posteriores a la copia.
