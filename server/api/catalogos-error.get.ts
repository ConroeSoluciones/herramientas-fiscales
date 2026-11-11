import { getSatCatalogRepository } from '../utils/sat-catalog-repository.js'
import { getSatCatalogName } from '../utils/sat-catalog-names.js'

export default defineEventHandler(async () => {
  try {
    const catalogs = await getSatCatalogRepository().listCatalogSummaries()
    return catalogs.map((catalog) => ({
      ...catalog,
      nombre: getSatCatalogName(catalog.clave, catalog.nombre),
    }))
  } catch (error) {
    console.error(
      'No se pudieron consultar los catálogos de errores SAT en MySQL.',
      error instanceof Error ? error.name : 'Error desconocido',
    )
    throw createError({
      statusCode: 503,
      statusMessage: 'Los catálogos no están disponibles por el momento.',
    })
  }
})
