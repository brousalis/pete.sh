/**
 * PeteCoach worker.
 *
 * Runs under PM2 on the home machine alongside the existing petehome sync
 * worker. Three responsibilities:
 *
 *   Schedule  cron-style jobs through pg-boss, which stores its queue in the
 *             same Supabase Postgres, so no Redis and no extra service.
 *   Listen    a Postgres NOTIFY on new activities triggers a debrief within
 *             minutes rather than at the next poll.
 *   Report    a heartbeat endpoint so a stale worker is detectable.
 *
 * Jobs run here rather than in Vercel functions because the Sunday planning
 * loop legitimately takes minutes, and because a scheduled coach that stops
 * working when a serverless timeout changes is not a coach.
 */

import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'
import PgBoss from 'pg-boss'
import { Client as PgClient } from 'pg'

import {
  runBlockReview,
  runDebrief,
  runEveningNudge,
  runMorningBriefing,
  runNightlyMaintenance,
  runPtReminder,
  runWeeklyPlan,
  type JobResult,
} from './jobs.js'

// fileURLToPath: URL.pathname on Windows is `/C:/...`, which dotenv cannot open.
loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)) })
loadEnv({ path: fileURLToPath(new URL('../../web/.env.local', import.meta.url)) })
loadEnv({ path: fileURLToPath(new URL('../../web/.env', import.meta.url)) })

const TIMEZONE = 'America/Chicago'
const PORT = Number(process.env.COACH_WORKER_PORT ?? 3021)

interface HealthState {
  startedAt: string
  lastJobAt: string | null
  lastJobName: string | null
  lastError: string | null
  jobsRun: number
  jobsFailed: number
  listenerConnected: boolean
}

const health: HealthState = {
  startedAt: new Date().toISOString(),
  lastJobAt: null,
  lastJobName: null,
  lastError: null,
  jobsRun: 0,
  jobsFailed: 0,
  listenerConnected: false,
}

function log(message: string): void {
  console.log(`[coach-worker] ${new Date().toISOString()} ${message}`)
}

/** Wrap a job so one failure cannot take the worker down. */
function guard(name: string, run: () => Promise<JobResult>) {
  return async () => {
    log(`${name} starting`)
    try {
      const result = await run()
      health.jobsRun++
      health.lastJobAt = new Date().toISOString()
      health.lastJobName = name
      if (!result.ok) health.lastError = `${name}: ${result.summary}`
      log(
        `${name} finished: ${result.summary}${result.costUsd ? ` ($${result.costUsd.toFixed(4)})` : ''}`
      )
      return result
    } catch (error) {
      health.jobsFailed++
      health.lastError = `${name}: ${error instanceof Error ? error.message : String(error)}`
      log(`${name} FAILED: ${health.lastError}`)
      throw error
    }
  }
}

function databaseUrl(): string {
  const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'SUPABASE_DB_URL is required. The worker needs a direct Postgres connection for pg-boss and LISTEN.'
    )
  }
  return url
}

async function startScheduler(): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString: databaseUrl(),
    // Keep pg-boss's tables out of public so they do not mix with app schema.
    schema: 'pgboss',
    retryLimit: 2,
    retryBackoff: true,
  })

  boss.on('error', (error) => {
    health.lastError = `pg-boss: ${error.message}`
    log(`pg-boss error: ${error.message}`)
  })

  await boss.start()

  const register = async (
    queue: string,
    handler: () => Promise<JobResult>,
    cron?: string
  ): Promise<void> => {
    await boss.createQueue(queue).catch(() => undefined)
    await boss.work(queue, { batchSize: 1 }, async () => {
      await guard(queue, handler)()
    })
    if (cron) {
      await boss.schedule(queue, cron, undefined, { tz: TIMEZONE })
      log(`scheduled ${queue} at "${cron}" ${TIMEZONE}`)
    }
  }

  // 05:30 briefing, after overnight HealthKit sync has landed.
  await register('coach-briefing', runMorningBriefing, '30 5 * * *')
  // 06:15 activation block reminder.
  await register('coach-pt-morning', () => runPtReminder('morning'), '15 6 * * *')
  // 20:00 armor block reminder, 20:30 catch-all nudge.
  await register('coach-pt-evening', () => runPtReminder('evening'), '0 20 * * *')
  await register('coach-nudge', runEveningNudge, '30 20 * * *')
  // Sunday 18:00 planning for the week starting Monday.
  await register('coach-weekly-plan', runWeeklyPlan, '0 18 * * 0')
  // 02:30 maintenance, well clear of the briefing.
  await register('coach-nightly', runNightlyMaintenance, '30 2 * * *')

  // Block review runs on demand from the CLI or the last Sunday of a block.
  await register('coach-block-review', runBlockReview)

  // Debrief is triggered by the activity listener, not a schedule.
  await boss.createQueue('coach-debrief').catch(() => undefined)
  await boss.work<{ activityId: string }>('coach-debrief', { batchSize: 1 }, async (jobs) => {
    for (const job of jobs) {
      const activityId = job.data?.activityId
      if (!activityId) continue
      await guard('coach-debrief', () => runDebrief(activityId))()
    }
  })

  return boss
}

