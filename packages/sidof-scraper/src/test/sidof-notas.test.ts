import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseSidofNotasResponse,
  SidofNotasSource,
} from '../scraper/sidof-notas.js'

test('parseSidofNotasResponse devuelve el identificador y la fecha normalizada', () => {
  assert.deepEqual(
    parseSidofNotasResponse({
      messageCode: 200,
      response: 'OK',
      totalRegistros: 1,
      Notas: [
        {
          codNota: 5803166,
          titulo: 'Tipo de cambio oficial',
          fecha: '06-11-2026',
        },
      ],
    }),
    [
      {
        codNota: 5803166,
        publicationDate: '2026-11-06',
        title: 'Tipo de cambio oficial',
      },
    ],
  )
})

test('parseSidofNotasResponse rechaza fechas imposibles', () => {
  assert.throws(
    () =>
      parseSidofNotasResponse({
        messageCode: 200,
        Notas: [{ codNota: 1, titulo: 'Nota', fecha: '31-02-2026' }],
      }),
    { message: 'SIDOF devolvió una fecha inválida: "31-02-2026".' },
  )
})

test('SidofNotasSource permite solicitar 60 avisos', async () => {
  let requestBody = ''
  const source = new SidofNotasSource(async (_input, init) => {
    requestBody = String(init?.body)
    return new Response(JSON.stringify({ messageCode: 200, Notas: [] }), {
      status: 200,
    })
  }, 60)

  await source.scrape()

  assert.equal(new URLSearchParams(requestBody).get('length'), '60')
})

test('SidofNotasSource permite solicitar una página desde un desplazamiento', async () => {
  let requestBody = ''
  const source = new SidofNotasSource(async (_input, init) => {
    requestBody = String(init?.body)
    return new Response(JSON.stringify({ messageCode: 200, Notas: [] }), {
      status: 200,
    })
  }, 60)

  await source.scrape(120)

  assert.equal(new URLSearchParams(requestBody).get('start'), '120')
  assert.equal(new URLSearchParams(requestBody).get('length'), '60')
})

test('SidofNotasSource rechaza desplazamientos inválidos', async () => {
  const source = new SidofNotasSource(async () => {
    throw new Error('No debe realizar una petición.')
  })

  await assert.rejects(source.scrape(-1), {
    message: 'El desplazamiento debe ser un entero no negativo.',
  })
})
