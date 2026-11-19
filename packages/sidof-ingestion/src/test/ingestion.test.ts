import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  ScrapedItem,
  SidofNotaReference,
} from '@cs-herramientas/sidof-scraper'
import { ingestLatest, type TipoCambioRepository } from '../ingestion.js'

const notes: readonly SidofNotaReference[] = [
  { codNota: 101, publicationDate: '2026-11-09', title: 'Nota nueva' },
  { codNota: 100, publicationDate: '2026-11-06', title: 'Nota existente' },
]

function scrapedItem(note: SidofNotaReference): ScrapedItem {
  return {
    externalId: `sidof-nota-${note.codNota}`,
    data: {
      codNota: note.codNota,
      publicationDate: note.publicationDate,
      rateDate: note.publicationDate,
      pesosPerDollar: 18.5,
      title: note.title,
      sourceUrl: `https://sidof.segob.gob.mx/notas/${note.codNota}`,
    },
  }
}

test('ingestLatest solo consulta e inserta notas cuyo codNota no existe', async () => {
  let requestedCodes: readonly number[] = []
  let insertedCodes: readonly number[] = []
  const detailRequests: number[] = []

  const repository: TipoCambioRepository = {
    async findExistingCodNotas(codNotas) {
      requestedCodes = codNotas
      return new Set([100])
    },
    async insertIfAbsent(records) {
      insertedCodes = records.map((record) => record.codNota)
      return records.length
    },
  }

  const summary = await ingestLatest(
    'sync',
    {
      notes: {
        async scrape() {
          return notes
        },
      },
      details: {
        async scrape(note) {
          detailRequests.push(note.codNota)
          return scrapedItem(note)
        },
      },
    },
    repository,
  )

  assert.deepEqual(requestedCodes, [101, 100])
  assert.deepEqual(detailRequests, [101])
  assert.deepEqual(insertedCodes, [101])
  assert.deepEqual(summary, {
    mode: 'sync',
    listed: 2,
    alreadyStored: 1,
    detailRequests: 1,
    inserted: 1,
  })
})

test('backfill pagina hasta el corte de cinco años e incluye la fecha límite', async () => {
  const requestedStarts: number[] = []
  let insertedCodes: readonly number[] = []
  const backfillNotes: readonly SidofNotaReference[] = [
    { codNota: 103, publicationDate: '2026-11-10', title: 'Nota reciente' },
    { codNota: 102, publicationDate: '2021-11-11', title: 'Nota en rango' },
    { codNota: 101, publicationDate: '2021-11-10', title: 'Fecha límite' },
    {
      codNota: 100,
      publicationDate: '2021-11-09',
      title: 'Nota fuera de rango',
    },
  ]

  const summary = await ingestLatest(
    'backfill',
    {
      notes: {
        async scrape(start = 0) {
          requestedStarts.push(start)
          return start === 0
            ? backfillNotes.slice(0, 2)
            : backfillNotes.slice(2)
        },
      },
      details: {
        async scrape(note) {
          return scrapedItem(note)
        },
      },
    },
    {
      async findExistingCodNotas() {
        return new Set()
      },
      async insertIfAbsent(records) {
        insertedCodes = records.map((record) => record.codNota)
        return records.length
      },
    },
    { now: new Date('2026-11-10T12:00:00.000Z') },
  )

  assert.deepEqual(requestedStarts, [0, 2])
  assert.deepEqual(insertedCodes, [103, 102, 101])
  assert.deepEqual(summary, {
    mode: 'backfill',
    listed: 3,
    alreadyStored: 0,
    detailRequests: 3,
    inserted: 3,
  })
})

test('backfill limita la carga a las publicaciones más recientes solicitadas', async () => {
  const requestedStarts: number[] = []
  let insertedCodes: readonly number[] = []
  const olderNotes: readonly SidofNotaReference[] = [
    { codNota: 203, publicationDate: '2010-11-10', title: 'Nota 203' },
    { codNota: 202, publicationDate: '2010-11-09', title: 'Nota 202' },
    { codNota: 201, publicationDate: '2010-11-08', title: 'Nota 201' },
    { codNota: 200, publicationDate: '2010-11-07', title: 'Nota 200' },
  ]

  const summary = await ingestLatest(
    'backfill',
    {
      notes: {
        async scrape(start = 0) {
          requestedStarts.push(start)
          return olderNotes.slice(start, start + 2)
        },
      },
      details: {
        async scrape(note) {
          return scrapedItem(note)
        },
      },
    },
    {
      async findExistingCodNotas() {
        return new Set()
      },
      async insertIfAbsent(records) {
        insertedCodes = records.map((record) => record.codNota)
        return records.length
      },
    },
    { publicationLimit: 3 },
  )

  assert.deepEqual(requestedStarts, [0, 2])
  assert.deepEqual(insertedCodes, [203, 202, 201])
  assert.deepEqual(summary, {
    mode: 'backfill',
    listed: 3,
    alreadyStored: 0,
    detailRequests: 3,
    inserted: 3,
  })
})
