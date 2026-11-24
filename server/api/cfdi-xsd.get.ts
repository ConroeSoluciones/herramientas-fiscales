const MAX_SCHEMA_BYTES = 8 * 1024 * 1024
const ALLOWED_W3_SCHEMAS = new Set([
  '/2001/xml.xsd',
  '/2001/04/xmldsig-more.xsd',
  '/TR/2002/REC-xmldsig-core-20020212/xmldsig-core-schema.xsd',
])

function getAllowedSchemaUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length > 2_000) return null

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.port && url.port !== '80' && url.port !== '443')
  ) {
    return null
  }

  const hostname = url.hostname.toLowerCase()
  let pathname: string
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    return null
  }

  if (/[^a-z0-9_./-]/i.test(pathname) || pathname.split('/').includes('..')) {
    return null
  }

  if (
    (hostname === 'www.sat.gob.mx' || hostname === 'sat.gob.mx') &&
    pathname.startsWith('/sitio_internet/cfd/') &&
    pathname.toLowerCase().endsWith('.xsd')
  ) {
    return new URL(`https://www.sat.gob.mx${pathname}`)
  }

  if (hostname === 'www.w3.org' && ALLOWED_W3_SCHEMAS.has(pathname)) {
    return new URL(`https://www.w3.org${pathname}`)
  }

  return null
}

async function readBoundedBody(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_SCHEMA_BYTES) {
    throw createError({
      statusCode: 413,
      message: 'El esquema XSD supera el tamaño permitido.',
    })
  }

  if (!response.body) {
    throw createError({
      statusCode: 502,
      message: 'El esquema XSD no está disponible.',
    })
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      totalBytes += value.byteLength
      if (totalBytes > MAX_SCHEMA_BYTES) {
        await reader.cancel()
        throw createError({
          statusCode: 413,
          message: 'El esquema XSD supera el tamaño permitido.',
        })
      }

      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new TextDecoder('utf-8').decode(bytes)
}

export default defineEventHandler(async (event) => {
  const schemaUrl = getQuery(event).url
  const upstreamUrl = getAllowedSchemaUrl(schemaUrl)

  if (!upstreamUrl) {
    throw createError({
      statusCode: 400,
      message: 'La ubicación del esquema XSD no está permitida.',
    })
  }

  let response: Response
  try {
    response = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw createError({
      statusCode: 502,
      message: 'No se pudo consultar el esquema XSD oficial.',
    })
  }

  const finalUrl = getAllowedSchemaUrl(response.url)
  if (!response.ok || !finalUrl) {
    throw createError({
      statusCode: 502,
      message: 'El esquema XSD oficial no está disponible.',
    })
  }

  const schema = await readBoundedBody(response)
  if (!/<(?:[a-z_][\w.-]*:)?schema\b/i.test(schema)) {
    throw createError({
      statusCode: 502,
      message: 'La respuesta del sitio oficial no contiene un XSD.',
    })
  }

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(
    event,
    'Cache-Control',
    'public, max-age=86400, s-maxage=604800',
  )
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')

  return schema
})
