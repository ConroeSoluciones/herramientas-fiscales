import { defineSitemapEventHandler } from '#sitemap/server'
import type { SitemapUrlInput } from '#sitemap/server'
import { getSatCatalogRepository } from '../../utils/sat-catalog-repository.js'

export default defineSitemapEventHandler(async () => {
  try {
    const catalogs = await getSatCatalogRepository().listCatalogSummaries()

    return catalogs.map((catalog) => {
      const lastmod = catalog.actualizadoEn.slice(0, 10)

      return {
        loc: `/codigos-sat/${encodeURIComponent(catalog.clave)}`,
        ...(/^\d{4}-\d{2}-\d{2}$/.test(lastmod) ? { lastmod } : {}),
      } satisfies SitemapUrlInput
    })
  } catch (error) {
    console.error(
      'No se pudieron consultar los catálogos para el sitemap.',
      error instanceof Error ? error.name : 'Error desconocido',
    )
    return []
  }
})
