import { createPool, type Pool } from 'mysql2/promise'

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Falta configurar ${name} en el archivo .env.`)
  return value
}

export function createMysqlPoolFromEnvironment(): Pool {
  const port = Number(process.env.MYSQL_PORT ?? '3306')
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('MYSQL_PORT debe ser un puerto válido.')
  }

  return createPool({
    host: requiredEnvironmentVariable('MYSQL_HOST'),
    port,
    database: requiredEnvironmentVariable('MYSQL_DATABASE'),
    user: requiredEnvironmentVariable('MYSQL_USER'),
    password: process.env.MYSQL_PASSWORD ?? '',
    waitForConnections: true,
    connectionLimit: 2,
    timezone: 'Z',
    dateStrings: true,
  })
}
