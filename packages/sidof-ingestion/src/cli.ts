import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  SidofNotaDetailSource,
  SidofNotasSource,
} from '@cs-herramientas/sidof-scraper'
import { ingestLatest } from './ingestion.js'
import { MysqlTipoCambioRepository } from './mysql-repository.js'
import { createMysqlPoolFromEnvironment } from './mysql-pool.js'

const SIDOF_BACKFILL_PAGE_SIZE = 60
const SIDOF_SYNC_PAGE_SIZE = 1

const rootEnvironmentFile = resolve(process.cwd(), '../../.env')
if (existsSync(rootEnvironmentFile)) process.loadEnvFile(rootEnvironmentFile)

async function main(): Promise<void> {
  const mode = process.argv[2]
  if (mode !== 'backfill' && mode !== 'sync') {
    throw new Error(
      'Uso: node cli.js backfill [--publicaciones <cantidad>] | node cli.js sync.',
    )
  }

  const commandArguments = process.argv.slice(3)
  if (commandArguments[0] === '--') commandArguments.shift()

  if (
    (mode === 'sync' && commandArguments.length > 0) ||
    (mode === 'backfill' &&
      commandArguments.length > 0 &&
      (commandArguments.length !== 2 ||
        commandArguments[0] !== '--publicaciones'))
  ) {
    throw new Error(
      'Uso: node cli.js backfill [--publicaciones <cantidad>] | node cli.js sync.',
    )
  }

  const limitArgument = commandArguments[1]
  const publicationLimit = parsePublicationLimit(limitArgument)
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
      publicationLimit === undefined ? {} : { publicationLimit },
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

function parsePublicationLimit(value: string | undefined): number | undefined {
  if (value === undefined) return undefined

  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error('La cantidad de publicaciones debe ser un entero positivo.')
  }

  const limit = Number(value)
  if (!Number.isSafeInteger(limit)) {
    throw new Error('La cantidad de publicaciones debe ser un entero positivo.')
  }

  return limit
}

main().catch((error: unknown) => {
  console.error('Falló el proceso de ingesta SIDOF:', error)
  process.exitCode = 1
})
