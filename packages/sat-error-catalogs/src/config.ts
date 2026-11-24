import type { CatalogSource } from './types.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseSource(value: unknown, index: number): CatalogSource {
  if (!isRecord(value))
    throw new Error(`El catálogo ${index + 1} no es válido.`)

  const { clave, nombre, url } = value
  if (
    typeof clave !== 'string' ||
    !/^[a-z0-9_-]+$/.test(clave) ||
    typeof nombre !== 'string' ||
    !nombre.trim() ||
    typeof url !== 'string'
  ) {
    throw new Error(`La configuración del catálogo ${index + 1} no es válida.`)
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error(`La URL del catálogo "${clave}" no es válida.`)
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`La URL del catálogo "${clave}" debe usar HTTP o HTTPS.`)
  }

  return { clave, nombre: nombre.trim(), url: parsedUrl.toString() }
}

export function parseCatalogSources(value: unknown): CatalogSource[] {
  if (!isRecord(value))
    throw new Error('La configuración debe ser un objeto JSON.')
  const sources = value.catalogos
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('La configuración debe incluir al menos un catálogo.')
  }

  // Se ignoran claves extra del JSON (p. ej. downloadDirectory) porque el
  // Worker importa la configuración sin usarlas.
  const catalogos = sources.map(parseSource)
  const keys = new Set<string>()
  for (const source of catalogos) {
    if (keys.has(source.clave)) {
      throw new Error(
        `La clave "${source.clave}" está repetida en la configuración.`,
      )
    }
    keys.add(source.clave)
  }

  return catalogos
}
