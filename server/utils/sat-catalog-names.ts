import catalogConfig from '../../config/sat-error-catalogs.json'

const catalogNames = new Map(
  catalogConfig.catalogos.map(({ clave, nombre }) => [clave, nombre]),
)

export function getSatCatalogName(clave: string, fallback: string): string {
  return catalogNames.get(clave) ?? fallback
}
