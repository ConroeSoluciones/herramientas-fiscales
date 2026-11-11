export interface ScrapedItem {
  readonly externalId: string
  readonly data: Readonly<Record<string, unknown>>
}
