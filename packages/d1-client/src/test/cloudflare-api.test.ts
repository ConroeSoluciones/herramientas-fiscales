import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CloudflareApiD1Database,
  createCloudflareD1DatabaseFromEnvironment,
} from '../index.js'

test('the REST client sends parameterized SQL with the D1 API token', async () => {
  let requestUrl = ''
  let requestInit: RequestInit | undefined
  const database = new CloudflareApiD1Database({
    accountId: 'account id',
    databaseId: 'database/id',
    apiToken: 'secret-token',
    fetch: async (input, init) => {
      requestUrl = String(input)
      requestInit = init
      return Response.json({
        success: true,
        result: [
          {
            success: true,
            results: [{ answer: 42 }],
            meta: { changes: 0, last_row_id: 0 },
          },
        ],
      })
    },
  })

  const result = await database
    .prepare('SELECT answer FROM facts WHERE id = ?')
    .bind(7)
    .all<{ answer: number }>()

  assert.equal(
    requestUrl,
    'https://api.cloudflare.com/client/v4/accounts/account%20id/d1/database/database%2Fid/query',
  )
  assert.equal(
    new Headers(requestInit?.headers).get('authorization'),
    'Bearer secret-token',
  )
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    sql: 'SELECT answer FROM facts WHERE id = ?',
    params: ['7'],
  })
  assert.deepEqual(result.results, [{ answer: 42 }])
})

test('the REST client sends D1 batches as one atomic API request', async () => {
  let requestBody: unknown
  const database = new CloudflareApiD1Database({
    accountId: 'account',
    databaseId: 'database',
    apiToken: 'token',
    fetch: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body))
      return Response.json({
        success: true,
        result: [
          { success: true, results: [], meta: { changes: 1, last_row_id: 1 } },
          { success: true, results: [], meta: { changes: 1, last_row_id: 2 } },
        ],
      })
    },
  })

  const results = await database.batch([
    database.prepare('INSERT INTO test (value) VALUES (?)').bind('a'),
    database.prepare('INSERT INTO test (value) VALUES (?)').bind('b'),
  ])

  assert.deepEqual(requestBody, {
    batch: [
      { sql: 'INSERT INTO test (value) VALUES (?)', params: ['a'] },
      { sql: 'INSERT INTO test (value) VALUES (?)', params: ['b'] },
    ],
  })
  assert.equal(
    results.reduce((count, result) => count + result.meta.changes, 0),
    2,
  )
})

test('environment factory requires the Cloudflare credentials', () => {
  assert.throws(
    () => createCloudflareD1DatabaseFromEnvironment({}),
    /CLOUDFLARE_ACCOUNT_ID/,
  )
})
