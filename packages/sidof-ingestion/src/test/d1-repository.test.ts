import assert from 'node:assert/strict'
import test from 'node:test'
import type { D1Database, D1Value } from '@cs-herramientas/d1-client'
import { D1TipoCambioRepository } from '../d1-repository.js'

const storedRow = {
  cod_nota: 5803166,
  fecha_publicacion: '2026-11-06',
  fecha_tipo_cambio: '2026-11-06',
  usd_mxn: '18.7147',
  titulo: 'Tipo de cambio oficial',
  url_fuente: 'https://sidof.segob.gob.mx/notas/5803166',
}

test('findPenultimateByPublicationDate selects the second row by publication date', async () => {
  let query = ''
  const database = {
    prepare(statement: string) {
      query = statement
      return {
        bind() {
          return this
        },
        async first() {
          return storedRow
        },
      }
    },
  } as unknown as D1Database

  const record = await new D1TipoCambioRepository(
    database,
  ).findPenultimateByPublicationDate()

  assert.match(query, /ORDER BY fecha_publicacion DESC/)
  assert.match(query, /LIMIT 1 OFFSET 1/)
  assert.deepEqual(record, {
    codNota: 5803166,
    publicationDate: '2026-11-06',
    rateDate: '2026-11-06',
    pesosPerDollar: 18.7147,
    title: 'Tipo de cambio oficial',
    sourceUrl: 'https://sidof.segob.gob.mx/notas/5803166',
  })
})

test('findByRateDateRange binds the requested dates and maps the rows', async () => {
  let query = ''
  let parameters: D1Value[] = []
  const database = {
    prepare(statement: string) {
      query = statement
      return {
        bind(...values: D1Value[]) {
          parameters = values
          return this
        },
        async all() {
          return {
            success: true,
            results: [storedRow],
            meta: { changes: 0, last_row_id: 0 },
          }
        },
      }
    },
  } as unknown as D1Database

  const records = await new D1TipoCambioRepository(
    database,
  ).findByRateDateRange('2026-11-01', '2026-11-30')

  assert.match(
    query,
    /WHERE fecha_tipo_cambio >= \? AND fecha_tipo_cambio <= \?/,
  )
  assert.match(query, /ORDER BY fecha_tipo_cambio DESC/)
  assert.deepEqual(parameters, ['2026-11-01', '2026-11-30'])
  assert.equal(records[0]?.rateDate, '2026-11-06')
  assert.equal(records[0]?.pesosPerDollar, 18.7147)
})

test('insertIfAbsent batches inserts with D1-compatible bound parameters', async () => {
  let query = ''
  let parameters: D1Value[] = []
  const database = {
    prepare(statement: string) {
      query = statement
      return {
        bind(...values: D1Value[]) {
          parameters = values
          return this
        },
      }
    },
    async batch(statements: Array<{ query: string; parameters: D1Value[] }>) {
      return statements.map(() => ({
        success: true,
        results: [],
        meta: { changes: 1, last_row_id: 5803166 },
      }))
    },
  } as unknown as D1Database

  const inserted = await new D1TipoCambioRepository(database).insertIfAbsent([
    {
      codNota: 5803166,
      publicationDate: '2026-11-06',
      rateDate: '2026-11-06',
      pesosPerDollar: 18.7147,
      title: 'Tipo de cambio oficial',
      sourceUrl: 'https://sidof.segob.gob.mx/notas/5803166',
    },
  ])

  assert.match(query, /INSERT OR IGNORE INTO sidof_tipo_cambio/)
  assert.deepEqual(parameters, [
    5803166,
    '2026-11-06',
    '2026-11-06',
    '18.7147',
    'Tipo de cambio oficial',
    'https://sidof.segob.gob.mx/notas/5803166',
  ])
  assert.equal(inserted, 1)
})
