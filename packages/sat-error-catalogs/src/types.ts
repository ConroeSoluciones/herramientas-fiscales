export interface CatalogSource {
  clave: string
  nombre: string
  url: string
}

export interface CatalogConfig {
  downloadDirectory: string
  catalogos: CatalogSource[]
}

export interface CatalogErrorRow {
  num: string
  elemento: string
  atributo: string
  validacion: string
  codigoError: string
  descripcionCodigoError: string
  aclaraciones: string
}

export interface ParsedCatalog {
  source: CatalogSource
  rows: CatalogErrorRow[]
  file: Buffer
}

export interface CatalogSummary {
  id: number
  clave: string
  nombre: string
  urlFuente: string
  actualizadoEn: string
  totalErrores: number
  primerCodigo: string | null
  ultimoCodigo: string | null
}

export interface CatalogErrorRecord {
  id: number
  num: string
  elemento: string
  atributo: string
  validacion: string
  codigoError: string
  descripcionCodigoError: string
  aclaraciones: string
}
