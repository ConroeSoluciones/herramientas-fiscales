import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'mysql2/promise'
import { MysqlTipoCambioRepository } from '../mysql-repository.js'

test('findPenultimateByPublicationDate selects the second row by publication date', async () => {
  let query = ''
  const pool = {
    async execute(statement: string) {
      query = statement
      return [
        [
          {
            cod_nota: 5803166,
            fecha_publicacion: '2026-11-06',
            fecha_tipo_cambio: '2026-11-06',
            usd_mxn: '18.7147',
            titulo: 'Tipo de cambio oficial',
            url_fuente: 'https://sidof.segob.gob.mx/notas/5803166',
          },
        ],
        [],
      ]
    },
  } as unknown as Pool

  const record = await new MysqlTipoCambioRepository(
    pool,
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

test('findByRateDateRange returns rates within the requested dates', async () => {
  let query = ''
  let parameters: unknown[] = []
  const pool = {
    async execute(statement: string, values: unknown[]) {
      query = statement
      parameters = values
      return [
        [
          {
            cod_nota: 5803166,
            fecha_publicacion: '2026-11-06',
            fecha_tipo_cambio: '2026-11-06',
            usd_mxn: '18.7147',
            titulo: 'Tipo de cambio oficial',
            url_fuente: 'https://sidof.segob.gob.mx/notas/5803166',
          },
        ],
        [],
      ]
    },
  } as unknown as Pool

  const records = await new MysqlTipoCambioRepository(pool).findByRateDateRange(
    '2026-11-01',
    '2026-11-30',
  )

  assert.match(
    query,
    /WHERE fecha_tipo_cambio >= \? AND fecha_tipo_cambio <= \?/,
  )
  assert.match(query, /ORDER BY fecha_tipo_cambio DESC/)
  assert.deepEqual(parameters, ['2026-11-01', '2026-11-30'])
  assert.equal(records[0]?.rateDate, '2026-11-06')
  assert.equal(records[0]?.pesosPerDollar, 18.7147)
})
