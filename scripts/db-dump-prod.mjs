#!/usr/bin/env node
/**
 * Dump prod Supabase `public` schema (schema + data) into `tmp/`.
 *
 * Usage:
 *   PROD_DB_URL="postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres" \
 *     node scripts/db-dump-prod.mjs
 *
 * Notes:
 *   - Must use the SESSION pooler (port 5432), not the transaction pooler (6543);
 *     pg_dump requires session-mode connections.
 *   - Falls back to SUPABASE_DB_URL if PROD_DB_URL is unset, but warns if the URL
 *     points at the transaction pooler (port 6543).
 *   - Writes tmp/prod-schema.sql and tmp/prod-data.sql (gitignored).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const tmpDir = resolve(repoRoot, 'tmp')

const rawUrl = process.env.PROD_DB_URL || process.env.SUPABASE_DB_URL
if (!rawUrl) {
  console.error(
    'ERROR: set PROD_DB_URL (or SUPABASE_DB_URL) to the prod Supabase session-pooler URL.\n' +
      '       Example: postgresql://postgres.<ref>:<password>@aws-1-us-east-2.pooler.supabase.com:5432/postgres'
  )
  process.exit(1)
}

if (/:6543\//.test(rawUrl)) {
  console.warn(
    'WARN: URL uses the transaction pooler (port 6543). pg_dump requires the session pooler (port 5432). Switching port to 5432 for this run.'
  )
}

const url = new URL(rawUrl)
if (url.port === '6543') url.port = '5432'

if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

const env = {
  ...process.env,
  PGPASSWORD: decodeURIComponent(url.password || ''),
}
const connArgs = [
  '-h',
  url.hostname,
  '-p',
  url.port || '5432',
  '-U',
  decodeURIComponent(url.username || 'postgres'),
  '-d',
  decodeURIComponent((url.pathname || '/postgres').replace(/^\//, '')),
]

function run(label, file, extraArgs) {
  const outPath = resolve(tmpDir, file)
  console.log(`\n=== ${label} → ${outPath} ===`)
  const started = Date.now()
  const result = spawnSync(
    'pg_dump',
    [
      ...connArgs,
      '--no-owner',
      '--no-privileges',
      '--schema=public',
      '--file',
      outPath,
      ...extraArgs,
    ],
    { env, stdio: ['ignore', 'inherit', 'inherit'] }
  )
  if (result.status !== 0) {
    console.error(`FAILED: ${label} (exit ${result.status})`)
    process.exit(result.status ?? 1)
  }
  console.log(`DONE: ${label} in ${Date.now() - started}ms`)
}

run('Schema only', 'prod-schema.sql', ['--schema-only'])
run('Data only', 'prod-data.sql', [
  '--data-only',
  '--disable-triggers',
])

console.log('\nAll done. Wrote:')
console.log('  tmp/prod-schema.sql')
console.log('  tmp/prod-data.sql')
