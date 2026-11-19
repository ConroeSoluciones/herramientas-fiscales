import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  D1Database,
  D1PreparedStatement,
  D1Result,
  D1Value,
} from '@cs-herramientas/d1-client'
import { D1CatalogRepository } from '../d1-repository.js'

interface CapturedQuery {
  query: string
  values: D1Value[]
}

function makeDatabase(
  handler: (query: CapturedQuery) => Record<string, unknown>[] = () => [],
) {
  const queries: CapturedQuery[] = []
  const batches: CapturedQuery[][] = []
  const database = {
    prepare(query: string) {
      const captured = { query, values: [] as D1Value[] }
      const statement = {
        query,
        values: captured.values,
        bind(...values: D1Value[]) {
          captured.values = values
          statement.values = values
          return statement
        },
        async all<T>() {
          queries.push(captured)
          return {
            success: true,
            results: handler(captured) as T[],
            meta: { changes: 0, last_row_id: 0 },
          }
        },
        async first<T>() {
          queries.push(captured)
          return (handler(captured)[0] as T | undefined) ?? null
        },
        async run() {
          queries.push(captured)
          return {
            success: true,
            results: [],
            meta: { changes: 0, last_row_id: 0 },
          }
        },
      }
      return statement
    },
    async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
      const captured = statements.map((statement) => {
        const prepared = statement as unknown as {
          query: string
          values: D1Value[]
        }
        return { query: prepared.query, values: prepared.values }
      })
      batches.push(captured)
      return captured.map(() => ({
        success: true,
        results: [],
        meta: { changes: 1, last_row_id: 1 },
      }))
    },
  }

  return {
    database: database as unknown as D1Database,
    queries,
    batches,
  }
}

test('listCatalogSummaries returns aggregate counts and code ranges', async () => {
  const { database, queries } = makeDatabase(() => [
    {
      id: 1,
      clave: 'cfdi_v40',
      nombre: 'Matriz de errores CFDI 4.0',
      url_fuente: 'https://sat.example/cfdi.xls',
      actualizado_en: '2026-11-09 12:00:00',
      total_errores: 105,
      primer_codigo: 'CFDI101',
      ultimo_codigo: 'CFDI999',
    },
  ])

  const catalogs = await new D1CatalogRepository(
    database,
  ).listCatalogSummaries()

  assert.match(queries[0]!.query, /LEFT JOIN sat_catalogo_errores/)
  assert.match(queries[0]!.query, /COUNT\(e\.id\)/)
  assert.deepEqual(catalogs, [
    {
      id: 1,
      clave: 'cfdi_v40',
      nombre: 'Matriz de errores CFDI 4.0',
      urlFuente: 'https://sat.example/cfdi.xls',
      actualizadoEn: '2026-11-09 12:00:00',
      totalErrores: 105,
      primerCodigo: 'CFDI101',
      ultimoCodigo: 'CFDI999',
    },
  ])
})

test('searchCatalogErrors searches all public error fields', async () => {
  const { database, queries } = makeDatabase(() => [
    {
      id: 42,
      num: '42',
      elemento: 'CFDI',
      atributo: 'Version',
      validacion: 'Debe ser 4.0',
      codigo_error: 'CFDI40101',
      descripcion_codigo_error: 'Versión inválida',
      aclaraciones: 'Validar versión',
    },
  ])

  const errors = await new D1CatalogRepository(database).searchCatalogErrors(
    'cfdi_v40',
    'CFDI40101',
  )

  assert.match(
    queries[0]!.query,
    /instr\(lower\(e\.codigo_error\), lower\(\?\)\) > 0/,
  )
  assert.match(
    queries[0]!.query,
    /instr\(lower\(e\.descripcion_codigo_error\), lower\(\?\)\) > 0/,
  )
  assert.deepEqual(queries[0]!.values, [
    'cfdi_v40',
    'CFDI40101',
    'CFDI40101',
    'CFDI40101',
    'CFDI40101',
    'CFDI40101',
    'CFDI40101',
  ])
  assert.deepEqual(errors, [
    {
      id: 42,
      num: '42',
      elemento: 'CFDI',
      atributo: 'Version',
      validacion: 'Debe ser 4.0',
      codigoError: 'CFDI40101',
      descripcionCodigoError: 'Versión inválida',
      aclaraciones: 'Validar versión',
    },
  ])
})

test('searchErrorsAcrossCatalogs treats the query as a literal code prefix', async () => {
  const { database, queries } = makeDatabase()

  await new D1CatalogRepository(database).searchErrorsAcrossCatalogs('CFDI401')

  assert.match(
    queries[0]!.query,
    /WHERE substr\(e\.codigo_error, 1, length\(\?\)\) = \? COLLATE NOCASE/,
  )
  assert.match(
    queries[0]!.query,
    /ORDER BY CASE WHEN e\.codigo_error = \? COLLATE NOCASE THEN 0/,
  )
  assert.match(queries[0]!.query, /LIMIT 51/)
  assert.deepEqual(queries[0]!.values, ['CFDI401', 'CFDI401', 'CFDI401'])
})

test('replaceCatalogs transactionally replaces rows and respects D1 parameter limits', async () => {
  const { database, batches } = makeDatabase()
  const rows = Array.from({ length: 25 }, (_, index) => ({
    num: String(index + 1),
    elemento: 'CFDI',
    atributo: 'Version',
    validacion: 'Debe ser 4.0',
    codigoError: `CFDI${String(index + 1).padStart(3, '0')}`,
    descripcionCodigoError: 'Error de prueba',
    aclaraciones: '',
  }))

  const imported = await new D1CatalogRepository(database).replaceCatalogs([
    {
      source: {
        clave: 'cfdi_v40',
        nombre: 'CFDI 4.0',
        url: 'https://sat.example/cfdi.xls',
      },
      rows,
      file: Buffer.from(''),
    },
  ])

  assert.equal(imported, 25)
  assert.equal(batches.length, 1)
  assert.match(batches[0]![0]!.query, /ON CONFLICT\(clave\) DO UPDATE/)
  assert.match(batches[0]![1]!.query, /DELETE FROM sat_catalogo_errores/)
  assert.ok(batches[0]!.slice(2).every((query) => query.values.length <= 100))
})
