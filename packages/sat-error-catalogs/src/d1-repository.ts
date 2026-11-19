import type {
  D1Database,
  D1PreparedStatement,
} from '@cs-herramientas/d1-client'
import type {
  CatalogErrorRecord,
  CatalogErrorSearchResult,
  CatalogSummary,
  ParsedCatalog,
} from './types.js'

const GLOBAL_SEARCH_RESULT_LIMIT = 50
const MAX_BIND_PARAMETERS = 100
const INSERT_VALUES_PER_ROW = 8
const INSERT_ROWS_PER_STATEMENT = Math.floor(
  MAX_BIND_PARAMETERS / INSERT_VALUES_PER_ROW,
)

interface CatalogSummaryRow {
  id: number | string
  clave: string
  nombre: string
  url_fuente: string
  actualizado_en: string
  total_errores: number | string
  primer_codigo: string | null
  ultimo_codigo: string | null
}

interface CatalogErrorRowResult {
  id: number | string
  num: string
  elemento: string
  atributo: string
  validacion: string
  codigo_error: string
  descripcion_codigo_error: string
  aclaraciones: string | null
}

interface CatalogErrorSearchRowResult extends CatalogErrorRowResult {
  catalog_clave: string
  catalog_nombre: string
}

export class D1CatalogRepository {
  constructor(private readonly database: D1Database) {}

  async listCatalogSummaries(): Promise<CatalogSummary[]> {
    return this.selectCatalogSummaries()
  }

  async findCatalogByKey(clave: string): Promise<CatalogSummary | null> {
    const catalogs = await this.selectCatalogSummaries('WHERE c.clave = ?', [
      clave,
    ])
    return catalogs[0] ?? null
  }

  async searchCatalogErrors(
    clave: string,
    searchTerm = '',
  ): Promise<CatalogErrorRecord[]> {
    const normalizedSearch = searchTerm.trim()
    const searchableColumns = [
      'e.codigo_error',
      'e.descripcion_codigo_error',
      'e.validacion',
      'e.elemento',
      'e.atributo',
      'e.aclaraciones',
    ]
    const searchClause = normalizedSearch
      ? `AND (${searchableColumns.map((column) => `instr(lower(${column}), lower(?)) > 0`).join(' OR ')})`
      : ''
    const values = normalizedSearch
      ? [clave, ...searchableColumns.map(() => normalizedSearch)]
      : [clave]
    const { results } = await this.database
      .prepare(
        `SELECT
           e.id, e.num, e.elemento, e.atributo, e.validacion,
           e.codigo_error, e.descripcion_codigo_error, e.aclaraciones
         FROM sat_catalogo_errores AS e
         INNER JOIN sat_catalogos AS c ON c.id = e.catalogo_id
         WHERE c.clave = ? ${searchClause}
         ORDER BY e.codigo_error ASC, e.id ASC`,
      )
      .bind(...values)
      .all<CatalogErrorRowResult>()

    return (results ?? []).map(toCatalogErrorRecord)
  }

  async searchErrorsAcrossCatalogs(
    searchTerm: string,
  ): Promise<CatalogErrorSearchResult[]> {
    const normalizedSearch = searchTerm.trim()
    if (!normalizedSearch) return []

    const { results } = await this.database
      .prepare(
        `SELECT
           e.id, e.num, e.elemento, e.atributo, e.validacion,
           e.codigo_error, e.descripcion_codigo_error, e.aclaraciones,
           c.clave AS catalog_clave, c.nombre AS catalog_nombre
         FROM sat_catalogo_errores AS e
         INNER JOIN sat_catalogos AS c ON c.id = e.catalogo_id
         WHERE substr(e.codigo_error, 1, length(?)) = ? COLLATE NOCASE
         ORDER BY CASE WHEN e.codigo_error = ? COLLATE NOCASE THEN 0 ELSE 1 END,
           e.codigo_error ASC, c.nombre ASC, e.id ASC
         LIMIT ${GLOBAL_SEARCH_RESULT_LIMIT + 1}`,
      )
      .bind(normalizedSearch, normalizedSearch, normalizedSearch)
      .all<CatalogErrorSearchRowResult>()

    return (results ?? []).map((row) => ({
      ...toCatalogErrorRecord(row),
      catalogClave: row.catalog_clave,
      catalogNombre: row.catalog_nombre,
    }))
  }

