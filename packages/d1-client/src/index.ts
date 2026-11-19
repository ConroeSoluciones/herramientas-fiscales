export type D1Value = string | number | null | ArrayBuffer | ArrayBufferView

export interface D1Result<T = Record<string, unknown>> {
  success: boolean
  results: T[] | null
  meta: {
    changes: number
    last_row_id: number
  }
}

export interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<D1Result>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>
}

interface CloudflareQueryResult {
  success?: boolean
  results?: unknown[] | null
  meta?: {
    changes?: number
    last_row_id?: number
  }
}

interface CloudflareApiResponse {
  success?: boolean
  errors?: Array<{ message?: string }>
  result?: CloudflareQueryResult | CloudflareQueryResult[]
}

interface QueryPayload {
  sql: string
  params: string[]
}

export interface CloudflareD1Options {
  accountId: string
  databaseId: string
  apiToken: string
  fetch?: typeof fetch
}

export function createCloudflareD1DatabaseFromEnvironment(
  environment: Record<string, string | undefined>,
  fetchImplementation: typeof fetch = fetch,
): CloudflareApiD1Database {
  const accountId = environment.CLOUDFLARE_ACCOUNT_ID?.trim()
  const databaseId = environment.CLOUDFLARE_D1_DATABASE_ID?.trim()
  const apiToken = environment.CLOUDFLARE_API_TOKEN?.trim()

  if (!accountId || !databaseId || !apiToken) {
    throw new Error(
      'Configura CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID y CLOUDFLARE_API_TOKEN.',
    )
  }

  return new CloudflareApiD1Database({
    accountId,
    databaseId,
    apiToken,
    fetch: fetchImplementation,
  })
}

export class CloudflareApiD1Database implements D1Database {
  private readonly fetchImplementation: typeof fetch
  private readonly endpoint: string

  constructor(options: CloudflareD1Options) {
    this.endpoint =
      'https://api.cloudflare.com/client/v4/accounts/' +
      `${encodeURIComponent(options.accountId)}/d1/database/` +
      `${encodeURIComponent(options.databaseId)}/query`
    this.fetchImplementation = options.fetch ?? fetch
    this.apiToken = options.apiToken
  }

  private readonly apiToken: string

  prepare(query: string): D1PreparedStatement {
    return new CloudflareApiD1PreparedStatement(this, query, [])
  }

  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    if (statements.length === 0) return []

    const payload = statements.map((statement) => this.toPayload(statement))
    const response = await this.request({ batch: payload })
    const result = Array.isArray(response.result)
      ? response.result
      : response.result
        ? [response.result]
        : []

    if (result.length !== statements.length) {
      throw new Error(
        'Cloudflare D1 devolvió una cantidad inesperada de resultados.',
      )
    }

    return result.map((entry) => this.normalizeResult(entry))
  }

  async execute(query: string, values: readonly D1Value[]): Promise<D1Result> {
    const response = await this.request({
      sql: query,
      params: values.map(toApiValue),
    })
    const result = Array.isArray(response.result)
      ? response.result[0]
      : response.result

    if (!result) {
      throw new Error(
        'Cloudflare D1 no devolvió un resultado para la consulta.',
      )
    }

    return this.normalizeResult(result)
  }

  private toPayload(statement: D1PreparedStatement): QueryPayload {
    if (!(statement instanceof CloudflareApiD1PreparedStatement)) {
      throw new TypeError(
        'No se pueden combinar sentencias de diferentes conexiones D1.',
      )
    }
    return statement.toPayload()
  }

  private async request(
    body: Record<string, unknown>,
  ): Promise<CloudflareApiResponse> {
    const response = await this.fetchImplementation(this.endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    let payload: CloudflareApiResponse
    try {
      payload = (await response.json()) as CloudflareApiResponse
    } catch {
      throw new Error(
        `Cloudflare D1 devolvió una respuesta inválida (HTTP ${response.status}).`,
      )
    }

    if (!response.ok || payload.success === false) {
      const message =
        payload.errors
          ?.map((error) => error.message)
          .filter(Boolean)
          .join('; ') || `HTTP ${response.status}`
      throw new Error(`Falló una consulta de Cloudflare D1: ${message}`)
    }

    return payload
  }

  private normalizeResult(result: CloudflareQueryResult): D1Result {
    if (result.success === false) {
      throw new Error('Cloudflare D1 marcó una consulta como fallida.')
    }

    return {
      success: true,
      results: (result.results ?? []) as Record<string, unknown>[],
      meta: {
        changes: result.meta?.changes ?? 0,
        last_row_id: result.meta?.last_row_id ?? 0,
      },
    }
  }
}

class CloudflareApiD1PreparedStatement implements D1PreparedStatement {
  constructor(
    private readonly database: CloudflareApiD1Database,
    private readonly query: string,
    private readonly values: readonly D1Value[],
  ) {}

  bind(...values: D1Value[]): D1PreparedStatement {
    return new CloudflareApiD1PreparedStatement(
      this.database,
      this.query,
      values,
    )
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const result = await this.database.execute(this.query, this.values)
    return result as D1Result<T>
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const result = await this.all<T>()
    return result.results?.[0] ?? null
  }

  run(): Promise<D1Result> {
    return this.database.execute(this.query, this.values)
  }

  toPayload(): QueryPayload {
    return {
      sql: this.query,
      params: this.values.map(toApiValue),
    }
  }
}

function toApiValue(value: D1Value): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  throw new TypeError(
    'La API REST de D1 acepta parámetros de texto; usa valores string o number.',
  )
}
