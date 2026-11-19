# Agent instructions

## Repo shape

- pnpm workspace: the Nuxt 4.6 site lives at the root (`app/`, `server/api/`, `migrations/`); `packages/*` holds four private packages: `d1-client` (D1 types + Cloudflare REST client), `sidof-scraper` (fetch/parse only), `sidof-ingestion` (backfill/sync CLI + repository), `sat-error-catalogs` (Excel download/parse/ingest).
- Nuxt source dir is `app/`; Nitro routes stay in root `server/api/` and server-only helpers in `server/utils/`.
- For UI/design requests default to the Nuxt frontend (`app/pages/index.vue` for the landing page); treat `packages/*` as backend utilities and don't ask the user to pick one unless they name it.

## Commands and build order

- `pnpm install` triggers `postinstall` → builds every package `dist/` and runs `nuxt prepare`. `eslint.config.mjs` imports `.nuxt/eslint.config.mjs`, so `pnpm lint` fails on a checkout that was never installed.
- After editing a package consumed by Nuxt, run `pnpm build:packages` before restarting `pnpm dev`; never delete a package `dist/` while `nuxt typecheck` is watching it.
- Root `pnpm typecheck` is only `nuxt typecheck` (app + server). Packages type-check separately with `pnpm --filter @cs-herramientas/<pkg> typecheck`; `sat-error-catalogs` has no typecheck script, its `build` covers it.
- There is no root `pnpm test`. Tests are per package, compiled first and run with `node --test`: `pnpm test:scraper`, `pnpm test:d1-client`, `pnpm test:ingestion` (builds the scraper first), `pnpm test:sat-catalogos`. Single file: `pnpm --filter @cs-herramientas/<pkg> build && node --test packages/<pkg>/dist/test/<name>.test.js`.
- `pnpm preview` = build + `wrangler dev` on `.output`; `pnpm deploy:cloudflare` = build + deploy. D1 migrations: `pnpm d1:migrate:local` / `pnpm d1:migrate:remote` (database `cs-herramientas`, SQL in `migrations/`).
- Ingestion: `pnpm db:backfill` defaults to the last five years of SIDOF notices, `pnpm db:backfill --publicaciones N` caps it to the N most recent (60 is only the listing page size); `pnpm db:sync` inserts only unseen `codNota`s; `pnpm sat:catalogos:sync` downloads, parses and replaces catalog rows. All read `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_API_TOKEN` from root `.env`.
- Prettier: single quotes, no semicolons, Tailwind class sorting plugin. Use `pnpm format` / `pnpm format:check` and `pnpm lint:fix` before finishing.

## D1 and Cloudflare

- The app deploys with the Nitro `cloudflare_module` preset (`wrangler.jsonc`, binding `DB`). Server code must obtain D1 through `getD1Database(event)` in `server/utils/d1-database.ts`: it prefers the Worker binding and falls back to the REST client from env for Node dev/CLI. Never query D1 from components or expose tokens to the client.
- Schema changes go into a new `migrations/*.sql` applied with Wrangler; never mutate schema at request time. Keep long SAT attributes (`CCE165` and similar) on `TEXT` columns.
- Sitemap/robots/schema.org are generated: the sitemap pulls dynamic catalog URLs from `server/api/__sitemap__/urls.ts` and excludes `/aviso-legal`, `/privacidad`, `/errores*`.

## Product surface (don't regress)

- The home page must lead with the Tipo de Cambio SAT card plus SAT error-code search and link the other tools. Its widget calls `GET /api/tipo-cambio/penultimo`, which returns the second D1 row by `fecha_publicacion DESC` (`cod_nota DESC` tiebreak).
- `/tipo-de-cambio-dolar-mxn` has a calendar and monthly history backed by `GET /api/tipo-cambio/historial?mes=AAAA-MM`, filtered by application date, not publication date.
- `/codigos-sat` lists catalogs from `GET /api/catalogos-error`; global search uses `GET /api/catalogos-error/buscar?q=` (min 2 chars, 50 results + `hasMore`); `/codigos-sat/[clave]` returns all rows or `?q=` filtering. Legacy `/errores*` routes 301 to `/codigos-sat`.
- `/calculadora-antiguedad-laboral` computes tenure from a manual date or an uploaded CFDI nómina XML. The XML is parsed in the browser (`FechaInicioRelLaboral`); keep it client-side — no upload endpoint and no server-side file handling.
- Each page owns its `useSeoMeta` and `useCanonicalUrl`; keep visible breadcrumbs off pages unless explicitly requested.
- The site is a CSFacturación property under `https://www.csfacturacion.com`. `NUXT_PUBLIC_SITE_NAME`, `NUXT_PUBLIC_SITE_URL` and `NUXT_PUBLIC_MARKETING_URL` come from `.env`; brand/logo/palette/typography rules live in `docs/identidad-visual-csfacturacion.md` and `DESIGN.md` (product context in `PRODUCT.md`).
- Corporate CTA links must go through `useMarketingUrl` or keep the UTM set: `utm_source=csfacturacion_herramientas`, `utm_medium=referral`, `utm_campaign=portal_utilidades`, plus a per-slot `utm_content`.
- Tailwind CSS 4 is wired with `@tailwindcss/vite`; `@nuxtjs/color-mode` persists light/dark/system and the `dark:` variant follows the `.dark` class in `app/assets/css/main.css`.

## Data pipelines

- SIDOF: POST `/busqueda/cargaNotas/` for listing pages, then fetch `/notas/{codNota}` sequentially. Preserve parser tests when upstream responses change; never hardcode browser cookies.
- SAT catalogs: sources in `config/sat-error-catalogs.json`, downloads to `.data/sat-error-catalogs/` (gitignored). First sheet only, headers on row 2; Nómina omits `ELEMENTO`/`ATRIBUTO` and uses `REGLA DE VALIDACIÓN`/`DESCRIPCIÓN DEL ERROR` while several sheets call the description `ERROR`. Preserve `ACLARACIONES`, skip section rows without a code, and replace each catalog in one D1 batch after every file validates. Display names come from the config through `getSatCatalogName`.
- The daily SIDOF sync and monthly catalog sync are external schedulers that are not provisioned in this repo; never run a timer inside the Nuxt process.
- Keep SEO follow-ups in `docs/seo-pendientes.md` and revisit them in the next SEO-focused PR.