/**
 * Listen for new activities.
 *
 * The trigger added in migration 038 emits a NOTIFY on insert, so a synced
 * workout produces a debrief within minutes. Falls back to reconnecting on
 * error; a dropped listener would silently stop all debriefs.
 */
async function startActivityListener(boss: PgBoss): Promise<void> {
  let client: PgClient | null = null
  let reconnectDelay = 1000

  const connect = async (): Promise<void> => {
    try {
      client = new PgClient({ connectionString: databaseUrl() })

      client.on('error', (error) => {
        health.listenerConnected = false
        log(`activity listener error: ${error.message}`)
        void reconnect()
      })

      client.on('end', () => {
        health.listenerConnected = false
        void reconnect()
      })

      client.on('notification', (message) => {
        if (message.channel !== 'coach_activity' || !message.payload) return

        try {
          const payload = JSON.parse(message.payload) as {
            activity_id?: string
            workout_type?: string
          }
          if (!payload.activity_id) return

          log(`activity ${payload.workout_type ?? 'unknown'} synced; queueing debrief`)

          // Delayed so late-arriving samples (route, splits) land first, and
          // so a batch sync of several workouts does not fire many debriefs
          // at once.
          void boss.send(
            'coach-debrief',
            { activityId: payload.activity_id },
            { startAfter: 120, singletonKey: payload.activity_id }
          )
        } catch (error) {
          log(`failed to handle notification: ${error}`)
        }
      })

      await client.connect()
      await client.query('LISTEN coach_activity')

      health.listenerConnected = true
      reconnectDelay = 1000
      log('listening for new activities')
    } catch (error) {
      health.listenerConnected = false
      log(`activity listener connect failed: ${error instanceof Error ? error.message : error}`)
      void reconnect()
    }
  }

  const reconnect = async (): Promise<void> => {
    if (client) {
      try {
        await client.end()
      } catch {
        // Already closed.
      }
      client = null
    }

    const delay = reconnectDelay
    reconnectDelay = Math.min(reconnectDelay * 2, 60_000)
    setTimeout(() => void connect(), delay)
  }

  await connect()
}

/** Heartbeat so a stale or dead worker is visible from the dashboard. */
function startHealthServer(): void {
  const server = createServer((request, response) => {
    if (request.url === '/healthz') {
      const stale =
        health.lastJobAt != null &&
        Date.now() - new Date(health.lastJobAt).getTime() > 36 * 60 * 60 * 1000

      response.writeHead(stale ? 503 : 200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ ...health, stale, now: new Date().toISOString() }, null, 2))
      return
    }

    response.writeHead(404)
    response.end()
  })

  server.listen(PORT, () => log(`health endpoint on :${PORT}/healthz`))
}

async function main(): Promise<void> {
  log('starting')

  startHealthServer()

  const boss = await startScheduler()
  await startActivityListener(boss)

  log('ready')

  const shutdown = async (signal: string): Promise<void> => {
    log(`${signal} received, shutting down`)
    try {
      await boss.stop({ graceful: true, timeout: 30_000 })
    } catch (error) {
      log(`shutdown error: ${error}`)
    }
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  // A rejected promise anywhere must not silently kill the scheduler.
  process.on('unhandledRejection', (reason) => {
    health.lastError = `unhandled rejection: ${reason}`
    log(`unhandled rejection: ${reason}`)
  })
}

main().catch((error) => {
  console.error('[coach-worker] fatal:', error)
  process.exit(1)
})
