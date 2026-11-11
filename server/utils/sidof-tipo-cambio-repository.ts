import {
  createMysqlPoolFromEnvironment,
  MysqlTipoCambioRepository,
} from '@cs-herramientas/sidof-ingestion'

let repository: MysqlTipoCambioRepository | undefined

export function getSidofTipoCambioRepository(): MysqlTipoCambioRepository {
  repository ??= new MysqlTipoCambioRepository(createMysqlPoolFromEnvironment())
  return repository
}
