import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseSidofTipoCambio,
  SIDOF_TIPO_CAMBIO_URL,
  SidofTipoCambioSource,
} from '../scraper/sidof-tipo-cambio.js'
import { SIDOF_CARGA_NOTAS_URL } from '../scraper/sidof-notas.js'

const sidofPage = `
  <div id="indicators-container">
    <div class="indicator-title">
      <span class="txt-traduct">Tipo de cambio y tasas de interés interbancarias al</span>
      <span class="txt-traduct">06 de noviembre de 2026</span>
    </div>
    <div class="indicator"><b>DÓLAR</b> 18.7147</div>
    <div class="indicator"><b>UDIS</b> 8.888577</div>
  </div>
`

test('parseSidofTipoCambio extrae el valor del dólar y su fecha', () => {
  assert.deepEqual(parseSidofTipoCambio(sidofPage), [
    {
      externalId: 'usd-mxn-2026-11-06',
      data: {
        instrument: 'USD/MXN',
        currency: 'USD',
        quoteCurrency: 'MXN',
        pesosPerDollar: 18.7147,
        rateDate: '2026-11-06',
        sourceUrl: SIDOF_TIPO_CAMBIO_URL,
      },
    },
  ])
})

test('parseSidofTipoCambio falla con una respuesta inesperada', () => {
  assert.throws(
    () => parseSidofTipoCambio('<html><body>Sin indicadores</body></html>'),
    {
      message: 'SIDOF no devolvió el bloque de indicadores esperado.',
    },
  )
})

test('SidofTipoCambioSource consulta avisos y luego sus páginas de detalle', async () => {
  const calls: { url: string; init: RequestInit | undefined }[] = []
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init })
    if (calls.length === 1) {
      return new Response(
        JSON.stringify({
          messageCode: 200,
          response: 'OK',
          totalRegistros: 1,
          Notas: [
            {
              codNota: 5803166,
              titulo: 'Tipo de cambio oficial',
              fecha: '06-11-2026',
              codDiario: 330665,
              estado: 0,
              paginaHasta: 0,
              codOrgaUno: 'ORGANISMOS AUTONOMOS',
              codOrgaDos: 'BANCO DE MEXICO',
            },
          ],
        }),
        { status: 200 },
      )
    }

    return new Response(
      sidofPage.replace(
        '</div>\n  </div>',
        '</div>\n  </div>\n  <h2 id="tituloNota">Tipo de cambio oficial</h2>',
      ),
      { status: 200 },
    )
  }
  const source = new SidofTipoCambioSource(fetcher)

  const items = await source.scrape()

  assert.deepEqual(
    calls.map(({ url }) => url),
    [SIDOF_CARGA_NOTAS_URL, 'https://sidof.segob.gob.mx/notas/5803166'],
  )
  assert.equal(calls[0]?.init?.method, 'POST')
  assert.equal(
    calls[0]?.init?.headers &&
      new Headers(calls[0].init.headers).get('referer'),
    SIDOF_TIPO_CAMBIO_URL,
  )
  const requestBody = calls[0]?.init?.body
  assert.ok(typeof requestBody === 'string')
  const form = new URLSearchParams(requestBody)
  assert.equal(form.get('dato'), 'tipo%20de%20cambio')
  assert.equal(form.get('length'), '10')
  assert.equal(calls[1]?.init?.method, undefined)
  assert.deepEqual(items, [
    {
      externalId: 'sidof-nota-5803166',
      data: {
        instrument: 'USD/MXN',
        currency: 'USD',
        quoteCurrency: 'MXN',
        pesosPerDollar: 18.7147,
        rateDate: '2026-11-06',
        sourceUrl: 'https://sidof.segob.gob.mx/notas/5803166',
        codNota: 5803166,
        title: 'Tipo de cambio oficial',
        publicationDate: '2026-11-06',
        searchUrl: SIDOF_TIPO_CAMBIO_URL,
      },
    },
  ])
})
