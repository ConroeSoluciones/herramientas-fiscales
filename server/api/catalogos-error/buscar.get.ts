import { getSatCatalogRepository } from '../../utils/sat-catalog-repository.js'
import { getSatCatalogName } from '../../utils/sat-catalog-names.js'

const RESULT_LIMIT = 50

export default defineEventHandler(async (event) => {
  const queryValue = getQuery(event).q
  if (queryValue !== undefined && typeof queryValue !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'El código de búsqueda no es válido.',
    })
  }

  const searchTerm = queryValue?.trim() ?? ''
  if (searchTerm.length > 120) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La búsqueda no puede superar 120 caracteres.',
    })
  }

  if (searchTerm.length < 2) return { results: [], hasMore: false }

  try {
    const results =
      await getSatCatalogRepository(event).searchErrorsAcrossCatalogs(
        searchTerm,
      )

    return {
      results: results.slice(0, RESULT_LIMIT).map((result) => ({
        ...result,
        catalogNombre: getSatCatalogName(
          result.catalogClave,
          result.catalogNombre,
        ),
      })),
      hasMore: results.length > RESULT_LIMIT,
    }
  } catch (error) {
    console.error(
      'No se pudieron buscar códigos en los catálogos de errores SAT.',
      error instanceof Error ? error.name : 'Error desconocido',
    )
    throw createError({
      statusCode: 503,
      statusMessage: 'La búsqueda no está disponible por el momento.',
    })
  }
})
