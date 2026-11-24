import { SaxesParser } from 'saxes'

export const CFDI_NAMESPACE = 'http://www.sat.gob.mx/cfd/4'
export const TFD_NAMESPACE = 'http://www.sat.gob.mx/TimbreFiscalDigital'
export const XSI_NAMESPACE = 'http://www.w3.org/2001/XMLSchema-instance'

interface SaxAttribute {
  name: string
  local: string
  uri: string
  value: string
}

interface SaxTag {
  name: string
  local: string
  uri: string
  attributes: Record<string, SaxAttribute>
}

export interface CfdiXmlNode {
  name: string
  localName: string
  namespaceUri: string
  startLine: number
  endLine: number | null
  attributes: SaxAttribute[]
  parent: CfdiXmlNode | null
  children: CfdiXmlNode[]
}

export interface XmlParseError {
  message: string
  lineNumber: number
  columnNumber: number
}

export interface ParsedCfdiXml {
  root: CfdiXmlNode | null
  parseError: XmlParseError | null
  schemaLocations: Array<{ namespace: string; url: string }>
  noNamespaceSchemaLocations: string[]
  schemaLocationAttributeNames: string[]
  nodes: CfdiXmlNode[]
}

function getLineStarts(xml: string): number[] {
  const starts = [0]

  for (let index = 0; index < xml.length; index += 1) {
    const character = xml[index]
    if (character === '\r') {
      if (xml[index + 1] === '\n') index += 1
      starts.push(index + 1)
    } else if (character === '\n') {
      starts.push(index + 1)
    }
  }

  return starts
}

function lineAtOffset(lineStarts: number[], offset: number): number {
  let low = 0
  let high = lineStarts.length

  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (lineStarts[middle]! <= offset) low = middle + 1
    else high = middle
  }

  return Math.max(1, low)
}

function tagLine(xml: string, parser: SaxesParser): number {
  const tagStart = xml.lastIndexOf('<', Math.max(0, parser.position - 1))
  return tagStart < 0 ? parser.line : tagStart
}

function attributeValue(
  attributes: SaxAttribute[],
  localName: string,
  namespaceUri?: string,
): string | undefined {
  return attributes.find(
    (attribute) =>
      attribute.local === localName &&
      (namespaceUri === undefined || attribute.uri === namespaceUri),
  )?.value
}

function getSchemaPairs(
  nodes: CfdiXmlNode[],
  attributeNames: Set<string>,
): {
  schemaLocations: Array<{ namespace: string; url: string }>
  noNamespaceSchemaLocations: string[]
} {
  const schemaLocations: Array<{ namespace: string; url: string }> = []
  const noNamespaceSchemaLocations: string[] = []

  for (const node of nodes) {
    const schemaLocation = attributeValue(
      node.attributes,
      'schemaLocation',
      XSI_NAMESPACE,
    )
    const noNamespaceSchemaLocation = attributeValue(
      node.attributes,
      'noNamespaceSchemaLocation',
      XSI_NAMESPACE,
    )

    if (schemaLocation !== undefined) {
      const schemaAttribute = node.attributes.find(
        (attribute) =>
          attribute.local === 'schemaLocation' &&
          attribute.uri === XSI_NAMESPACE,
      )
      if (schemaAttribute) attributeNames.add(schemaAttribute.name)

      const values = schemaLocation.trim().split(/\s+/).filter(Boolean)
      for (let index = 0; index + 1 < values.length; index += 2) {
        schemaLocations.push({
          namespace: values[index]!,
          url: values[index + 1]!,
        })
      }
    }

    if (noNamespaceSchemaLocation !== undefined) {
      const schemaAttribute = node.attributes.find(
        (attribute) =>
          attribute.local === 'noNamespaceSchemaLocation' &&
          attribute.uri === XSI_NAMESPACE,
      )
      if (schemaAttribute) attributeNames.add(schemaAttribute.name)

      noNamespaceSchemaLocations.push(
        ...noNamespaceSchemaLocation.trim().split(/\s+/).filter(Boolean),
      )
    }
  }

  return { schemaLocations, noNamespaceSchemaLocations }
}

export function parseCfdiXml(xml: string): ParsedCfdiXml {
  const lineStarts = getLineStarts(xml)
  const nodes: CfdiXmlNode[] = []
  const stack: CfdiXmlNode[] = []
  const schemaLocationAttributeNames = new Set<string>()
  let root: CfdiXmlNode | null = null
  let parseError: XmlParseError | null = null

  const doctypeIndex = xml.search(/<!DOCTYPE\b/i)
  if (doctypeIndex >= 0) {
    return {
      root: null,
      parseError: {
        message:
          'El XML contiene una declaración DOCTYPE, que no se admite en esta herramienta.',
        lineNumber: lineAtOffset(lineStarts, doctypeIndex),
        columnNumber:
          doctypeIndex -
          (lineStarts[lineAtOffset(lineStarts, doctypeIndex) - 1] ?? 0) +
          1,
      },
      schemaLocations: [],
      noNamespaceSchemaLocations: [],
      schemaLocationAttributeNames: [],
      nodes,
    }
  }

  const parser = new SaxesParser({ xmlns: true })

  parser.on('opentag', (tag: SaxTag) => {
    if (parseError) return

    const node: CfdiXmlNode = {
      name: tag.name,
      localName: tag.local,
      namespaceUri: tag.uri,
      startLine: lineAtOffset(lineStarts, tagLine(xml, parser)),
      endLine: null,
      attributes: Object.values(tag.attributes),
      parent: stack.at(-1) ?? null,
      children: [],
    }

    if (node.parent) node.parent.children.push(node)
    else root = node

    nodes.push(node)
    stack.push(node)
  })

  parser.on('closetag', () => {
    if (parseError) return

    const node = stack.pop()
    if (node) node.endLine = lineAtOffset(lineStarts, tagLine(xml, parser))
  })

  parser.on('error', (error: Error) => {
    if (parseError) return

    const lineNumber = Math.max(1, parser.line)
    parseError = {
      message: error.message,
      lineNumber,
      columnNumber: Math.max(1, parser.column),
    }
  })

  try {
    parser.write(xml).close()
  } catch (error) {
    if (!parseError) {
      parseError = {
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo interpretar el XML.',
        lineNumber: Math.max(1, parser.line),
        columnNumber: Math.max(1, parser.column),
      }
    }
  }

  if (parseError) {
    return {
      root,
      parseError,
      schemaLocations: [],
      noNamespaceSchemaLocations: [],
      schemaLocationAttributeNames: [...schemaLocationAttributeNames],
      nodes,
    }
  }

  const schemaInfo = getSchemaPairs(nodes, schemaLocationAttributeNames)
  return {
    root,
    parseError: null,
    ...schemaInfo,
    schemaLocationAttributeNames: [...schemaLocationAttributeNames],
    nodes,
  }
}

