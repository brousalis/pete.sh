import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const envPath = join(root, 'apps', 'web', '.env')
const outPath = join(root, 'apps', 'ios', 'Config.xcconfig')

if (!existsSync(envPath)) {
  console.error('apps/web/.env not found')
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      const key = line.slice(0, index).trim()
      const value = line
        .slice(index + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '')
      return [key, value]
    })
)

// Prefer PETEWATCH (phone already uses it); fall back to COACH. Server accepts either.
const key = env.PETEWATCH_API_KEY || env.COACH_API_KEY || ''
const server =
  env.PETEHOME_SERVER_URL ||
  env.COACH_CLI_UI_URL?.replace(/\/coach\/?$/, '') ||
  'https://192.168.1.4:1337'

function xcLine(name, value) {
  if (value.includes('//') || value.includes('=')) {
    console.warn(`${name} contains xcconfig-unsafe characters`)
  }
  return `${name} = ${value}`
}

/** xcconfig treats `//` as a comment — break https:// via `$()`. */
function xcHttpsUrl(url) {
  return url.replace(/^https:\/\//, 'https:/$()/')
}

const body = [
  '// Generated from apps/web/.env — gitignored. Do not commit.',
  '// One machine key for ingest + coach bearers.',
  xcLine('PETEHOME_API_KEY', key),
  `PETEHOME_SERVER_URL = ${xcHttpsUrl(server)}`,
  '',
].join('\n')

writeFileSync(outPath, body)
console.log(
  `wrote Config.xcconfig key=${key ? `${key.length}chars` : 'MISSING'} url=${server}`
)
