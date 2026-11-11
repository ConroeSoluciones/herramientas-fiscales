import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseErrorCatalog } from './xls-parser.js'
import type { CatalogConfig, ParsedCatalog } from './types.js'

export async function downloadCatalogs(
  config: CatalogConfig,
  fetcher: typeof fetch = fetch,
): Promise<ParsedCatalog[]> {
  const parsedCatalogs: ParsedCatalog[] = []

  for (const source of config.catalogos) {
    const response = await fetcher(source.url, {
      headers: { 'user-agent': 'cs-herramientas-sat-error-catalogs/1.0' },
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) {
      throw new Error(
        `Falló la descarga de "${source.clave}" (HTTP ${response.status} ${response.statusText}).`,
      )
    }

    const file = Buffer.from(await response.arrayBuffer())
    let rows
    try {
      rows = parseErrorCatalog(file)
      if (rows.length === 0) {
        throw new Error(
          'El Excel no contiene filas de datos; se evita borrar el catálogo.',
        )
      }
    } catch (error) {
      throw new Error(`No se pudo procesar el Excel de "${source.clave}".`, {
        cause: error,
      })
    }
    parsedCatalogs.push({ source, rows, file })
  }

  await mkdir(config.downloadDirectory, { recursive: true })
  for (const catalog of parsedCatalogs) {
    const destination = join(
      config.downloadDirectory,
      `${catalog.source.clave}.xls`,
    )
    const temporary = `${destination}.tmp-${process.pid}`
    await writeFile(temporary, catalog.file)
    await rename(temporary, destination)
  }

  return parsedCatalogs
}
