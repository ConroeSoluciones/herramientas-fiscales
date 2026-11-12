import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise'
import type {
  CatalogErrorRecord,
  CatalogErrorSearchResult,
  CatalogSummary,
  ParsedCatalog,
} from './types.js'

const CREATE_CATALOG_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sat_catalogos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    clave VARCHAR(80) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    url_fuente VARCHAR(1024) NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sat_catalogos_clave (clave)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`

const CREATE_ERROR_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sat_catalogo_errores (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    catalogo_id INT UNSIGNED NOT NULL,
    num VARCHAR(32) NOT NULL,
    elemento TEXT NOT NULL,
    atributo TEXT NOT NULL,
    validacion TEXT NOT NULL,
    codigo_error VARCHAR(100) NOT NULL,
    descripcion_codigo_error TEXT NOT NULL,
    aclaraciones TEXT NULL,
    PRIMARY KEY (id),
    KEY idx_sat_error_codigo (codigo_error),
    KEY idx_sat_error_catalogo_codigo (catalogo_id, codigo_error),
    CONSTRAINT fk_sat_error_catalogo
      FOREIGN KEY (catalogo_id) REFERENCES sat_catalogos (id)
      ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`

const GLOBAL_SEARCH_RESULT_LIMIT = 50

interface CatalogIdRow extends RowDataPacket {
  id: number
}

interface CatalogSummaryRow extends RowDataPacket {
  id: number
  clave: string
  nombre: string
  url_fuente: string
  actualizado_en: string
  total_errores: number | string
  primer_codigo: string | null
  ultimo_codigo: string | null
}

interface CatalogErrorRowResult extends RowDataPacket {
  id: number
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

interface ColumnNameRow extends RowDataPacket {
  column_name: string
}

interface ColumnTypeRow extends RowDataPacket {
  data_type: string
}

export class MysqlCatalogRepository {
  constructor(private readonly pool: Pool) {}

  async ensureSchema(): Promise<void> {
    await this.pool.execute(CREATE_CATALOG_TABLE_SQL)
    await this.pool.execute(CREATE_ERROR_TABLE_SQL)
    await this.ensureTextColumn('elemento')
    await this.ensureTextColumn('atributo')
    if (!(await this.hasClarificationsColumn())) {
      await this.pool.execute(
        'ALTER TABLE sat_catalogo_errores ADD COLUMN aclaraciones TEXT NULL AFTER descripcion_codigo_error',
      )
    }
  }

  private async ensureTextColumn(
    column: 'elemento' | 'atributo',
  ): Promise<void> {
    const [rows] = await this.pool.execute<ColumnTypeRow[]>(`
      SELECT DATA_TYPE AS data_type
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sat_catalogo_errores'
        AND COLUMN_NAME = '${column}'
    `)
    const dataType = rows[0]?.data_type.toLowerCase()
    if (!dataType) {
      throw new Error(
        `No se encontró la columna ${column} en sat_catalogo_errores.`,
      )
    }
    if (['text', 'mediumtext', 'longtext'].includes(dataType)) return

    await this.pool.execute(
      `ALTER TABLE sat_catalogo_errores MODIFY COLUMN ${column} TEXT NOT NULL`,
    )
  }

  private async hasClarificationsColumn(): Promise<boolean> {
    const [rows] = await this.pool.execute<ColumnNameRow[]>(`
      SELECT COLUMN_NAME AS column_name
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'sat_catalogo_errores'
        AND COLUMN_NAME = 'aclaraciones'
    `)
    return rows.length > 0
  }

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
    const hasClarificationsColumn = await this.hasClarificationsColumn()
    const normalizedSearch = searchTerm.trim()
    const searchableColumns = [
      'e.codigo_error',
      'e.descripcion_codigo_error',
      'e.validacion',
      'e.elemento',
      'e.atributo',
    ]
    if (hasClarificationsColumn) searchableColumns.push('e.aclaraciones')
    const searchClause = normalizedSearch
      ? `AND (${searchableColumns.map((column) => `${column} LIKE ?`).join(' OR ')})`
      : ''
    const searchPattern = `%${normalizedSearch}%`
    const values = normalizedSearch
      ? [clave, ...searchableColumns.map(() => searchPattern)]
      : [clave]
    const [rows] = await this.pool.execute<CatalogErrorRowResult[]>(
      `SELECT
         e.id, e.num, e.elemento, e.atributo, e.validacion,
         e.codigo_error, e.descripcion_codigo_error,
         ${hasClarificationsColumn ? 'e.aclaraciones' : "'' AS aclaraciones"}
       FROM sat_catalogo_errores AS e
       INNER JOIN sat_catalogos AS c ON c.id = e.catalogo_id
       WHERE c.clave = ? ${searchClause}
       ORDER BY e.codigo_error ASC, e.id ASC`,
      values,
    )

