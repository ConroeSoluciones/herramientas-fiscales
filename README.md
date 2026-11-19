# cs-herramientas

Portal de herramientas fiscales de CSFacturación, en español de México y construido con Nuxt 4. Se integra bajo `https://www.csfacturacion.com`, conserva la identidad visual de la marca y ofrece consulta de tipo de cambio y búsqueda de errores SAT.

## Requisitos

- Node.js 22 o superior
- Nuxt 4.6.4
- pnpm 12.16.1

## Desarrollo

```sh
pnpm install
pnpm dev
```

El nombre y la URL del sitio se configuran en `.env`. Los comandos de ingesta ejecutados desde Node requieren `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID` y un `CLOUDFLARE_API_TOKEN` con permisos de lectura/escritura de D1. La aplicación usa el binding `DB`: Wrangler emula este binding localmente y el Worker lo usa directamente en producción.

## Cloudflare D1

1. Crea la base de datos en tu cuenta de Cloudflare:

   ```sh
   pnpm exec wrangler d1 create cs-herramientas
   ```

2. Reemplaza el `database_id` de ejemplo en `wrangler.jsonc` por el identificador que devuelve Wrangler y copia ese ID a `.env`.
3. Aplica la migración a los entornos local y remoto:

   ```sh
   pnpm d1:migrate:local
   pnpm d1:migrate:remote
   ```

4. Para probar el Worker con D1 local, usa `pnpm d1:migrate:local` y luego `pnpm preview`. Para publicar en Workers:

   ```sh
   pnpm deploy:cloudflare
   ```

La migración inicial está en `migrations/0001_initial_schema.sql`. Para cambios futuros, agrega una nueva migración; no se modifica el esquema en cada petición del sitio. En Cloudflare, las APIs leen el binding D1 `DB`. `pnpm dev` y `pnpm preview` usan el D1 local de Wrangler; los comandos de ingesta escriben en el D1 remoto mediante la API de Cloudflare.

Al migrar desde una instancia MySQL existente, crea/aplica el esquema D1 y vuelve a poblar los datos desde sus fuentes:

```sh
pnpm db:backfill
pnpm sat:catalogos:sync
```

Comandos de ingesta:

```sh
pnpm db:backfill                         # carga los avisos de los últimos cinco años
pnpm db:backfill --publicaciones 100     # carga las 100 publicaciones más recientes
pnpm db:sync      # consulta el aviso más reciente e inserta codNota nuevo
```

La carga inicial pagina los avisos de SIDOF hasta cubrir los últimos cinco años de publicación por defecto. Se puede pasar un límite entero positivo para leer las publicaciones más recientes indicadas, sin aplicar el corte de cinco años. Descarga los detalles y guarda el tipo de cambio USD/MXN. La sincronización consulta solo el aviso más reciente y pide su detalle únicamente si su `codNota` aún no está en D1. Ambos comandos son idempotentes: `cod_nota` es clave primaria, así que reintentar no duplica filas. `pnpm db:sync` debe invocarse diariamente por un scheduler externo; el cron todavía no está configurado.

## Catálogos de errores del SAT

`pnpm sat:catalogos:sync` descarga los Excel configurados en `config/sat-error-catalogs.json`, lee la primera hoja (encabezados en la fila 2) y reemplaza sus filas en D1. Los archivos descargados quedan en `.data/sat-error-catalogs/`. Se puede pasar otro archivo de configuración ejecutando el CLI con `sync --config ruta/al/archivo.json`; las rutas de `downloadDirectory` se resuelven respecto al archivo de configuración.

Las fuentes configuradas incluyen CFDI 4.0, Retenciones 2.0, Carta Porte 3.1, Comercio Exterior 2.0 revisión A, INE 1.1, Recepción de Pagos 2.0 revisión B, Nómina 1.2 revisión E y Servicios de Plataformas Tecnológicas 1.0 revisión E. Los libros usan la primera hoja y encabezados en la fila 2. El parser reconoce `ERROR`, `DESCRIPCIÓN DEL ERROR` y `REGLA DE VALIDACIÓN`, permite que falten `ELEMENTO` y `ATRIBUTO`, y descarta filas de sección sin código. `ACLARACIONES` se conserva y las columnas de texto de D1 admiten rutas largas como la del error `CCE165`.

El esquema usa `sat_catalogos` como catálogo padre y `sat_catalogo_errores` para las filas, vinculadas por `catalogo_id`. `codigo_error` está indexado y puede repetirse; para buscar un código en todos los orígenes:

