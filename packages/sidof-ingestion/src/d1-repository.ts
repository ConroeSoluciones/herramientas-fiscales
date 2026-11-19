import type { D1Database } from '@cs-herramientas/d1-client'
import type {
  TipoCambioReadRepository,
  TipoCambioRepository,
  StoredTipoCambio,
} from './ingestion.js'

interface ExistingNotaRow {
  cod_nota: number | string
}

interface TipoCambioRow {
  cod_nota: number | string
  fecha_publicacion: string
  fecha_tipo_cambio: string
  usd_mxn: string | number
  titulo: string
  url_fuente: string
}

const FIND_CODES_BATCH_SIZE = 90
const INSERT_BATCH_SIZE = 50
const INSERT_VALUES_PER_STATEMENT = 16

export class D1TipoCambioRepository
  implements TipoCambioRepository, TipoCambioReadRepository
{
  constructor(private readonly database: D1Database) {}

  async findExistingCodNotas(
    codNotas: readonly number[],
  ): Promise<ReadonlySet<number>> {
    const existingCodes = new Set<number>()

    for (
      let offset = 0;
      offset < codNotas.length;
      offset += FIND_CODES_BATCH_SIZE
    ) {
      const codes = codNotas.slice(offset, offset + FIND_CODES_BATCH_SIZE)
      if (codes.length === 0) continue

      const placeholders = codes.map(() => '?').join(', ')
      const { results } = await this.database
        .prepare(
          `SELECT cod_nota FROM sidof_tipo_cambio WHERE cod_nota IN (${placeholders})`,
        )
        .bind(...codes)
        .all<ExistingNotaRow>()

      for (const row of results ?? []) existingCodes.add(Number(row.cod_nota))
    }

    return existingCodes
  }

  async findPenultimateByPublicationDate(): Promise<StoredTipoCambio | null> {
    const row = await this.database
      .prepare(
        `SELECT cod_nota, fecha_publicacion, fecha_tipo_cambio, usd_mxn, titulo, url_fuente
         FROM sidof_tipo_cambio
         ORDER BY fecha_publicacion DESC, cod_nota DESC
         LIMIT 1 OFFSET 1`,
      )
      .first<TipoCambioRow>()

    return row ? toStoredTipoCambio(row) : null
  }

  async findByRateDateRange(
    startDate: string,
    endDate: string,
  ): Promise<StoredTipoCambio[]> {
    const { results } = await this.database
      .prepare(
        `SELECT cod_nota, fecha_publicacion, fecha_tipo_cambio, usd_mxn, titulo, url_fuente
         FROM sidof_tipo_cambio
         WHERE fecha_tipo_cambio >= ? AND fecha_tipo_cambio <= ?
         ORDER BY fecha_tipo_cambio DESC, fecha_publicacion DESC, cod_nota DESC`,
      )
      .bind(startDate, endDate)
      .all<TipoCambioRow>()

    return (results ?? []).map(toStoredTipoCambio)
  }

  async insertIfAbsent(records: readonly StoredTipoCambio[]): Promise<number> {
    let inserted = 0

    for (let offset = 0; offset < records.length; offset += INSERT_BATCH_SIZE) {
      const batch = records.slice(offset, offset + INSERT_BATCH_SIZE)
      const statements = []

      for (
        let rowOffset = 0;
        rowOffset < batch.length;
        rowOffset += INSERT_VALUES_PER_STATEMENT
      ) {
        const rows = batch.slice(
          rowOffset,
          rowOffset + INSERT_VALUES_PER_STATEMENT,
        )
        const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')
        const values = rows.flatMap((record) => [
          record.codNota,
          record.publicationDate,
          record.rateDate,
          record.pesosPerDollar.toFixed(4),
          record.title,
          record.sourceUrl,
        ])
        statements.push(
          this.database
            .prepare(
              `INSERT OR IGNORE INTO sidof_tipo_cambio
                (cod_nota, fecha_publicacion, fecha_tipo_cambio, usd_mxn, titulo, url_fuente)
               VALUES ${placeholders}`,
            )
            .bind(...values),
        )
      }

      const results = await this.database.batch(statements)
      inserted += results.reduce(
        (total, result) => total + result.meta.changes,
        0,
      )
    }

    return inserted
  }
}

function toStoredTipoCambio(row: TipoCambioRow): StoredTipoCambio {
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
