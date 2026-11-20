import catalogConfig from '~~/config/sat-error-catalogs.json'
import type { D1Database } from '@cs-herramientas/d1-client'
import {
  fetchCatalogs,
  parseCatalogSources,
  D1CatalogRepository,
} from '@cs-herramientas/sat-error-catalogs'
import { getD1DatabaseFromEnv } from '../utils/d1-database'

export default defineTask({
  meta: {
    name: 'sat-catalogos-sync',
    description: 'Sincronización mensual de catálogos de errores SAT',
  },
  async run({ context }) {
    const env = (context as { cloudflare?: { env?: { DB?: D1Database } } })
      .cloudflare?.env
    const db = getD1DatabaseFromEnv(env)

    const sources = parseCatalogSources(catalogConfig)
    // El .xls no se persiste en el Worker: se descarga, valida y reemplaza en un batch.
    const catalogs = await fetchCatalogs(sources)
    const importedRows = await new D1CatalogRepository(db).replaceCatalogs(
      catalogs,
    )
    const summary = catalogs
      .map((catalog) => `${catalog.source.clave}=${catalog.rows.length}`)
      .join(', ')

    console.info(
      `Catálogos SAT actualizados en D1: ${summary}. Filas reemplazadas: ${importedRows}.`,
    )

    return { result: { resumen: summary, filasReemplazadas: importedRows } }
  },
})
