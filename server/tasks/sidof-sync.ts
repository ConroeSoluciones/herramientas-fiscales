import {
  SidofNotasSource,
  SidofNotaDetailSource,
} from '@cs-herramientas/sidof-scraper'
import {
  ingestLatest,
  D1TipoCambioRepository,
} from '@cs-herramientas/sidof-ingestion'
import type { D1Database } from '@cs-herramientas/d1-client'
import { getD1DatabaseFromEnv } from '../utils/d1-database'

// Sync diario: pagina de 1 porque solo interesa la ultima publicacion SIDOF.
const SIDOF_SYNC_PAGE_SIZE = 1

export default defineTask({
  meta: {
    name: 'sidof-sync',
    description: 'Sincronización diaria del tipo de cambio SIDOF',
  },
  async run({ context }) {
    const env = (context as { cloudflare?: { env?: { DB?: D1Database } } })
      .cloudflare?.env
    const db = getD1DatabaseFromEnv(env)

    const summary = await ingestLatest(
      'sync',
      {
        notes: new SidofNotasSource(fetch, SIDOF_SYNC_PAGE_SIZE),
        details: new SidofNotaDetailSource(),
      },
      new D1TipoCambioRepository(db),
    )

    console.info(
      `Sincronización diaria: avisos=${summary.listed}, existentes=${summary.alreadyStored}, ` +
        `detalles=${summary.detailRequests}, insertados=${summary.inserted}.`,
    )

    return { result: summary }
  },
})