    return rows.map((row) => ({
      id: Number(row.id),
      num: row.num,
      elemento: row.elemento,
      atributo: row.atributo,
      validacion: row.validacion,
      codigoError: row.codigo_error,
      descripcionCodigoError: row.descripcion_codigo_error,
      aclaraciones: row.aclaraciones ?? '',
    }))
  }

  async searchErrorsAcrossCatalogs(
    searchTerm: string,
  ): Promise<CatalogErrorSearchResult[]> {
    const normalizedSearch = searchTerm.trim()
    if (!normalizedSearch) return []

    const hasClarificationsColumn = await this.hasClarificationsColumn()
    const escapedSearch = normalizedSearch.replace(/[\\%_]/g, '\\$&')
    const [rows] = await this.pool.execute<CatalogErrorSearchRowResult[]>(
      `SELECT
         e.id, e.num, e.elemento, e.atributo, e.validacion,
         e.codigo_error, e.descripcion_codigo_error,
         ${hasClarificationsColumn ? 'e.aclaraciones' : "'' AS aclaraciones"},
         c.clave AS catalog_clave, c.nombre AS catalog_nombre
       FROM sat_catalogo_errores AS e
       INNER JOIN sat_catalogos AS c ON c.id = e.catalogo_id
       WHERE e.codigo_error LIKE ?
       ORDER BY CASE WHEN e.codigo_error = ? THEN 0 ELSE 1 END,
         e.codigo_error ASC, c.nombre ASC, e.id ASC
       LIMIT ${GLOBAL_SEARCH_RESULT_LIMIT + 1}`,
      [`${escapedSearch}%`, normalizedSearch],
    )

    return rows.map((row) => ({
      id: Number(row.id),
      num: row.num,
      elemento: row.elemento,
      atributo: row.atributo,
      validacion: row.validacion,
      codigoError: row.codigo_error,
      descripcionCodigoError: row.descripcion_codigo_error,
      aclaraciones: row.aclaraciones ?? '',
      catalogClave: row.catalog_clave,
      catalogNombre: row.catalog_nombre,
    }))
  }

  private async selectCatalogSummaries(
    whereClause = '',
    values: readonly string[] = [],
  ): Promise<CatalogSummary[]> {
    const [rows] = await this.pool.execute<CatalogSummaryRow[]>(
      `
      SELECT
        c.id,
        c.clave,
        c.nombre,
        c.url_fuente,
        DATE_FORMAT(c.actualizado_en, '%Y-%m-%d %H:%i:%s') AS actualizado_en,
        COUNT(e.id) AS total_errores,
        MIN(e.codigo_error) AS primer_codigo,
        MAX(e.codigo_error) AS ultimo_codigo
      FROM sat_catalogos AS c
      LEFT JOIN sat_catalogo_errores AS e ON e.catalogo_id = c.id
      ${whereClause}
      GROUP BY c.id, c.clave, c.nombre, c.url_fuente, c.actualizado_en
      ORDER BY c.nombre ASC
    `,
      [...values],
    )

    return rows.map((row) => ({
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
    const connection = await this.pool.getConnection()
    let transactionStarted = false
    let importedRows = 0

    try {
      await connection.beginTransaction()
      transactionStarted = true

      for (const catalog of catalogs) {
        await connection.execute(
          `INSERT INTO sat_catalogos (clave, nombre, url_fuente)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), url_fuente = VALUES(url_fuente)`,
          [catalog.source.clave, catalog.source.nombre, catalog.source.url],
        )
        const [rows] = await connection.execute<CatalogIdRow[]>(
          'SELECT id FROM sat_catalogos WHERE clave = ? FOR UPDATE',
          [catalog.source.clave],
        )
        const catalogId = rows[0]?.id
        if (!catalogId)
          throw new Error(
            `No se encontró el catálogo "${catalog.source.clave}".`,
          )

        await connection.execute(
          'DELETE FROM sat_catalogo_errores WHERE catalogo_id = ?',
          [catalogId],
        )
        importedRows += await this.insertRows(connection, catalogId, catalog)
      }

      await connection.commit()
      transactionStarted = false
      return importedRows
    } catch (error) {
      if (transactionStarted) await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  private async insertRows(
    connection: PoolConnection,
    catalogId: number,
    catalog: ParsedCatalog,
  ): Promise<number> {
    const batchSize = 500
    let inserted = 0

    for (let offset = 0; offset < catalog.rows.length; offset += batchSize) {
      const batch = catalog.rows.slice(offset, offset + batchSize)
      const placeholders = batch
        .map(() => '(?, ?, ?, ?, ?, ?, ?, ?)')
        .join(', ')
      const values = batch.flatMap((row) => [
        catalogId,
        row.num,
        row.elemento,
        row.atributo,
        row.validacion,
        row.codigoError,
        row.descripcionCodigoError,
        row.aclaraciones,
      ])
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO sat_catalogo_errores
          (catalogo_id, num, elemento, atributo, validacion, codigo_error, descripcion_codigo_error, aclaraciones)
         VALUES ${placeholders}`,
        values,
      )
      inserted += result.affectedRows
    }

    return inserted
  }
}
