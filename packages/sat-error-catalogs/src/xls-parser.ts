import * as XLSX from '@e965/xlsx'
import type { CatalogErrorRow } from './types.js'

const HEADER_COLUMNS = [
  { column: 'num', aliases: ['num'], required: true },
  { column: 'elemento', aliases: ['elemento'], required: false },
  { column: 'atributo', aliases: ['atributo'], required: false },
  {
    column: 'validacion',
    aliases: ['validacion', 'casodevalidacion', 'regladevalidacion'],
    required: false,
  },
  {
    column: 'codigo_error',
    aliases: ['codigoerror', 'codigodeerror'],
    required: true,
  },
  {
    column: 'descripcion_codigo_error',
    aliases: [
      'descripcioncodigoerror',
      'descripciondecodigodeerror',
      'descripciondelerror',
      'error',
    ],
    required: true,
  },
  { column: 'aclaraciones', aliases: ['aclaraciones'], required: false },
] as const

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function cellText(value: unknown): string {
  return String(value ?? '').trim()
}

export function parseErrorCatalog(file: Buffer): CatalogErrorRow[] {
  const workbook = XLSX.read(file, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('El archivo Excel no contiene hojas.')

  const sheet = workbook.Sheets[firstSheetName]
  if (!sheet)
    throw new Error('No se pudo leer la primera hoja del archivo Excel.')

  // La matriz del SAT coloca los encabezados en la segunda fila (índice 1).
  const [headerRow, ...dataRows] = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    range: 1,
    raw: false,
    defval: '',
    blankrows: false,
  })
  if (!headerRow)
    throw new Error('No se encontraron encabezados en la fila 2 del Excel.')

  const headerIndexes = new Map(
    headerRow.map((value, index) => [normalizeHeader(value), index]),
  )
  const missingHeaders = HEADER_COLUMNS.filter(
    ({ aliases, required }) =>
      required && !aliases.some((alias) => headerIndexes.has(alias)),
  ).map(({ column }) => column)
  if (missingHeaders.length > 0) {
    throw new Error(
      `Faltan encabezados requeridos en la fila 2: ${missingHeaders.join(', ')}.`,
    )
  }

  return dataRows.flatMap((row) => {
    const values = HEADER_COLUMNS.map(({ aliases }) => {
      const alias = aliases.find((header) => headerIndexes.has(header))
      return cellText(row[alias ? (headerIndexes.get(alias) ?? -1) : -1])
    })
    if (values.every((value) => value === '') || !values[4]) return []

    const [
      num,
      elemento,
      atributo,
      validacion,
      codigoError,
      descripcionCodigoError,
      aclaraciones,
    ] = values
    return [
      {
        num: num ?? '',
        elemento: elemento ?? '',
        atributo: atributo ?? '',
        validacion: validacion ?? '',
        codigoError: codigoError ?? '',
        descripcionCodigoError: descripcionCodigoError ?? '',
        aclaraciones: aclaraciones ?? '',
      },
    ]
  })
}
