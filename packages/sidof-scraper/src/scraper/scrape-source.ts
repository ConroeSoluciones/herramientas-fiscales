import type { ScrapedItem } from '../domain/scraped-item.js'

export interface ScrapeSource {
  readonly name: string
  scrape(): Promise<readonly ScrapedItem[]>
}
