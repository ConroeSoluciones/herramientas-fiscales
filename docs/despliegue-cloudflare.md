# Despliegue en Cloudflare Workers

Runbook para desplegar este sitio en Cloudflare Workers con el preset Nitro `cloudflare_module`. La fuente de verdad de la configuracion es `wrangler.jsonc` en la raiz: durante `pnpm build`, Nitro la mezcla en `.output/server/wrangler.json` (solo genera `main` y `assets`), que es la config que usa Wrangler para desplegar.

## Requisitos

- Node >= 22 y pnpm (el `packageManager` de `package.json`).
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID` y `CLOUDFLARE_API_TOKEN` (permisos de D1) en `.env` para los comandos de ingesta y para `wrangler` fuera del dashboard; o sesion activa con `pnpm exec wrangler login`.
- Acceso a la zona `csfacturacion.com` en Cloudflare para el custom domain.

## Configuracion (`wrangler.jsonc`)

- `name`: `cs-herramientas` (tambien es el nombre del proyecto de Workers Builds).
- `compatibility_flags`: `["nodejs_compat"]`.
- `workers_dev: false` y `routes` con `{"pattern": "herramientas.csfacturacion.com", "custom_domain": true}`: el Worker solo responde en ese hostname; no reemplaza `www.csfacturacion.com`.
- `d1_databases`: binding `DB`, `database_name` `cs-herramientas`, `database_id` UUID real y `migrations_dir` `migrations`.

No editar `main`/`assets`: los genera Nitro en el build.

## Bootstrap de D1 (una vez)

```sh
pnpm exec wrangler d1 create cs-herramientas
# Copiar el database_id (UUID) devuelto a wrangler.jsonc > d1_databases[0].database_id
pnpm d1:migrate:remote   # aplica migrations/*.sql a la base remota
pnpm db:backfill         # carga inicial de datos (SIDOF)
pnpm sat:catalogos:sync  # carga inicial de catalogos SAT
```

Si `database_id` queda placeholder (ceros o `PENDIENTE...`), `pnpm cf:check` falla y no se debe desplegar.

## Despliegue automatizado (Cloudflare Workers Builds)

Workers Builds esta conectado al repo `ConroeSoluciones/herramientas-fiscales` y despliega en cada push a `main`; tambien permite builds manuales desde el dashboard. Configuracion del proyecto (`cs-herramientas`):

- Build command:

  ```sh
  pnpm typecheck && pnpm lint && pnpm format:check && pnpm run build
  ```

- Deploy command:

  ```sh
  node scripts/check-wrangler-output.mjs && pnpm exec wrangler d1 migrations apply cs-herramientas --remote && pnpm exec wrangler --cwd .output deploy && curl -fsS https://herramientas.csfacturacion.com/api/tipo-cambio/penultimo
  ```

  En orden: valida el `wrangler.json` generado (`cf:check`), aplica migraciones D1 remotas, despliega el bundle de `.output` (el `--cwd` es obligatorio: la config efectiva vive en `.output/server/wrangler.json`) y verifica el endpoint critico de D1.

- Variables de build (Settings → Variables y secretos):
  - `NODE_VERSION=22`
  - `NUXT_PUBLIC_SITE_NAME`
  - `NUXT_PUBLIC_SITE_URL=https://herramientas.csfacturacion.com`
  - `NUXT_PUBLIC_MARKETING_URL`
- Si `d1 migrations apply` falla por permisos del token inyectado, crea un API token con `Workers Scripts:Edit` + `D1:Edit` y fijalo como variable de build `CLOUDFLARE_API_TOKEN`.

Los valores `NUXT_PUBLIC_*` se hornean en el build: cambiarlos exige redeploy, no basta reiniciar el Worker.

## Flujo local

```sh
pnpm install
pnpm build
pnpm d1:migrate:local && pnpm preview   # Worker + D1 local de Wrangler
pnpm build && pnpm cf:check && pnpm deploy:dry-run  # valida config y bundle sin publicar
```

## Despliegue manual de emergencia

Si Workers Builds no esta disponible, desde una maquina con credenciales de Cloudflare:

```sh
pnpm deploy:cloudflare
```

(build + deploy con la misma config). Si el deploy command fallo solo en el paso de migraciones, aplicarlas primero: `pnpm d1:migrate:remote`.

## Verificacion post-deploy

```sh
curl -sI https://herramientas.csfacturacion.com/
curl -s https://herramientas.csfacturacion.com/api/tipo-cambio/penultimo
curl -s https://herramientas.csfacturacion.com/api/catalogos-error | head
curl -sI https://herramientas.csfacturacion.com/sitemap.xml
pnpm exec wrangler tail cs-herramientas
```

Esperado: HTTP 200 en las rutas validas, 404 (no 500) en rutas inexistentes y sin excepciones en `tail`.

## Rollback

```sh
pnpm exec wrangler versions list cs-herramientas
pnpm exec wrangler rollback <version-id> cs-herramientas
```

El trafico vuelve a la version indicada sin rebuild. Ante un incidente, prefiera rollback antes que un redeploy apresurado sin diagnostico.
