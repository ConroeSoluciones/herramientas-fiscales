import {
  CFDI_NAMESPACE,
  TFD_NAMESPACE,
  XSI_NAMESPACE,
  parseCfdiXml,
  type ParsedCfdiXml,
} from './cfdi-xml-parser'

const XML_SCHEMA_NAMESPACE = 'http://www.w3.org/2001/XMLSchema'
const CFDI_XSD_URL = 'https://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd'
const CFDI_CATALOGS_XSD_URL =
  'https://www.sat.gob.mx/sitio_internet/cfd/catalogos/catCFDI.xsd'
const CFDI_TYPES_XSD_URL =
  'https://www.sat.gob.mx/sitio_internet/cfd/tipoDatos/tdCFDI/tdCFDI.xsd'
const TFD_XSD_URL =
  'https://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd'
const MAX_SCHEMA_COUNT = 32
const MAX_SCHEMA_TOTAL_BYTES = 24 * 1024 * 1024
const XSD_CACHE_NAME = 'csfacturacion-cfdi-xsd-v1'
const XSD_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const knownSchemaFileNames = new Map<string, string>([
  [CFDI_XSD_URL, 'cfdv40.xsd'],
  [CFDI_CATALOGS_XSD_URL, 'catCFDI.xsd'],
  [CFDI_TYPES_XSD_URL, 'tdCFDI.xsd'],
  [TFD_XSD_URL, 'TimbreFiscalDigitalv11.xsd'],
])

interface XsdAttribute {
  local: string
  uri: string
  value: string
}

interface SchemaImport {
  kind: 'import' | 'include' | 'redefine'
  namespace: string | undefined
  schemaLocation: string
}

interface SchemaResource {
  url: string
  fileName: string
  content: string
  targetNamespace: string
  dependencies: string[]
  unresolvedDependencies: string[]
  state: 'loading' | 'loaded'
}

export interface CfdiSchemaGraph {
  schema: { fileName: string; contents: string }
  preload: Array<{ fileName: string; contents: string }>
  validatedNamespaces: string[]
  unresolvedSchemas: string[]
}

function getAttribute(
  attributes: XsdAttribute[],
  localName: string,
  namespaceUri = '',
): string | undefined {
  return attributes.find(
    (attribute) =>
      attribute.local === localName && attribute.uri === namespaceUri,
  )?.value
}

function normalizeSchemaUrl(
  reference: string,
  baseUrl?: string,
): string | null {
  let url: URL
  try {
    url = baseUrl ? new URL(reference, baseUrl) : new URL(reference)
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
    return `https://www.sat.gob.mx${pathname}`
  }

  if (
    hostname === 'www.w3.org' &&
    [
      '/2001/xml.xsd',
      '/2001/04/xmldsig-more.xsd',
      '/TR/2002/REC-xmldsig-core-20020212/xmldsig-core-schema.xsd',
    ].includes(pathname)
  ) {
    return `https://www.w3.org${pathname}`
  }

  return null
}

const schemaTextCache = new Map<string, Promise<string>>()

async function fetchSchemaText(url: string): Promise<string> {
  const cached = schemaTextCache.get(url)
  if (cached) return cached

  const request = (async () => {
    const requestUrl = `/api/cfdi-xsd?url=${encodeURIComponent(url)}`
    const cacheKey = new Request(new URL(requestUrl, location.href).toString())
    let persistentCache: Cache | undefined

    if (typeof caches !== 'undefined') {
      try {
        persistentCache = await caches.open(XSD_CACHE_NAME)
        const cachedResponse = await persistentCache.match(cacheKey)
        const cachedAt = Number(
          cachedResponse?.headers.get('x-cfdi-xsd-cached-at'),
        )

        if (
          cachedResponse &&
          Number.isFinite(cachedAt) &&
          Date.now() - cachedAt < XSD_CACHE_TTL_MS
        ) {
          return cachedResponse.text()
        }

        if (cachedResponse) await persistentCache.delete(cacheKey)
      } catch {
        persistentCache = undefined
      }
    }

    const response = await fetch(requestUrl)

    if (!response.ok) {
      throw new Error('No se pudo obtener un esquema XSD.')
    }

    const content = await response.text()
    if (persistentCache) {
      try {
        const headers = new Headers(response.headers)
        headers.set('x-cfdi-xsd-cached-at', String(Date.now()))
        await persistentCache.put(
          cacheKey,
          new Response(content, { status: 200, headers }),
        )
      } catch {
        // Validation can continue even if browser storage is unavailable.
      }
    }

    return content
  })()

  schemaTextCache.set(url, request)
  try {
    return await request
  } catch (error) {
    schemaTextCache.delete(url)
    throw error
  }
}

