export type { ScrapedItem } from './domain/scraped-item.js'
export type { ScrapeSource } from './scraper/scrape-source.js'
export {
  parseSidofTipoCambio,
  SIDOF_TIPO_CAMBIO_URL,
  SidofTipoCambioSource,
} from './scraper/sidof-tipo-cambio.js'
export {
  DEFAULT_SIDOF_PAGE_SIZE,
  parseSidofNotasResponse,
  SIDOF_CARGA_NOTAS_URL,
  SidofNotasSource,
} from './scraper/sidof-notas.js'
export {
  parseSidofNotaDetalle,
  SidofNotaDetailSource,
} from './scraper/sidof-nota-detalle.js'
export type { SidofNotaReference } from './scraper/sidof-notas.js'
