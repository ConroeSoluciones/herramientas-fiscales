import { load } from 'cheerio'
import type { ScrapedItem } from '../domain/scraped-item.js'
import { parseSidofTipoCambio } from './sidof-indicator-parser.js'
import { SIDOF_TIPO_CAMBIO_URL } from './sidof-notas.js'
import type { SidofNotaReference } from './sidof-notas.js'

const SIDOF_ORIGIN = 'https://sidof.segob.gob.mx'

export function parseSidofNotaDetalle(
  html: string,
  note: SidofNotaReference,
): ScrapedItem {
  const indicators = parseSidofTipoCambio(html)[0]
  if (!indicators) {
    throw new Error(
      `No se encontró el tipo de cambio para la nota ${note.codNota}.`,
    )
  }

  const detailDate = indicators.data.rateDate
  if (detailDate !== note.publicationDate) {
    throw new Error(
      `La fecha de la nota ${note.codNota} no coincide con sus indicadores de SIDOF.`,
    )
  }

  const noteUrl = `${SIDOF_ORIGIN}/notas/${note.codNota}`
  const $ = load(html)
  const title =
    $('#tituloNota').text().replace(/\s+/g, ' ').trim() || note.title

  return {
    externalId: `sidof-nota-${note.codNota}`,
    data: {
      ...indicators.data,
      codNota: note.codNota,
      title,
      publicationDate: note.publicationDate,
      sourceUrl: noteUrl,
      searchUrl: SIDOF_TIPO_CAMBIO_URL,
    },
  }
}

export class SidofNotaDetailSource {
  private readonly fetchPage: typeof fetch

  constructor(fetchPage: typeof fetch = fetch) {
    // Mismo motivo que en `SidofNotasSource`: evitar invocar `fetch` como método.
    this.fetchPage = (input, init) => fetchPage(input, init)
  }

  async scrape(note: SidofNotaReference): Promise<ScrapedItem> {
    const noteUrl = `${SIDOF_ORIGIN}/notas/${note.codNota}`
    const response = await this.fetchPage(noteUrl, {
      headers: {
        accept: 'text/html',
        referer: SIDOF_TIPO_CAMBIO_URL,
        'user-agent': 'cs-herramientas/0.1.0 (scraper)',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      throw new Error(
        `La consulta de la nota SIDOF ${note.codNota} falló: HTTP ${response.status} ${response.statusText}.`,
      )
    }

    return parseSidofNotaDetalle(await response.text(), note)
  }
}
