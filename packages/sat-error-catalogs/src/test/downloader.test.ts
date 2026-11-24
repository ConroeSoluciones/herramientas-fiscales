import assert from 'node:assert/strict'
import test from 'node:test'
import * as XLSX from '@e965/xlsx'
import { fetchCatalogs } from '../downloader.js'
import type { CatalogSource } from '../types.js'

const HEADERS = [
  'NÚM',
  'ELEMENTO',
  'ATRIBUTO',
  'VALIDACIÓN',
  'CÓDIGO ERROR',
  'DESCRIPCIÓN DE CÓDIGO DE ERROR',
]

function createExcel(): Uint8Array<ArrayBuffer> {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Matriz de errores'],
    HEADERS,
    [
      1,
      'Comprobante',
      'Version',
      'Debe ser 4.0',
      'CFDI40101',
      'Versión inválida',
    ],
  ])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Matriz')
  return new Uint8Array(
    XLSX.write(workbook, { type: 'array', bookType: 'xls' }),
  )
}

const source: CatalogSource = {
  clave: 'cfdi',
  nombre: 'Matriz de errores CFDI',
  url: 'https://www.sat.gob.mx/cfdi.xls',
}

function fakeFetcher(
  body: () => {
    ok: boolean
    status?: number
    statusText?: string
    data?: Uint8Array<ArrayBuffer>
  },
): typeof fetch {
  const fetcher = async (): Promise<Response> => {
    const result = body()
    if (!result.ok) {
      return new Response(null, {
        status: result.status ?? 500,
        statusText: result.statusText ?? 'Internal Server Error',
      })
    }
    return new Response(result.data ?? new Uint8Array(), { status: 200 })
  }
  return fetcher as typeof fetch
}

test('descarga y procesa un catálogo con un fetcher falso', async () => {
  const requests: Array<{ url: string; headers?: HeadersInit | undefined }> = []
  const fetcher: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), headers: init?.headers })
    return new Response(createExcel(), { status: 200 })
  }

  const catalogs = await fetchCatalogs([source], fetcher)

  assert.equal(catalogs.length, 1)
  const catalog = catalogs[0]
  assert.equal(catalog?.source.clave, 'cfdi')
  assert.equal(catalog?.rows.length, 1)
  assert.equal(catalog?.rows[0]?.codigoError, 'CFDI40101')
  assert.ok(catalog?.file instanceof Uint8Array)
  assert.equal(catalog?.file.length > 0, true)
  assert.equal(requests[0]?.url, source.url)
  assert.deepEqual(requests[0]?.headers, {
    'user-agent': 'cs-herramientas-sat-error-catalogs/1.0',
  })
})

test('lanza un error cuando la respuesta HTTP no es exitosa', async () => {
  await assert.rejects(
    fetchCatalogs(
      [source],
      fakeFetcher(() => ({ ok: false, status: 404, statusText: 'Not Found' })),
    ),
    /Falló la descarga de "cfdi" \(HTTP 404 Not Found\)\./,
  )
})

test('envuelve los errores de parseo del Excel', async () => {
  await assert.rejects(
    fetchCatalogs(
      [source],
      fakeFetcher(() => ({ ok: true, data: new Uint8Array([0, 1, 2, 3]) })),
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'No se pudo procesar el Excel de "cfdi".')
      assert.ok(error.cause instanceof Error)
      return true
    },
  )
})
