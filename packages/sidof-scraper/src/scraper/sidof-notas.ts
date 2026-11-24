export const SIDOF_TIPO_CAMBIO_URL =
  'https://sidof.segob.gob.mx/busqueda/tipo%20de%20cambio'
export const SIDOF_CARGA_NOTAS_URL =
  'https://sidof.segob.gob.mx/busqueda/cargaNotas/'

const SIDOF_ORIGIN = 'https://sidof.segob.gob.mx'
export const DEFAULT_SIDOF_PAGE_SIZE = 10

export interface SidofNotaReference {
  readonly codNota: number
  readonly publicationDate: string
  readonly title: string
}

/** Interpreta la respuesta JSON del endpoint usado por la tabla de búsqueda de SIDOF. */
export function parseSidofNotasResponse(
  payload: unknown,
): readonly SidofNotaReference[] {
  if (
    !isRecord(payload) ||
    payload.messageCode !== 200 ||
    !Array.isArray(payload.Notas)
  ) {
    throw new Error('SIDOF devolvió una respuesta de búsqueda inválida.')
  }

  return payload.Notas.map((note: unknown, index: number) => {
    if (
      !isRecord(note) ||
      !Number.isSafeInteger(note.codNota) ||
      typeof note.fecha !== 'string' ||
      typeof note.titulo !== 'string'
    ) {
      throw new Error(
        `SIDOF devolvió datos inválidos para la nota ${index + 1}.`,
      )
    }

    return {
      codNota: note.codNota as number,
      publicationDate: parseSidofPublicationDate(note.fecha),
      title: note.titulo,
    }
  })
}

export class SidofNotasSource {
  private readonly fetchRequest: typeof fetch
  private readonly pageSize: number

  constructor(
    fetchRequest: typeof fetch = fetch,
    pageSize = DEFAULT_SIDOF_PAGE_SIZE,
  ) {
    // workerd lanza "Illegal invocation" si `fetch` se invoca como método
    // (`this.fetchRequest(...)`); se envuelve para que `this` quede indefinido.
    this.fetchRequest = (input, init) => fetchRequest(input, init)
    this.pageSize = pageSize
    if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
      throw new RangeError('El tamaño de página debe ser un entero positivo.')
    }
  }

  async scrape(start = 0): Promise<readonly SidofNotaReference[]> {
    if (!Number.isSafeInteger(start) || start < 0) {
      throw new RangeError('El desplazamiento debe ser un entero no negativo.')
    }

    const response = await this.fetchRequest(SIDOF_CARGA_NOTAS_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'es-419,es;q=0.8',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        origin: SIDOF_ORIGIN,
        referer: SIDOF_TIPO_CAMBIO_URL,
        'x-requested-with': 'XMLHttpRequest',
        'user-agent': 'cs-herramientas/0.1.0 (scraper)',
      },
      body: createSearchForm(this.pageSize, start).toString(),
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      throw new Error(
        `La consulta de notas SIDOF falló: HTTP ${response.status} ${response.statusText}.`,
      )
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new Error(
        'SIDOF devolvió una respuesta JSON inválida al buscar notas.',
      )
    }

    return parseSidofNotasResponse(payload)
  }
}

function createSearchForm(pageSize: number, start: number): URLSearchParams {
  const form = new URLSearchParams()
  form.set('draw', '1')

  const columns = ['fecha', 'titulo', 'codOrgaUno', 'codOrgaDos']
  columns.forEach((column, index) => {
    form.set(`columns[${index}][data]`, column)
    form.set(`columns[${index}][name]`, '')
    form.set(`columns[${index}][searchable]`, 'true')
    form.set(`columns[${index}][orderable]`, 'true')
    form.set(`columns[${index}][search][value]`, '')
    form.set(`columns[${index}][search][regex]`, 'false')
  })

  form.set('order[0][column]', '0')
  form.set('order[0][dir]', 'desc')
  form.set('start', String(start))
  form.set('length', String(pageSize))
  form.set('search[value]', '')
  form.set('search[regex]', 'false')
  // SIDOF decodes this value once more on the server.
  form.set('dato', 'tipo%20de%20cambio')
  return form
}

function parseSidofPublicationDate(dateText: string): string {
  const match = dateText.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) {
    throw new Error(`SIDOF devolvió una fecha inválida: "${dateText}".`)
  }

  const [, dayText, monthText, yearText] = match
  if (!dayText || !monthText || !yearText) {
    throw new Error(`SIDOF devolvió una fecha inválida: "${dateText}".`)
  }

  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)
  const parsed = new Date(Date.UTC(year, month - 1, day))

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`SIDOF devolvió una fecha inválida: "${dateText}".`)
  }

  return `${yearText}-${monthText}-${dayText}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
