import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ParsedCatalog } from './types.js'

export async function persistCatalogs(
  catalogs: readonly ParsedCatalog[],
  downloadDirectory: string,
): Promise<void> {
  await mkdir(downloadDirectory, { recursive: true })
  for (const catalog of catalogs) {
    const destination = join(downloadDirectory, `${catalog.source.clave}.xls`)
    const temporary = `${destination}.tmp-${process.pid}`
    await writeFile(temporary, catalog.file)
    await rename(temporary, destination)
  }
}
