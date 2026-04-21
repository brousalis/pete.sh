#!/usr/bin/env node
/**
 * Restore tmp/prod-schema.sql + tmp/prod-data.sql into the local Supabase stack
 * (started by `supabase start`), then re-apply the standard Supabase role grants
 * so PostgREST anon/authenticated requests work.
 *
 * Usage:
 *   node scripts/db-restore-local.mjs
 *
 * Assumes the local stack is running on the ports configured in
 * supabase/config.toml (default: DB on 55322).
 */
import { spawnSync, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const tmpDir = resolve(repoRoot, 'tmp')
const schemaSql = resolve(tmpDir, 'prod-schema.sql')
const dataSql = resolve(tmpDir, 'prod-data.sql')

for (const p of [schemaSql, dataSql]) {
  if (!existsSync(p)) {
    console.error(`ERROR: missing ${p}\n       Run \`yarn db:dump:prod\` first.`)
    process.exit(1)
  }
}

function readLocalDbUrl() {
  if (process.env.LOCAL_DB_URL) return process.env.LOCAL_DB_URL
  try {
    const out = execSync('supabase status -o env', {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    const match = out.match(/^DB_URL="([^"]+)"/m)
    if (match) return match[1]
  } catch (err) {
    console.error('Failed to read `supabase status`:', err.message)
  }
  return 'postgresql://postgres:postgres@127.0.0.1:55322/postgres'
}

const rawUrl = readLocalDbUrl()
const url = new URL(rawUrl)
const env = {
  ...process.env,
  PGPASSWORD: decodeURIComponent(url.password || 'postgres'),
}
const connArgs = [
  '-h',
  url.hostname,
  '-p',
  url.port || '55322',
  '-U',
  decodeURIComponent(url.username || 'postgres'),
  '-d',
  decodeURIComponent((url.pathname || '/postgres').replace(/^\//, '')),
]

function psql(label, args, opts = {}) {
  console.log(`\n=== ${label} ===`)
  const started = Date.now()
  const result = spawnSync('psql', [...connArgs, ...args], {
    env,
    stdio: opts.quiet
      ? ['ignore', 'ignore', 'inherit']
      : ['ignore', 'inherit', 'inherit'],
  })
  if (result.status !== 0 && !opts.allowFailure) {
    console.error(`FAILED: ${label} (exit ${result.status})`)
    process.exit(result.status ?? 1)
  }
  console.log(`DONE: ${label} in ${Date.now() - started}ms`)
}

psql('Drop + recreate public schema', [
  '-v',
  'ON_ERROR_STOP=1',
  '-c',
  'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;',
])

psql(
  'Restore schema',
  ['-v', 'ON_ERROR_STOP=0', '--quiet', '-f', schemaSql],
  { quiet: true, allowFailure: true }
)

psql(
  'Restore data',
  ['-v', 'ON_ERROR_STOP=0', '--quiet', '-f', dataSql],
  { quiet: true, allowFailure: true }
)

const grantsSql = `
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE, UPDATE ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
`

psql('Apply Supabase role grants + NOTIFY pgrst reload', [
  '-v',
  'ON_ERROR_STOP=1',
  '-c',
  grantsSql,
])

console.log('\nLocal DB restored from tmp/prod-*.sql.')
console.log('Point apps/web/.env.local at the local stack and restart `yarn dev`.')