export function getXmlElementPath(
  nodes: CfdiXmlNode[],
  lineNumber: number | undefined,
  message: string,
): string[] {
  const elementMatch = /\bElement\s+'(?:\{([^}]+)\})?([^']+)'/i.exec(message)
  const targetNamespace = elementMatch?.[1]
  const targetName = elementMatch?.[2]?.split(':').at(-1)
  const attributeName = /\battribute\s+'([^']+)'/i.exec(message)?.[1]
  const candidates = nodes.filter(
    (node) =>
      lineNumber === undefined ||
      (node.startLine <= lineNumber &&
        (node.endLine === null || node.endLine >= lineNumber)),
  )
  const matchingCandidates = candidates.filter(
    (node) =>
      (!targetName || node.localName === targetName) &&
      (!targetNamespace || node.namespaceUri === targetNamespace),
  )

  let specificCandidates = matchingCandidates
  if (attributeName && /required but missing/i.test(message)) {
    const nodesMissingAttribute = specificCandidates.filter(
      (node) =>
        !node.attributes.some((attribute) => attribute.local === attributeName),
    )
    if (nodesMissingAttribute.length > 0) {
      specificCandidates = nodesMissingAttribute
    }
  } else if (attributeName) {
    const mentionedValues = [...message.matchAll(/'([^']+)'/g)]
      .map((match) => match[1]!)
      .filter(
        (value) =>
          value !== targetName &&
          value !== targetNamespace &&
          value !== attributeName,
      )
    const matchingValues = specificCandidates.filter((node) =>
      node.attributes.some(
        (attribute) =>
          attribute.local === attributeName &&
          mentionedValues.includes(attribute.value),
      ),
    )
    if (matchingValues.length > 0) specificCandidates = matchingValues
  }

  const depthOf = (node: CfdiXmlNode): number => {
    let depth = 0
    let current = node.parent
    while (current) {
      depth += 1
      current = current.parent
    }
    return depth
  }
  const sortByDepthAndLine = (left: CfdiXmlNode, right: CfdiXmlNode) =>
    depthOf(right) - depthOf(left) || right.startLine - left.startLine
  const target =
    [...specificCandidates].sort(sortByDepthAndLine)[0] ??
    [...candidates].sort(sortByDepthAndLine)[0]

  if (!target) return []

  const sameLineAmbiguity =
    specificCandidates.filter(
      (node) =>
        node.localName === target.localName &&
        node.namespaceUri === target.namespaceUri &&
        node.startLine === target.startLine &&
        node.endLine === target.endLine,
    ).length > 1
  const pathNodes: CfdiXmlNode[] = []
  let current: CfdiXmlNode | null = target
  while (current) {
    pathNodes.unshift(current)
    current = current.parent
  }

  const path = pathNodes.map((node) => {
    const sameNameSiblings =
      node.parent?.children.filter((sibling) => sibling.name === node.name) ??
      []
    const suffix =
      sameNameSiblings.length > 1
        ? node === target && sameLineAmbiguity
          ? '[?]'
          : `[${sameNameSiblings.indexOf(node) + 1}]`
        : ''

    return `${node.name}${suffix}`
  })

  if (attributeName) path.push(`@${attributeName}`)

  return path
}

export function getFriendlyXsdMessage(message: string): string {
  const missingAttribute =
    /\battribute\s+'([^']+)'\s+is required but missing/i.exec(message)
  if (missingAttribute?.[1]) {
    return `Falta el atributo obligatorio «${missingAttribute[1]}».`
  }

  const unexpectedElement = /\bElement\s+'(?:\{[^}]+\})?([^']+)'/i.exec(message)
  if (/not expected|not allowed in this context/i.test(message)) {
    return `El nodo «${unexpectedElement?.[1] ?? 'indicado'}» no está permitido en esta posición.`
  }

  if (/Missing child element|expected is/i.test(message)) {
    return 'Falta uno o más nodos requeridos, o no están en el orden esperado.'
  }

  if (/not a valid value|facet|pattern|atomic type/i.test(message)) {
    return 'El valor no cumple el formato o el tipo de dato definido por el XSD.'
  }

  if (/No matching global element declaration/i.test(message)) {
    return 'No se encontró un XSD disponible para validar este elemento.'
  }

  if (/attribute\s+'.+'\s+is not allowed/i.test(message)) {
    return 'El atributo no está permitido en este nodo.'
  }

  return 'El XML no cumple la estructura definida por el esquema XSD.'
}
