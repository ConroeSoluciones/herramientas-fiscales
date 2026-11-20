import { parseErrorCatalog } from './xls-parser.js'
import type { CatalogSource, ParsedCatalog } from './types.js'

export async function fetchCatalogs(
  sources: readonly CatalogSource[],
  fetcher: typeof fetch = fetch,
): Promise<ParsedCatalog[]> {
  const parsedCatalogs: ParsedCatalog[] = []

  for (const source of sources) {
    const response = await fetcher(source.url, {
      headers: { 'user-agent': 'cs-herramientas-sat-error-catalogs/1.0' },
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) {
      throw new Error(
        `Falló la descarga de "${source.clave}" (HTTP ${response.status} ${response.statusText}).`,
      )
    }

    const file = new Uint8Array(await response.arrayBuffer())
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

  return parsedCatalogs
}
