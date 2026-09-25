/**
 * petehome worker (CLI / optional local health).
 *
 * Scheduled jobs and post-workout debriefs run on Vercel cron
 * (`/api/cron/[job]`). This process no longer registers pg-boss schedules or
 * LISTEN — leaving it running alongside production would double-fire jobs.
 *
 * Use `yarn job <name>` (this package) or curl the cron route for manual runs.
 */

import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

// fileURLToPath: URL.pathname on Windows is `/C:/...`, which dotenv cannot open.
loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)) })
loadEnv({ path: fileURLToPath(new URL('../../web/.env.local', import.meta.url)) })
loadEnv({ path: fileURLToPath(new URL('../../web/.env', import.meta.url)) })

const PORT = Number(process.env.COACH_WORKER_PORT ?? 1338)

function log(message: string): void {
  console.log(`[coach-worker] ${new Date().toISOString()} ${message}`)
}

function startHealthServer(): void {
  const server = createServer((request, response) => {
    if (request.url === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(
        JSON.stringify(
          {
            ok: true,
            scheduler: 'disabled',
            note: 'Crons and debrief-sweep run on Vercel (/api/cron/*). Stop this process in production to avoid confusion.',
            now: new Date().toISOString(),
          },
          null,
          2
        )
      )
      return
    }

    response.writeHead(404)
    response.end()
  })

  server.listen(PORT, () => log(`health endpoint on :${PORT}/healthz (scheduler disabled)`))
}

async function main(): Promise<void> {
  log('starting (scheduler disabled — jobs run on Vercel cron)')
  startHealthServer()
  log('ready')
}

main().catch((error) => {
  console.error('[coach-worker] fatal:', error)
  process.exit(1)
})
