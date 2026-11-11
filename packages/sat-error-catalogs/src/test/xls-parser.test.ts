import assert from 'node:assert/strict'
import test from 'node:test'
import * as XLSX from '@e965/xlsx'
import { parseErrorCatalog } from '../xls-parser.js'

const HEADERS = [
  'NÚM',
  'ELEMENTO',
  'ATRIBUTO',
  'VALIDACIÓN',
  'CÓDIGO ERROR',
  'DESCRIPCIÓN DE CÓDIGO DE ERROR',
]

function createExcel(
  rows: unknown[][],
  headers = HEADERS,
  bookType: 'xls' | 'xlsx' = 'xls',
): Buffer {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Matriz de errores'],
    headers,
    ...rows,
  ])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Matriz')
  return XLSX.write(workbook, { type: 'buffer', bookType }) as Buffer
}

test('lee los datos debajo de encabezados ubicados en la segunda fila', () => {
  const rows = parseErrorCatalog(
    createExcel([
      [
        1,
        'Comprobante',
        'Version',
        'Debe ser 4.0',
        'CFDI40101',
        'Versión inválida',
      ],
    ]),
  )

  assert.deepEqual(rows, [
    {
      num: '1',
      elemento: 'Comprobante',
      atributo: 'Version',
      validacion: 'Debe ser 4.0',
      codigoError: 'CFDI40101',
      descripcionCodigoError: 'Versión inválida',
      aclaraciones: '',
    },
  ])
})

test('acepta los encabezados alternos de la matriz de Retenciones', () => {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Matriz de errores'],
    [
      'NUM',
      'ELEMENTO',
      'ATRIBUTO',
      'CASO DE VALIDACIÓN',
      'CÓDIGO ERROR',
      'DESCRIPCIÓN DE CÓDIGO DE ERROR',
    ],
    [
      1,
      'Retenciones',
      'Sello',
      'Validación de sello',
      'Reten20101',
      'Error de sello',
    ],
  ])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Matriz')
  const file = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xls',
  }) as Buffer

  assert.equal(parseErrorCatalog(file)[0]?.validacion, 'Validación de sello')
})

test('conserva atributos mayores a 255 caracteres', () => {
  const atributo = 'Complemento:Campo'.repeat(40)
  const rows = parseErrorCatalog(
    createExcel(
      [[1, 'Complemento', atributo, 'Validación', 'LONG001', 'Descripción']],
      HEADERS,
      'xlsx',
    ),
  )

  assert.equal(rows[0]?.atributo.length, atributo.length)
})

test('lee CCP, CCE, CRP y SPT con sus variantes de encabezado', () => {
  const errorHeaders = [
    'NUM',
    'ELEMENTO',
    'ATRIBUTO',
    'CASO DE VALIDACIÓN',
    'CÓDIGO ERROR',
    'ERROR',
    'ACLARACIONES',
  ]
  const catalogs = [
    { code: 'CP101', headers: errorHeaders },
    { code: 'CCE101', headers: errorHeaders },
    { code: 'CRP20101', headers: HEADERS },
    { code: 'SPT102', headers: errorHeaders },
  ]

  for (const { code, headers } of catalogs) {
    const rows = parseErrorCatalog(
      createExcel(
        [
          ['Errores para el complemento', '', '', '', '', '', ''],
          [
            1,
            'CFDI',
            'Version',
            'El valor registrado debe ser 4.0.',
            code,
            'Versión inválida.',
            '',
          ],
        ],
        headers,
      ),
    )

    assert.equal(rows.length, 1)
    assert.equal(rows[0]?.codigoError, code)
    assert.equal(rows[0]?.descripcionCodigoError, 'Versión inválida.')
  }
})

test('adapta la matriz de Nómina sin columnas ELEMENTO y ATRIBUTO', () => {
  const rows = parseErrorCatalog(
    createExcel(
      [
        ['Sección de errores de Nómina', '', '', '', ''],
        [
          1,
          'En el atributo Comprobante.Moneda se debe registrar MXN.',
          'NOM1',
          'El atributo Comprobante.Moneda no tiene el valor MXN.',
          'Se debe registrar el valor sin decimales.',
        ],
      ],
      [
        'Núm.',
        'Regla de validación',
        'Código de error',
        'Descripción del error',
        'Aclaraciones',
      ],
    ),
  )

  assert.deepEqual(rows, [
    {
      num: '1',
      elemento: '',
      atributo: '',
      validacion: 'En el atributo Comprobante.Moneda se debe registrar MXN.',
      codigoError: 'NOM1',
      descripcionCodigoError:
        'El atributo Comprobante.Moneda no tiene el valor MXN.',
      aclaraciones: 'Se debe registrar el valor sin decimales.',
    },
  ])
})

test('rechaza hojas sin todos los encabezados requeridos', () => {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([['Título'], ['Num', 'codigo_error']])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Matriz')
  const file = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xls',
  }) as Buffer

  assert.throws(() => parseErrorCatalog(file), /Faltan encabezados requeridos/)
})
