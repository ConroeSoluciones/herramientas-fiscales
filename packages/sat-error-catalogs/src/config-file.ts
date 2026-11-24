import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parseCatalogSources } from './config.js'
import type { CatalogConfig } from './types.js'

export async function readCatalogConfig(
  configPath: string,
): Promise<CatalogConfig> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(configPath, 'utf8'))
  } catch (error) {
    throw new Error(`No se pudo leer la configuración ${configPath}.`, {
      cause: error,
    })
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new Error('La configuración debe ser un objeto JSON.')
  const record = parsed as Record<string, unknown>
  if (
    typeof record.downloadDirectory !== 'string' ||
    !record.downloadDirectory.trim()
  ) {
    throw new Error('La configuración debe incluir downloadDirectory.')
  }

  return {
    downloadDirectory: resolve(
      dirname(resolve(configPath)),
      record.downloadDirectory,
    ),
    catalogos: parseCatalogSources(parsed),
  }
}
