/**
 * Run Supabase migrations (same behavior as petehome-cli migrate run).
 * Uses SUPABASE_DB_URL from .env, applies apps/web/supabase/migrations/*.sql
 * in order and records them in supabase_migrations.schema_migrations.
 */

const path = require('path')
const fs = require('fs')

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
} catch (e) {
  // dotenv optional
}

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations')
const MIGRATION_SCHEMA = 'supabase_migrations'
const MIGRATION_TABLE = 'schema_migrations'

function getDbUrl() {
  const url = (process.env.SUPABASE_DB_URL || '').trim()
  if (url && !url.startsWith('your-')) return url
  return null
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => path.join(MIGRATIONS_DIR, name))
}

async function run() {
  const url = getDbUrl()
  if (!url) {
    console.error('SUPABASE_DB_URL not set. Set it in apps/web/.env (Postgres URI from Supabase dashboard).')
    process.exit(1)
  }

  const files = listMigrationFiles()
  if (files.length === 0) {
    console.error('No migration files in', MIGRATIONS_DIR)
    process.exit(1)
  }

  const { Client } = require('pg')
  const client = new Client({ connectionString: url })

  try {
    await client.connect()
  } catch (e) {
    console.error('Connection failed:', e.message)
    process.exit(1)
  }

  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATION_SCHEMA}`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (
        version TEXT PRIMARY KEY
      )
    `)

    let applied = new Set()
    try {
      const res = await client.query(`SELECT version FROM ${MIGRATION_SCHEMA}.${MIGRATION_TABLE}`)
      res.rows.forEach((r) => applied.add(r.version))
    } catch (_) {}

    const pending = files.filter((f) => !applied.has(path.basename(f)))
    if (pending.length === 0) {
      console.log('No pending migrations.')
      await client.end()
      return
    }

    for (const filePath of pending) {
      const name = path.basename(filePath)
      const sql = fs.readFileSync(filePath, 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          `INSERT INTO ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (version) VALUES ($1)`,
          [name]
        )
        await client.query('COMMIT')
        console.log('Applied:', name)
      } catch (e) {
        await client.query('ROLLBACK')
        console.error('Failed:', name, e.message)
        await client.end()
        process.exit(1)
      }
    }

    console.log('Applied', pending.length, 'migration(s).')
  } finally {
    await client.end()
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
