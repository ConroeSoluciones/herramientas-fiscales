import { D1CatalogRepository } from '@cs-herramientas/sat-error-catalogs'
import type { H3Event } from 'h3'
import { getD1Database } from './d1-database.js'

export function getSatCatalogRepository(event: H3Event): D1CatalogRepository {
  return new D1CatalogRepository(getD1Database(event))
}