```sql
SELECT c.clave AS catalogo, c.nombre, e.num, e.elemento, e.atributo,
       e.validacion, e.codigo_error, e.descripcion_codigo_error
FROM sat_catalogo_errores AS e
JOIN sat_catalogos AS c ON c.id = e.catalogo_id
WHERE e.codigo_error = ?;
```

El comando es apto para ejecutarse mensualmente desde cron o un scheduler externo, pero el scheduler no se configura dentro de Nuxt ni está provisionado en este repositorio. Cada ejecución descarga y valida todos los Excel antes de actualizar la base; cada catálogo se reemplaza en un batch transaccional de D1.

La página `/codigos-sat` consulta `GET /api/catalogos-error` para mostrar los catálogos presentes en D1, su número de errores, rango de códigos y última sincronización. Cada tarjeta abre `/codigos-sat/{clave}`, donde se pueden revisar todos los errores o filtrar por código, mensaje, atributo o validación. Las antiguas rutas `/errores` redirigen permanentemente a la nueva ruta. La API de detalle es `GET /api/catalogos-error/{clave}?q=...` y devuelve únicamente los datos públicos del catálogo.

El widget superior consulta `GET /api/tipo-cambio/penultimo` y muestra el segundo registro de D1 ordenado por `fecha_publicacion DESC` (con `cod_nota DESC` como desempate). `/tipo-de-cambio-dolar-mxn` ofrece un calendario y el historial mensual; la API `GET /api/tipo-cambio/historial?mes=AAAA-MM` consulta las fechas de aplicación en D1.

Comprobaciones disponibles:

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:scraper
pnpm test:d1-client
pnpm test:ingestion
pnpm test:sat-catalogos
```

`NUXT_PUBLIC_SITE_NAME` controla el nombre mostrado y usado en metadatos. `NUXT_PUBLIC_SITE_URL` apunta a `https://www.csfacturacion.com` para que sitemap y URL canónicas usen el dominio publicado. Revisa `docs/identidad-visual-csfacturacion.md` antes de alterar logotipo, paleta, tipografía o tono de voz.

Los CTA al sitio corporativo usan `NUXT_PUBLIC_MARKETING_URL` como destino (por defecto, `NUXT_PUBLIC_SITE_URL`) y agregan `utm_source=csfacturacion_herramientas`, `utm_medium=referral`, `utm_campaign=portal_utilidades` y un `utm_content` distinto por ubicación. `MarketingPromoBanner.vue` contiene el espacio visible `data-marketing-slot="campaign-promo"` para que Marketing reemplace el placeholder con la creatividad, el mensaje y el destino aprobados. Mantén los parámetros UTM o usa `useMarketingUrl` al agregar nuevas ubicaciones.

## Estructura

- `app/pages/`: inicio, tipo de cambio, catálogo y detalle de errores del SAT, y páginas legales.
- `app/components/` y `app/layouts/`: navegación, selector de tema, CTA/espacio de campaña, pie de página y layout común.
- `app/assets/css/main.css`: estilos globales e integración de Tailwind CSS 4.
- `app/composables/useCanonicalUrl.ts`: construcción de URLs canónicas desde el dominio del sitio.
- `app/composables/useMarketingUrl.ts`: enlaces a CSFacturación con UTM por ubicación.
- `server/api/catalogos-error.get.ts` y `server/api/catalogos-error/[clave].get.ts`: consultan D1 desde el servidor y devuelven catálogos o filas filtradas, sin exponer credenciales.
- `server/api/tipo-cambio/penultimo.get.ts`: consulta el registro de tipo de cambio mostrado en la portada.
- `packages/sidof-scraper/`: paquete pnpm independiente con el scraper SIDOF existente.
- `packages/d1-client/`: tipos D1 y cliente de la API de Cloudflare para procesos externos.
- `packages/sidof-ingestion/`: comandos de carga/sincronización y repositorio D1.
- `packages/sat-error-catalogs/`: descarga, análisis de Excel e ingesta mensual de matrices SAT en D1.

Nuxt Sitemap genera `sitemap.xml`, incluye las rutas dinámicas de catálogos SAT desde D1 y omite temporalmente las páginas legales sin terminar. Nuxt Robots genera `robots.txt`. Schema.org identifica el sitio y la organización CSFacturacion con logo, redes sociales y contactos. Cada página declara su propio título, descripción y URL canónica. `ThemeSwitcher` permite elegir tema claro, oscuro o del sistema; la preferencia queda guardada en el navegador.

La portada prioriza el tipo de cambio y ofrece acceso al buscador de códigos. `/codigos-sat` lista los catálogos sincronizados; cada catálogo abre su búsqueda de códigos.
