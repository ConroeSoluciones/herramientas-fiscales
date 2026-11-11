import { load } from 'cheerio'
import type { ScrapedItem } from '../domain/scraped-item.js'
import { SIDOF_TIPO_CAMBIO_URL } from './sidof-notas.js'

const SPANISH_MONTHS: Readonly<Record<string, string>> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
}

/** Extrae el indicador DÓLAR y la fecha del bloque de indicadores de una nota SIDOF. */
export function parseSidofTipoCambio(html: string): readonly ScrapedItem[] {
  const $ = load(html)
  const indicators = $('#indicators-container')

  if (indicators.length === 0) {
    throw new Error('SIDOF no devolvió el bloque de indicadores esperado.')
  }

  const dateText = indicators
    .find('.indicator-title .txt-traduct')
    .eq(1)
    .text()
    .replace(/\s+/g, ' ')
    .trim()
  const rateDate = parseSidofDate(dateText)

  const dollarIndicator = indicators
    .find('.indicator')
    .toArray()
    .find((element) => {
      const label = $(element).find('b').first().text().trim()
      return label.toLocaleUpperCase('es-MX') === 'DÓLAR'
    })

  if (!dollarIndicator) {
    throw new Error(
      'No se encontró el indicador DÓLAR en la respuesta de SIDOF.',
    )
  }

  const label = $(dollarIndicator).find('b').first().text().trim()
  const text = $(dollarIndicator).text().replace(/\s+/g, ' ').trim()
  const match = text
    .slice(label.length)
    .trim()
    .match(/^(\d+(?:,\d{3})*(?:\.\d+)?)/)

  if (!match) {
    throw new Error(
      'No se pudo interpretar el valor del dólar publicado por SIDOF.',
    )
  }

  const amountText = match[1]
  if (!amountText) {
    throw new Error(
      'No se pudo interpretar el valor del dólar publicado por SIDOF.',
    )
  }

  const pesosPerDollar = Number(amountText.replaceAll(',', ''))
  if (!Number.isFinite(pesosPerDollar) || pesosPerDollar <= 0) {
    throw new Error('SIDOF devolvió un tipo de cambio inválido.')
  }

  return [
    {
      externalId: `usd-mxn-${rateDate}`,
      data: {
        instrument: 'USD/MXN',
        currency: 'USD',
        quoteCurrency: 'MXN',
        pesosPerDollar,
        rateDate,
        sourceUrl: SIDOF_TIPO_CAMBIO_URL,
      },
    },
  ]
}

function parseSidofDate(dateText: string): string {
  const match = dateText.match(/^(\d{1,2}) de ([\p{L}]+) de (\d{4})$/iu)
  if (!match) {
    throw new Error(`No se pudo interpretar la fecha de SIDOF: "${dateText}".`)
  }

  const [, dayText, monthText, yearText] = match
  if (!dayText || !monthText || !yearText) {
    throw new Error(`La fecha publicada por SIDOF no es válida: "${dateText}".`)
  }

  const month = SPANISH_MONTHS[monthText.toLocaleLowerCase('es-MX')]
  if (!month) {
    throw new Error(`La fecha publicada por SIDOF no es válida: "${dateText}".`)
  }

  const day = dayText.padStart(2, '0')
  const year = Number(yearText)
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  const parsed = new Date(Date.UTC(year, monthNumber - 1, dayNumber))

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthNumber - 1 ||
    parsed.getUTCDate() !== dayNumber
  ) {
    throw new Error(`La fecha publicada por SIDOF no es válida: "${dateText}".`)
  }

  return `${yearText}-${month}-${day}`
}
