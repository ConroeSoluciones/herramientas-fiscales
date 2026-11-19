import type {
  ScrapedItem,
  SidofNotaDetailSource,
  SidofNotaReference,
  SidofNotasSource,
} from '@cs-herramientas/sidof-scraper'

export type IngestionMode = 'backfill' | 'sync'

export interface StoredTipoCambio {
  readonly codNota: number
  readonly publicationDate: string
  readonly rateDate: string
  readonly pesosPerDollar: number
  readonly title: string
  readonly sourceUrl: string
}

export interface TipoCambioRepository {
  findExistingCodNotas(
    codNotas: readonly number[],
  ): Promise<ReadonlySet<number>>
  insertIfAbsent(records: readonly StoredTipoCambio[]): Promise<number>
}

export interface TipoCambioReadRepository {
  findPenultimateByPublicationDate(): Promise<StoredTipoCambio | null>
  findByRateDateRange(
    startDate: string,
    endDate: string,
  ): Promise<StoredTipoCambio[]>
}

export interface IngestionSources {
  readonly notes: Pick<SidofNotasSource, 'scrape'>
  readonly details: Pick<SidofNotaDetailSource, 'scrape'>
}

export interface IngestionSummary {
  readonly mode: IngestionMode
  readonly listed: number
  readonly alreadyStored: number
  readonly detailRequests: number
  readonly inserted: number
}

export interface IngestionOptions {
  readonly now?: Date
  readonly publicationLimit?: number
}

export async function ingestLatest(
  mode: IngestionMode,
  sources: IngestionSources,
  repository: TipoCambioRepository,
  options: IngestionOptions = {},
): Promise<IngestionSummary> {
  if (
    options.publicationLimit !== undefined &&
    (!Number.isSafeInteger(options.publicationLimit) ||
      options.publicationLimit < 1)
  ) {
    throw new RangeError('El límite debe ser un entero positivo.')
  }

  const notes =
    mode === 'backfill'
      ? options.publicationLimit === undefined
        ? await scrapeLastFiveYears(
            sources.notes,
            getFiveYearsAgoDate(options.now ?? new Date()),
          )
        : await scrapeLatestPublications(
            sources.notes,
            options.publicationLimit,
          )
      : await sources.notes.scrape()
  const existingCodes = await repository.findExistingCodNotas(
    notes.map((note) => note.codNota),
  )
  const newNotes = notes.filter((note) => !existingCodes.has(note.codNota))
  const records: StoredTipoCambio[] = []

  // Do not fetch detail pages for notes already stored; keep requests sequential.
  for (const note of newNotes) {
    const item = await sources.details.scrape(note)
    records.push(toStoredTipoCambio(item, note))
  }

  const inserted = await repository.insertIfAbsent(records)

  return {
    mode,
    listed: notes.length,
    alreadyStored: notes.length - newNotes.length,
    detailRequests: records.length,
    inserted,
  }
}

async function scrapeLatestPublications(
  notesSource: IngestionSources['notes'],
  limit: number,
): Promise<readonly SidofNotaReference[]> {
  const notes: SidofNotaReference[] = []
  let start = 0

  while (notes.length < limit) {
    const page = await notesSource.scrape(start)
    if (page.length === 0) return notes

    notes.push(...page.slice(0, limit - notes.length))
    start += page.length
  }

  return notes
}

async function scrapeLastFiveYears(
  notesSource: IngestionSources['notes'],
  cutoffDate: string,
): Promise<readonly SidofNotaReference[]> {
  const notes: SidofNotaReference[] = []
  let start = 0

  while (true) {
    const page = await notesSource.scrape(start)
    if (page.length === 0) return notes

    for (const note of page) {
      // SIDOF orders these results by publication date descending.
      if (note.publicationDate < cutoffDate) return notes
      notes.push(note)
    }

    start += page.length
  }
}

function getFiveYearsAgoDate(now: Date): string {
  const year = now.getUTCFullYear() - 5
  const month = now.getUTCMonth()
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(now.getUTCDate(), lastDayOfMonth)

  return [year, month + 1, day]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0'))
    .join('-')
}

function toStoredTipoCambio(
  item: ScrapedItem,
  note: SidofNotaReference,
): StoredTipoCambio {
  const { data } = item
  const codNota = data.codNota
  const publicationDate = data.publicationDate
  const rateDate = data.rateDate
  const pesosPerDollar = data.pesosPerDollar
  const title = data.title
  const sourceUrl = data.sourceUrl

  if (codNota !== note.codNota) {
    throw new Error(
      `El detalle devuelto no corresponde a la nota ${note.codNota}.`,
    )
  }
  if (
    typeof publicationDate !== 'string' ||
    typeof rateDate !== 'string' ||
    !isIsoDate(publicationDate) ||
    !isIsoDate(rateDate)
  ) {
    throw new Error(
      `SIDOF devolvió fechas inválidas para la nota ${note.codNota}.`,
    )
  }
  if (
    typeof pesosPerDollar !== 'number' ||
    !Number.isFinite(pesosPerDollar) ||
    pesosPerDollar <= 0
  ) {
    throw new Error(
      `SIDOF devolvió un tipo de cambio inválido para la nota ${note.codNota}.`,
    )
  }
  if (typeof title !== 'string' || typeof sourceUrl !== 'string') {
    throw new Error(
      `SIDOF devolvió datos incompletos para la nota ${note.codNota}.`,
    )
  }

  return {
    codNota,
    publicationDate,
    rateDate,
    pesosPerDollar,
    title,
    sourceUrl,
  }
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}
