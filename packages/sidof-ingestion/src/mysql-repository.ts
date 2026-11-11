import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type {
  TipoCambioReadRepository,
  TipoCambioRepository,
  StoredTipoCambio,
} from './ingestion.js'

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sidof_tipo_cambio (
    cod_nota INT UNSIGNED NOT NULL,
    fecha_publicacion DATE NOT NULL,
    fecha_tipo_cambio DATE NOT NULL,
    usd_mxn DECIMAL(12, 4) NOT NULL,
    titulo VARCHAR(500) NOT NULL,
    url_fuente VARCHAR(512) NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cod_nota),
    KEY idx_fecha_tipo_cambio (fecha_tipo_cambio)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`

interface ExistingNotaRow extends RowDataPacket {
  cod_nota: number
}

interface PenultimateNotaRow extends RowDataPacket {
  cod_nota: number
  fecha_publicacion: string
  fecha_tipo_cambio: string
  usd_mxn: string | number
  titulo: string
  url_fuente: string
}

export class MysqlTipoCambioRepository
  implements TipoCambioRepository, TipoCambioReadRepository
{
  constructor(private readonly pool: Pool) {}

  async ensureSchema(): Promise<void> {
    await this.pool.execute(CREATE_TABLE_SQL)
  }

  async findExistingCodNotas(
    codNotas: readonly number[],
  ): Promise<ReadonlySet<number>> {
    if (codNotas.length === 0) return new Set()

    const placeholders = codNotas.map(() => '?').join(', ')
    const [rows] = await this.pool.execute<ExistingNotaRow[]>(
      `SELECT cod_nota FROM sidof_tipo_cambio WHERE cod_nota IN (${placeholders})`,
      [...codNotas],
    )

    return new Set(rows.map((row) => Number(row.cod_nota)))
  }

  async findPenultimateByPublicationDate(): Promise<StoredTipoCambio | null> {
    const [rows] = await this.pool.execute<PenultimateNotaRow[]>(`
      SELECT cod_nota, fecha_publicacion, fecha_tipo_cambio, usd_mxn, titulo, url_fuente
      FROM sidof_tipo_cambio
      ORDER BY fecha_publicacion DESC, cod_nota DESC
      LIMIT 1 OFFSET 1
    `)
    const row = rows[0]
    if (!row) return null

    const pesosPerDollar = Number(row.usd_mxn)
    if (!Number.isFinite(pesosPerDollar) || pesosPerDollar <= 0) {
      throw new Error('La base de datos contiene un tipo de cambio inválido.')
    }

    return {
      codNota: Number(row.cod_nota),
      publicationDate: row.fecha_publicacion,
      rateDate: row.fecha_tipo_cambio,
      pesosPerDollar,
      title: row.titulo,
      sourceUrl: row.url_fuente,
    }
  }

  async findByRateDateRange(
    startDate: string,
    endDate: string,
  ): Promise<StoredTipoCambio[]> {
    const [rows] = await this.pool.execute<PenultimateNotaRow[]>(
      `SELECT cod_nota, fecha_publicacion, fecha_tipo_cambio, usd_mxn, titulo, url_fuente
       FROM sidof_tipo_cambio
       WHERE fecha_tipo_cambio >= ? AND fecha_tipo_cambio <= ?
       ORDER BY fecha_tipo_cambio DESC, fecha_publicacion DESC, cod_nota DESC`,
      [startDate, endDate],
    )

    return rows.map((row) => {
      const pesosPerDollar = Number(row.usd_mxn)
      if (!Number.isFinite(pesosPerDollar) || pesosPerDollar <= 0) {
        throw new Error('La base de datos contiene un tipo de cambio inválido.')
      }

      return {
        codNota: Number(row.cod_nota),
        publicationDate: row.fecha_publicacion,
        rateDate: row.fecha_tipo_cambio,
        pesosPerDollar,
        title: row.titulo,
        sourceUrl: row.url_fuente,
      }
    })
  }

  async insertIfAbsent(records: readonly StoredTipoCambio[]): Promise<number> {
    if (records.length === 0) return 0

    const connection = await this.pool.getConnection()
    let transactionStarted = false
    let inserted = 0

    try {
      await connection.beginTransaction()
      transactionStarted = true

      for (const record of records) {
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT IGNORE INTO sidof_tipo_cambio
            (cod_nota, fecha_publicacion, fecha_tipo_cambio, usd_mxn, titulo, url_fuente)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            record.codNota,
            record.publicationDate,
            record.rateDate,
            record.pesosPerDollar.toFixed(4),
            record.title,
            record.sourceUrl,
          ],
        )
        inserted += result.affectedRows
      }

      await connection.commit()
      transactionStarted = false
      return inserted
    } catch (error) {
      if (transactionStarted) await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
}