function getSchemaMetadata(content: string): {
  targetNamespace: string
  imports: Array<{
    kind: SchemaImport['kind']
    namespace: string | undefined
    schemaLocation: string
  }>
} {
  const parsed = parseCfdiXml(content)
  if (
    parsed.parseError ||
    parsed.root?.localName !== 'schema' ||
    parsed.root.namespaceUri !== XML_SCHEMA_NAMESPACE
  ) {
    throw new Error('El archivo obtenido no es un esquema XSD válido.')
  }

  const targetNamespace =
    getAttribute(parsed.root.attributes, 'targetNamespace') ?? ''
  const imports = parsed.root.children.flatMap((node) => {
    if (
      node.namespaceUri !== XML_SCHEMA_NAMESPACE ||
      !['import', 'include', 'redefine'].includes(node.localName)
    ) {
      return []
    }

    const schemaLocation = getAttribute(node.attributes, 'schemaLocation')
    if (!schemaLocation) return []

    return [
      {
        kind: node.localName as SchemaImport['kind'],
        namespace: getAttribute(node.attributes, 'namespace'),
        schemaLocation,
      },
    ]
  })

  return { targetNamespace, imports }
}

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function isSchemaComplete(
  url: string,
  resources: Map<string, SchemaResource>,
  visited = new Set<string>(),
): boolean {
  if (visited.has(url)) return true
  visited.add(url)

  const resource = resources.get(url)
  if (!resource || resource.state !== 'loaded') return false
  if (resource.unresolvedDependencies.length > 0) return false

  return resource.dependencies.every((dependency) =>
    isSchemaComplete(dependency, resources, visited),
  )
}

function getResourceFileName(url: string, index: number): string {
  return knownSchemaFileNames.get(url) ?? `sat-schema-${index}.xsd`
}

