import {
  SidofNotaDetailSource,
  SidofNotasSource,
} from '@cs-herramientas/sidof-scraper'
import { ingestLatest } from './ingestion.js'
import { MysqlTipoCambioRepository } from './mysql-repository.js'
import { createMysqlPoolFromEnvironment } from './mysql-pool.js'

const SIDOF_BACKFILL_PAGE_SIZE = 60
const SIDOF_SYNC_PAGE_SIZE = 1

async function main(): Promise<void> {
  const mode = process.argv[2]
  if (mode !== 'backfill' && mode !== 'sync') {
    throw new Error('Uso: node cli.js <backfill|sync>.')
  }

  const pool = createMysqlPoolFromEnvironment()
  try {
    const summary = await ingestLatest(
      mode,
      {
        notes: new SidofNotasSource(
          fetch,
          mode === 'backfill' ? SIDOF_BACKFILL_PAGE_SIZE : SIDOF_SYNC_PAGE_SIZE,
        ),
        details: new SidofNotaDetailSource(),
      },
      new MysqlTipoCambioRepository(pool),
    )

    const label =
      mode === 'backfill' ? 'Carga inicial' : 'Sincronización diaria'
    console.info(
      `${label}: avisos=${summary.listed}, existentes=${summary.alreadyStored}, ` +
        `detalles=${summary.detailRequests}, insertados=${summary.inserted}.`,
    )
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  console.error('Falló el proceso de ingesta SIDOF:', error)
  process.exitCode = 1
})
