import {
  createMysqlPoolFromEnvironment,
  MysqlCatalogRepository,
} from '@cs-herramientas/sat-error-catalogs'

let repository: MysqlCatalogRepository | undefined

export function getSatCatalogRepository(): MysqlCatalogRepository {
  repository ??= new MysqlCatalogRepository(createMysqlPoolFromEnvironment())
  return repository
}
