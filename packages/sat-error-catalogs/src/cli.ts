import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCloudflareD1DatabaseFromEnvironment } from '@cs-herramientas/d1-client'
import { readCatalogConfig } from './config.js'
import { downloadCatalogs } from './downloader.js'
import { D1CatalogRepository } from './d1-repository.js'

const rootEnvironmentFile = resolve(process.cwd(), '../../.env')
if (existsSync(rootEnvironmentFile)) process.loadEnvFile(rootEnvironmentFile)

const DEFAULT_CONFIG = fileURLToPath(
  new URL('../../../config/sat-error-catalogs.json', import.meta.url),
)

function getConfigPath(args: string[]): string {
  if (args.length === 0) return DEFAULT_CONFIG
  if (args.length !== 2 || args[0] !== '--config') {
    throw new Error('Uso: node cli.js sync [--config ruta/al/archivo.json].')
  }
  return resolve(args[1] ?? '')
}

async function main(): Promise<void> {
  const [mode, ...args] = process.argv.slice(2)
  if (mode !== 'sync')
    throw new Error('Uso: node cli.js sync [--config ruta/al/archivo.json].')

  const configPath = getConfigPath(args)
  const config = await readCatalogConfig(configPath)

  const database = createCloudflareD1DatabaseFromEnvironment(process.env)
  const repository = new D1CatalogRepository(database)
  const catalogs = await downloadCatalogs(config)
  const importedRows = await repository.replaceCatalogs(catalogs)
  const summary = catalogs
    .map((catalog) => `${catalog.source.clave}=${catalog.rows.length}`)
    .join(', ')
  console.info(
    `Catálogos SAT actualizados en D1: ${summary}. Filas reemplazadas: ${importedRows}. Archivos: ${resolve(config.downloadDirectory)}.`,
  )
}

main().catch((error: unknown) => {
  console.error('Falló la descarga/ingesta de catálogos SAT:', error)
  process.exitCode = 1
})
