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

const ingest = env.PETEWATCH_API_KEY ?? ''
const coach = env.COACH_API_KEY ?? ''

function xcLine(name, value) {
  if (value.includes('//') || value.includes('=')) {
    console.warn(`${name} contains xcconfig-unsafe characters`)
  }
  return `${name} = ${value}`
}

const body = [
  '// Generated from apps/web/.env — gitignored. Do not commit.',
  xcLine('PETEHOME_API_KEY', ingest),
  xcLine('PETEHOME_COACH_API_KEY', coach),
  'PETEHOME_SERVER_URL = https:/$()/www.pete.sh',
  '',
].join('\n')

writeFileSync(outPath, body)
console.log(
  `wrote Config.xcconfig ingest=${ingest ? `${ingest.length}chars` : 'MISSING'} coach=${coach ? `${coach.length}chars` : 'MISSING'}`
)