  private async selectCatalogSummaries(
    whereClause = '',
    values: readonly string[] = [],
  ): Promise<CatalogSummary[]> {
    const { results } = await this.database
      .prepare(
        `SELECT
           c.id,
           c.clave,
           c.nombre,
           c.url_fuente,
           c.actualizado_en,
           COUNT(e.id) AS total_errores,
           MIN(e.codigo_error) AS primer_codigo,
           MAX(e.codigo_error) AS ultimo_codigo
         FROM sat_catalogos AS c
         LEFT JOIN sat_catalogo_errores AS e ON e.catalogo_id = c.id
         ${whereClause}
         GROUP BY c.id, c.clave, c.nombre, c.url_fuente, c.actualizado_en
         ORDER BY c.nombre ASC`,
      )
      .bind(...values)
      .all<CatalogSummaryRow>()

    return (results ?? []).map((row) => ({
      id: Number(row.id),
      clave: row.clave,
      nombre: row.nombre,
      urlFuente: row.url_fuente,
      actualizadoEn: row.actualizado_en,
      totalErrores: Number(row.total_errores),
      primerCodigo: row.primer_codigo,
      ultimoCodigo: row.ultimo_codigo,
    }))
  }

  async replaceCatalogs(catalogs: readonly ParsedCatalog[]): Promise<number> {
    let importedRows = 0

    for (const catalog of catalogs) {
      const statements: D1PreparedStatement[] = [
        this.database
          .prepare(
            `INSERT INTO sat_catalogos (clave, nombre, url_fuente)
             VALUES (?, ?, ?)
             ON CONFLICT(clave) DO UPDATE SET
               nombre = excluded.nombre,
               url_fuente = excluded.url_fuente,
               actualizado_en = CURRENT_TIMESTAMP`,
          )
          .bind(
            catalog.source.clave,
            catalog.source.nombre,
            catalog.source.url,
          ),
        this.database
          .prepare(
            `DELETE FROM sat_catalogo_errores
             WHERE catalogo_id = (
               SELECT id FROM sat_catalogos WHERE clave = ?
             )`,
          )
          .bind(catalog.source.clave),
      ]

      for (
        let offset = 0;
        offset < catalog.rows.length;
        offset += INSERT_ROWS_PER_STATEMENT
      ) {
        const rows = catalog.rows.slice(
          offset,
          offset + INSERT_ROWS_PER_STATEMENT,
        )
        const placeholders = rows
          .map(
            () =>
              `((SELECT id FROM sat_catalogos WHERE clave = ?), ?, ?, ?, ?, ?, ?, ?)`,
          )
          .join(', ')
        const values = rows.flatMap((row) => [
          catalog.source.clave,
          row.num,
          row.elemento,
          row.atributo,
          row.validacion,
          row.codigoError,
          row.descripcionCodigoError,
          row.aclaraciones,
        ])
        statements.push(
          this.database
            .prepare(
              `INSERT INTO sat_catalogo_errores
                (catalogo_id, num, elemento, atributo, validacion, codigo_error, descripcion_codigo_error, aclaraciones)
               VALUES ${placeholders}`,
            )
            .bind(...values),
        )
      }

      // D1 batches are atomic, so a failed catalog import keeps its old rows.
      await this.database.batch(statements)
      importedRows += catalog.rows.length
    }

    return importedRows
  }
}

function toCatalogErrorRecord(row: CatalogErrorRowResult): CatalogErrorRecord {
  return {
    id: Number(row.id),
    num: row.num,
    elemento: row.elemento,
    atributo: row.atributo,
    validacion: row.validacion,
    codigoError: row.codigo_error,
    descripcionCodigoError: row.descripcion_codigo_error,
    aclaraciones: row.aclaraciones ?? '',
  }
}
