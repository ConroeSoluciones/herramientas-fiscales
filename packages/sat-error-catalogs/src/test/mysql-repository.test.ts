import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'mysql2/promise'
import { MysqlCatalogRepository } from '../mysql-repository.js'

test('ensureSchema amplía elemento y atributo existentes sin borrar la tabla', async () => {
  const statements: string[] = []
  const pool = {
    async execute(statement: string) {
      statements.push(statement)
      if (statement.includes('SELECT DATA_TYPE')) {
        return [[{ data_type: 'varchar' }], []]
      }
      if (statement.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return [[], []]
      }
      return [[], []]
    },
  } as unknown as Pool

  await new MysqlCatalogRepository(pool).ensureSchema()

  assert.ok(
    statements.some((statement) =>
      statement.includes('MODIFY COLUMN elemento TEXT NOT NULL'),
    ),
  )
  assert.ok(
    statements.some((statement) =>
      statement.includes('MODIFY COLUMN atributo TEXT NOT NULL'),
    ),
  )
  assert.ok(
    statements.some((statement) =>
      statement.includes('ADD COLUMN aclaraciones TEXT NULL'),
    ),
  )
})

test('listCatalogSummaries devuelve conteos y rangos de códigos', async () => {
  let query = ''
  const pool = {
    async execute(statement: string) {
      query = statement
      return [
        [
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
        ],
        [],
      ]
    },
  } as unknown as Pool

  const catalogs = await new MysqlCatalogRepository(pool).listCatalogSummaries()

  assert.match(query, /LEFT JOIN sat_catalogo_errores/)
  assert.match(query, /COUNT\(e\.id\)/)
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

test('searchCatalogErrors filtra por código y contenido de error', async () => {
  let query = ''
  let parameters: unknown[] = []
  const pool = {
    async execute(statement: string, values: unknown[] = []) {
      if (statement.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return [[{ column_name: 'aclaraciones' }], []]
      }
      query = statement
      parameters = values
      return [
        [
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
        ],
        [],
      ]
    },
  } as unknown as Pool

  const errors = await new MysqlCatalogRepository(pool).searchCatalogErrors(
    'cfdi_v40',
    'CFDI40101',
  )

  assert.match(query, /e\.codigo_error LIKE \?/)
  assert.match(query, /e\.descripcion_codigo_error LIKE \?/)
  assert.deepEqual(parameters, [
    'cfdi_v40',
    '%CFDI40101%',
    '%CFDI40101%',
    '%CFDI40101%',
    '%CFDI40101%',
    '%CFDI40101%',
    '%CFDI40101%',
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
