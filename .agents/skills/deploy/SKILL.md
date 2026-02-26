```skill
---
name: deploy-cabanas
description: Despliegue y DevOps para Cabañas Playa Terco. Docker Compose local, Vercel (frontend), DigitalOcean (backend+MySQL+Spaces), CI/CD con GitHub Actions.
metadata:
  domain: devops
  triggers: deploy, docker, vercel, digitalocean, CI/CD, spaces, nginx, SSL
  role: specialist
  scope: implementation
  output-format: config
---

# Deploy & DevOps — Cabañas Playa Terco

## Entornos

| Entorno | Frontend | Backend | BD |
|---------|----------|---------|-----|
| Local | localhost:3000 | localhost:8000 | MySQL Docker :3306 |
| Staging | staging.cabanasplayaterco.com | api-staging.cabanasplayaterco.com | DO Managed MySQL |
| Prod | cabanasplayaterco.com | api.cabanasplayaterco.com | DO Managed MySQL |

## Docker Compose (Local)

Servicios:
1. `backend` — PHP 8.2 + Laravel
2. `frontend` — Node 20 + Next.js  
3. `mysql` — MySQL 8.0
4. `redis` — Redis 7 (cache + queues)
5. `mailhog` — Email testing local

## Deploy Frontend → Vercel

1. GitHub repo conectado
2. Root: `frontend/`
3. Framework: Next.js
4. Env vars desde Vercel dashboard
5. Preview deploys en PRs

## Deploy Backend → DigitalOcean

### App Platform (recomendado)
- Source: `backend/` desde GitHub
- Build: `composer install --no-dev && php artisan optimize`
- Run: `php artisan serve` (o Nginx)
- Managed MySQL add-on
- Env vars en App Platform

### Droplet (alternativa)
- Ubuntu 22.04 + Nginx + PHP-FPM 8.2
- Certbot SSL
- Supervisor (queue workers)
- Cron (Laravel scheduler)

## Storage → DigitalOcean Spaces

Bucket: `cabanas-terco`
CDN habilitado
Carpetas: `/cabins`, `/reviews`, `/blog`, `/documents`, `/gallery`
CORS: solo dominio frontend

## CI/CD → GitHub Actions

- On push to main: test → deploy
- On PR: test + lint + build check
- Backend: PHPUnit/Pest
- Frontend: ESLint + build
```
