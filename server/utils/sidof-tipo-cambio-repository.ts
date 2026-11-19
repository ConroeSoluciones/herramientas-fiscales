import { D1TipoCambioRepository } from '@cs-herramientas/sidof-ingestion'
import type { H3Event } from 'h3'
import { getD1Database } from './d1-database.js'

export function getSidofTipoCambioRepository(
  event: H3Event,
): D1TipoCambioRepository {
  return new D1TipoCambioRepository(getD1Database(event))
}
