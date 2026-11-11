import { getSatCatalogRepository } from '../../utils/sat-catalog-repository.js'
import { getSatCatalogName } from '../../utils/sat-catalog-names.js'

export default defineEventHandler(async (event) => {
  const clave = getRouterParam(event, 'clave')
  if (!clave) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Falta la clave del catálogo.',
    })
  }

  const queryValue = getQuery(event).q
  if (queryValue !== undefined && typeof queryValue !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'El texto de búsqueda no es válido.',
    })
  }
  const searchTerm = queryValue?.trim() ?? ''
  if (searchTerm.length > 120) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La búsqueda no puede superar 120 caracteres.',
    })
  }

  const repository = getSatCatalogRepository()
  let catalog
  try {
    catalog = await repository.findCatalogByKey(clave)
  } catch (error) {
    console.error(
      'No se pudo consultar el catálogo SAT en MySQL.',
      error instanceof Error ? error.name : 'Error desconocido',
    )
    throw createError({
      statusCode: 503,
      statusMessage: 'El catálogo no está disponible por el momento.',
    })
  }

  if (!catalog) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No se encontró el catálogo solicitado.',
    })
  }

  catalog = {
    ...catalog,
    nombre: getSatCatalogName(catalog.clave, catalog.nombre),
  }

  try {
    const errors = await repository.searchCatalogErrors(clave, searchTerm)
    return { catalog, errors }
  } catch (error) {
    console.error(
      'No se pudieron consultar los errores del catálogo SAT en MySQL.',
      error instanceof Error ? error.name : 'Error desconocido',
    )
    throw createError({
      statusCode: 503,
      statusMessage: 'Los errores no están disponibles por el momento.',
    })
  }
})
