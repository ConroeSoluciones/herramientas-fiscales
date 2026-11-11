import type { ScrapedItem } from '../domain/scraped-item.js'
import type { ScrapeSource } from './scrape-source.js'
import { SidofNotaDetailSource } from './sidof-nota-detalle.js'
import { SidofNotasSource } from './sidof-notas.js'
import type { SidofNotaReference } from './sidof-notas.js'

export { SIDOF_TIPO_CAMBIO_URL } from './sidof-notas.js'
export { parseSidofTipoCambio } from './sidof-indicator-parser.js'

export class SidofTipoCambioSource implements ScrapeSource {
  readonly name = 'sidof-tipo-cambio'

  private readonly notesSource: SidofNotasSource
  private readonly detailSource: SidofNotaDetailSource

  constructor(fetchRequest: typeof fetch = fetch, pageSize?: number) {
    this.notesSource = new SidofNotasSource(fetchRequest, pageSize)
    this.detailSource = new SidofNotaDetailSource(fetchRequest)
  }

  async scrape(): Promise<readonly ScrapedItem[]> {
    const notes: readonly SidofNotaReference[] = await this.notesSource.scrape()
    const items: ScrapedItem[] = []

    // Fetch sequentially to avoid sending a burst of requests to SIDOF.
    for (const note of notes) {
      items.push(await this.detailSource.scrape(note))
    }

    return items
  }
}
