// Valida el wrangler.json generado por Nitro (.output/server/wrangler.json)
// antes de permitir un deploy. Falla con exit 1 si la configuracion efectiva
// esta incompleta o contiene un database_id placeholder.
import { readFile } from 'node:fs/promises'

const CONFIG_PATH = '.output/server/wrangler.json'
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const D1_BINDING = 'DB'
const EXPECTED_ROUTE = 'herramientas.csfacturacion.com'

const errors = []

function check(condition, message) {
  if (!condition) errors.push(message)
}

const raw = await readFile(CONFIG_PATH, 'utf8').catch(() => null)
if (raw === null) {
  console.error(
    `cf:check: no se encontro ${CONFIG_PATH}. Ejecuta \`pnpm build\` antes de verificar.`,
  )
  process.exit(1)
}

let config
try {
  config = JSON.parse(raw)
} catch (error) {
  console.error(`cf:check: ${CONFIG_PATH} no es JSON valido: ${error.message}`)
  process.exit(1)
}

check(
  typeof config.main === 'string' && config.main.length > 0,
  'falta `main` (entrypoint del Worker)',
)

const assetsDirectory = config.assets?.directory
check(
  typeof assetsDirectory === 'string' && assetsDirectory.length > 0,
  'falta `assets.directory` (directorio de assets estaticos generado por Nitro)',
)

check(
  Array.isArray(config.routes) && config.routes.length > 0,
  'falta `routes` (debe declarar el custom domain)',
)
check(
  Array.isArray(config.routes) &&
    config.routes.some((route) => route?.pattern === EXPECTED_ROUTE),
  `\`routes\` no incluye el custom domain esperado (${EXPECTED_ROUTE})`,
)

const flags = config.compatibility_flags ?? []
check(
  Array.isArray(flags) && flags.includes('nodejs_compat'),
  '`compatibility_flags` debe incluir `nodejs_compat`',
)

const d1 = Array.isArray(config.d1_databases)
  ? config.d1_databases.find((db) => db?.binding === D1_BINDING)
  : undefined
check(
  d1 !== undefined,
  `falta el binding D1 \`${D1_BINDING}\` en \`d1_databases\``,
)

if (d1) {
  check(
    typeof d1.database_name === 'string' && d1.database_name.length > 0,
    'el binding D1 no declara `database_name`',
  )
  check(
    typeof d1.migrations_dir === 'string' && d1.migrations_dir.length > 0,
    'el binding D1 no declara `migrations_dir`',
  )
  check(
    typeof d1.database_id === 'string' && UUID_PATTERN.test(d1.database_id),
    `\`database_id\` es placeholder o invalido (${d1.database_id}); crea la base con \`wrangler d1 create\` y fija el UUID real en \`wrangler.jsonc\``,
  )
}

if (errors.length > 0) {
  console.error(
    `cf:check: configuracion de despliegue incompleta en ${CONFIG_PATH}:`,
  )
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

const route = config.routes.find(
  (entry) => entry?.pattern === EXPECTED_ROUTE,
)?.pattern
console.log(
  `cf:check OK | worker: ${config.name} | ruta: ${route} | d1: ${d1.database_name} (${d1.database_id}) | assets: ${assetsDirectory}`,
)
