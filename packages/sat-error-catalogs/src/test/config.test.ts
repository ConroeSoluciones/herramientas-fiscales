import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCatalogSources } from '../config.js'

const validSource = {
  clave: 'cfdi',
  nombre: 'Matriz de errores CFDI',
  url: 'https://www.sat.gob.mx/cfdi.xls',
}

test('acepta una configuración válida y normaliza el nombre y la URL', () => {
  const sources = parseCatalogSources({
    downloadDirectory: './descargas',
    catalogos: [
      { ...validSource, url: 'https://www.sat.gob.mx/otra/ruta.xls' },
    ],
  })
  assert.deepEqual(sources, [
    {
      clave: 'cfdi',
      nombre: 'Matriz de errores CFDI',
      url: 'https://www.sat.gob.mx/otra/ruta.xls',
    },
  ])
})

test('rechaza claves duplicadas', () => {
  assert.throws(
    () =>
      parseCatalogSources({
        catalogos: [validSource, { ...validSource, nombre: 'Otro' }],
      }),
    /La clave "cfdi" está repetida en la configuración\./,
  )
})

test('rechaza URLs que no sean HTTP o HTTPS', () => {
  assert.throws(
    () =>
      parseCatalogSources({
        catalogos: [{ ...validSource, url: 'ftp://sat.gob.mx/cfdi.xls' }],
      }),
    /La URL del catálogo "cfdi" debe usar HTTP o HTTPS\./,
  )
})

test('rechaza URLs mal formadas', () => {
  assert.throws(
    () =>
      parseCatalogSources({
        catalogos: [{ ...validSource, url: 'no es una url' }],
      }),
    /La URL del catálogo "cfdi" no es válida\./,
  )
})

test('ignora claves extra del JSON como downloadDirectory', () => {
  const sources = parseCatalogSources({
    downloadDirectory: 42,
    otroCampo: true,
    catalogos: [validSource],
  })
  assert.equal(sources.length, 1)
  assert.equal(sources[0]?.clave, 'cfdi')
})

test('rechaza configuraciones que no incluyan catálogos', () => {
  assert.throws(
    () => parseCatalogSources({ catalogos: [] }),
    /La configuración debe incluir al menos un catálogo\./,
  )
})