export async function loadCfdiSchemaGraph(
  parsedXml: ParsedCfdiXml,
): Promise<CfdiSchemaGraph> {
  const resources = new Map<string, SchemaResource>()
  const unresolvedSchemas = new Set<string>()
  let totalSchemaBytes = 0

  const loadSchema = async (url: string): Promise<SchemaResource | null> => {
    const existing = resources.get(url)
    if (existing) return existing
    if (resources.size >= MAX_SCHEMA_COUNT) {
      unresolvedSchemas.add(url)
      return null
    }

    let content: string
    try {
      content = await fetchSchemaText(url)
    } catch {
      unresolvedSchemas.add(url)
      return null
    }

    totalSchemaBytes += new TextEncoder().encode(content).byteLength
    if (totalSchemaBytes > MAX_SCHEMA_TOTAL_BYTES) {
      unresolvedSchemas.add(url)
      return null
    }

    let metadata: ReturnType<typeof getSchemaMetadata>
    try {
      metadata = getSchemaMetadata(content)
    } catch {
      unresolvedSchemas.add(url)
      return null
    }

    const resource: SchemaResource = {
      url,
      fileName: getResourceFileName(url, resources.size),
      content,
      targetNamespace: metadata.targetNamespace,
      dependencies: [],
      unresolvedDependencies: [],
      state: 'loading',
    }
    resources.set(url, resource)

    for (const schemaImport of metadata.imports) {
      const dependencyUrl = normalizeSchemaUrl(schemaImport.schemaLocation, url)
      if (!dependencyUrl) {
        resource.unresolvedDependencies.push(schemaImport.schemaLocation)
        unresolvedSchemas.add(
          schemaImport.namespace || schemaImport.schemaLocation,
        )
        continue
      }

      const dependency = await loadSchema(dependencyUrl)
      if (!dependency) {
        resource.unresolvedDependencies.push(dependencyUrl)
        unresolvedSchemas.add(schemaImport.namespace || dependencyUrl)
        continue
      }

      const namespaceMatches =
        schemaImport.kind === 'import'
          ? schemaImport.namespace === undefined ||
            schemaImport.namespace === dependency.targetNamespace
          : dependency.targetNamespace === resource.targetNamespace

      if (!namespaceMatches) {
        resource.unresolvedDependencies.push(dependencyUrl)
        unresolvedSchemas.add(
          schemaImport.namespace || dependency.targetNamespace || dependencyUrl,
        )
        continue
      }

      resource.dependencies.push(dependencyUrl)
    }

    resource.state = 'loaded'
    return resource
  }

  const rootSchema = await loadSchema(CFDI_XSD_URL)
  if (
    !rootSchema ||
    rootSchema.targetNamespace !== CFDI_NAMESPACE ||
    !isSchemaComplete(CFDI_XSD_URL, resources)
  ) {
    throw new Error('No fue posible cargar el esquema principal del CFDI 4.0.')
  }

  const directSchemas = new Map<string, string>()
  const schemaUrlByNamespace = new Map<string, string>()
  const directUrls = new Set<string>()
  const timbrePresent =
    parsedXml.nodes.some((node) => node.namespaceUri === TFD_NAMESPACE) ||
    parsedXml.schemaLocations.some(
      (location) => location.namespace === TFD_NAMESPACE,
    )

  if (timbrePresent) directUrls.add(TFD_XSD_URL)

  for (const location of parsedXml.schemaLocations) {
    if (location.namespace === CFDI_NAMESPACE) continue
    if (location.namespace === TFD_NAMESPACE) {
      directUrls.add(TFD_XSD_URL)
      continue
    }

    const normalizedUrl = normalizeSchemaUrl(location.url)
    if (!normalizedUrl) {
      unresolvedSchemas.add(location.namespace || location.url)
      continue
    }

    const previousUrl = schemaUrlByNamespace.get(location.namespace)
    if (previousUrl && previousUrl !== normalizedUrl) {
      unresolvedSchemas.add(location.namespace)
      continue
    }

    schemaUrlByNamespace.set(location.namespace, normalizedUrl)
    directSchemas.set(normalizedUrl, location.namespace)
    directUrls.add(normalizedUrl)
  }

  const noNamespaceUrls = new Set<string>()
  for (const location of parsedXml.noNamespaceSchemaLocations) {
    const normalizedUrl = normalizeSchemaUrl(location)
    if (!normalizedUrl) {
      unresolvedSchemas.add(location)
      continue
    }

    noNamespaceUrls.add(normalizedUrl)
    directUrls.add(normalizedUrl)
  }

  const directImports: Array<{
    namespace: string
    resource: SchemaResource
  }> = []
  const noNamespaceImports: SchemaResource[] = []

  for (const url of directUrls) {
    if (url === CFDI_XSD_URL) continue
    const resource = await loadSchema(url)
    if (!resource) continue

    if (!isSchemaComplete(url, resources)) {
      unresolvedSchemas.add(resource.targetNamespace || url)
      continue
    }

    if (url === TFD_XSD_URL) {
      if (resource.targetNamespace !== TFD_NAMESPACE) {
        unresolvedSchemas.add(TFD_NAMESPACE)
        continue
      }
      directImports.push({ namespace: TFD_NAMESPACE, resource })
      continue
    }

    if (noNamespaceUrls.has(url)) {
      if (resource.targetNamespace) {
        unresolvedSchemas.add(resource.targetNamespace)
        continue
      }
      noNamespaceImports.push(resource)
      continue
    }

    const expectedNamespace = directSchemas.get(url)
    if (!expectedNamespace || resource.targetNamespace !== expectedNamespace) {
      unresolvedSchemas.add(
        expectedNamespace || resource.targetNamespace || url,
      )
      continue
    }

    directImports.push({ namespace: expectedNamespace, resource })
  }

  let rootImports = rootSchema.content
    .replace(
      'http://www.sat.gob.mx/sitio_internet/cfd/catalogos/catCFDI.xsd',
      'catCFDI.xsd',
    )
    .replace(
      'http://www.sat.gob.mx/sitio_internet/cfd/tipoDatos/tdCFDI/tdCFDI.xsd',
      'tdCFDI.xsd',
    )
  const existingNamespaces = new Set(
    getSchemaMetadata(rootSchema.content)
      .imports.map((schemaImport) => schemaImport.namespace)
      .filter((namespace): namespace is string => Boolean(namespace)),
  )
  const addedNamespaces = new Set(existingNamespaces)
  let injectedImports = ''

  for (const { namespace, resource } of directImports) {
    if (addedNamespaces.has(namespace)) continue
    addedNamespaces.add(namespace)
    injectedImports += `<xs:import namespace="${escapeXmlAttribute(namespace)}" schemaLocation="${resource.fileName}"/>`
  }

  for (const resource of noNamespaceImports) {
    injectedImports += `<xs:import schemaLocation="${resource.fileName}"/>`
  }

  if (injectedImports) {
    const elementStart = '<xs:element name="Comprobante">'
    if (!rootImports.includes(elementStart)) {
      throw new Error('El esquema CFDI 4.0 no tiene la estructura esperada.')
    }
    rootImports = rootImports.replace(
      elementStart,
      `${injectedImports}${elementStart}`,
    )
  }

  // Unknown extension namespaces must remain unverified rather than being
  // reported as invalid; their namespaces are surfaced as a partial result.
  rootImports = rootImports.replace(
    /<((?:[a-z_][\w.-]*:)?any)\b([^>]*?)(\/?)>/gi,
    (match, name: string, attributes: string, closing: string) =>
      /\bprocessContents\s*=/.test(attributes)
        ? match
        : `<${name}${attributes} processContents="lax"${closing}>`,
  )

  const resourcesByUrl = new Map(resources)
  const rewriteSchemaLocations = (content: string, baseUrl: string): string =>
    content.replace(
      /(\bschemaLocation\s*=\s*)(["'])(.*?)\2/gs,
      (match, prefix: string, quote: string, location: string) => {
        const normalizedUrl = normalizeSchemaUrl(location, baseUrl)
        const dependency = normalizedUrl
          ? resourcesByUrl.get(normalizedUrl)
          : undefined
        return dependency
          ? `${prefix}${quote}${dependency.fileName}${quote}`
          : match
      },
    )

  const schemaContents = rewriteSchemaLocations(rootImports, CFDI_XSD_URL)
  const preload = [...resources.values()]
    .filter((resource) => resource.url !== CFDI_XSD_URL)
    .map((resource) => ({
      fileName: resource.fileName,
      contents: rewriteSchemaLocations(resource.content, resource.url),
    }))

  const activeUrls = new Set<string>()
  const collectActiveResources = (url: string) => {
    if (activeUrls.has(url)) return
    activeUrls.add(url)
    const resource = resources.get(url)
    if (!resource) return
    for (const dependency of resource.dependencies) {
      collectActiveResources(dependency)
    }
  }
  collectActiveResources(CFDI_XSD_URL)
  for (const { resource } of directImports) {
    collectActiveResources(resource.url)
  }
  for (const resource of noNamespaceImports) {
    collectActiveResources(resource.url)
  }

  const validatedNamespaces = new Set([CFDI_NAMESPACE])
  if (noNamespaceImports.length > 0) validatedNamespaces.add('')
  for (const url of activeUrls) {
    const resource = resources.get(url)
    if (resource?.targetNamespace) {
      validatedNamespaces.add(resource.targetNamespace)
    }
  }

  for (const node of parsedXml.nodes) {
    if (
      node.namespaceUri &&
      !validatedNamespaces.has(node.namespaceUri) &&
      node.namespaceUri !== XSI_NAMESPACE &&
      node.namespaceUri !== 'http://www.w3.org/XML/1998/namespace'
    ) {
      unresolvedSchemas.add(node.namespaceUri)
    }

    const inExtensionContainer = (() => {
      let parent = node.parent
      while (parent) {
        if (
          ['Addenda', 'ComplementoConcepto', 'Complemento'].includes(
            parent.localName,
          ) &&
          parent.namespaceUri === CFDI_NAMESPACE
        ) {
          return true
        }
        parent = parent.parent
      }
      return false
    })()

    if (
      inExtensionContainer &&
      !node.namespaceUri &&
      !validatedNamespaces.has('')
    ) {
      unresolvedSchemas.add(node.name)
    }
  }

  return {
    schema: { fileName: 'cfdv40.xsd', contents: schemaContents },
    preload,
    validatedNamespaces: [...validatedNamespaces],
    unresolvedSchemas: [...unresolvedSchemas],
  }
}

export function removeXmlSchemaHints(
  xml: string,
  parsedXml: ParsedCfdiXml,
): string {
  return parsedXml.schemaLocationAttributeNames.reduce(
    (result, attributeName) => {
      const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(
        `\\s${escapedName}\\s*=\\s*(["'])[\\s\\S]*?\\1`,
        'g',
      )
      return result.replace(pattern, '')
    },
    xml,
  )
}
