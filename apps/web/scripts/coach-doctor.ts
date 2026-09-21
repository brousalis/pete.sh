/**
 * Setup check.
 *
 * Verifies the things that fail silently: a missing secret that only shows up
 * as an empty briefing, an RLS policy that never got applied, a retention job
 * still deleting training samples, a worker that stopped a week ago.
 *
 * Run after deploying and whenever something looks wrong.
 *
 *   yarn coach:doctor
 */

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

type Status = 'ok' | 'warn' | 'fail'

interface Check {
  name: string
  status: Status
  detail: string
  fix?: string
}

const checks: Check[] = []

function record(name: string, status: Status, detail: string, fix?: string): void {
  checks.push({ name, status, detail, fix })
}

// ---------------------------------------------------------------------------

function checkEnvironment(): void {
  const required = [
    ['ANTHROPIC_API_KEY', 'The coach cannot run without it.'],
    ['NEXT_PUBLIC_SUPABASE_URL', 'No database.'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'coach_* and apple_health_* deny anon; nothing will read.'],
  ] as const

  for (const [key, why] of required) {
    if (process.env[key]) record(key, 'ok', 'set')
    else record(key, 'fail', `missing — ${why}`)
  }

  const secret = process.env.COACH_SESSION_SECRET
  if (secret) {
    record('COACH_SESSION_SECRET', 'ok', 'set (unused — coach gate is open)')
  } else {
    record('COACH_SESSION_SECRET', 'ok', 'not required — coach gate is open')
  }

  const code = process.env.COACH_ACCESS_CODE
  if (code) {
    record('COACH_ACCESS_CODE', 'ok', 'set (unused — coach gate is open)')
  } else {
    record('COACH_ACCESS_CODE', 'ok', 'not required — coach gate is open')
  }

  const apiKey = process.env.COACH_API_KEY
  if (!apiKey) {
    record(
      'COACH_API_KEY',
      'warn',
      'missing — the watch, the MCP endpoint and the calendar feed will all reject',
      'openssl rand -base64 36'
    )
  } else {
    record('COACH_API_KEY', 'ok', 'set')
  }

  const optional: [string, string][] = [
    ['VOYAGE_API_KEY', 'knowledge search and memory recall fall back to keyword only'],
    ['SUPABASE_DB_URL', 'the worker cannot run scheduled jobs'],
    ['VAPID_PUBLIC_KEY', 'no web push'],
    ['APNS_KEY_ID', 'no iPhone push'],
  ]

  for (const [key, consequence] of optional) {
    if (process.env[key]) record(key, 'ok', 'set')
    else record(key, 'warn', `not set — ${consequence}`)
  }

  // The key that shipped in the public repo must not still be in use.
  if (process.env.PETEWATCH_API_KEY === '6PsAdgrT3eOZ2wtXlUCDGoxEnKvWFRhkY8Jfq4QN7a19cLBp') {
    record(
      'PETEWATCH_API_KEY',
      'fail',
      'still the key that was committed to a public repo',
      'Rotate it, update Config.xcconfig, and reinstall the app'
    )
  } else if (process.env.PETEWATCH_API_KEY) {
    record('PETEWATCH_API_KEY', 'ok', 'rotated')
  }
}

async function checkDatabase(): Promise<void> {
  const { getSupabaseServiceClient } = await import('../lib/supabase/client')
  const db = getSupabaseServiceClient()

  if (!db) {
    record('database', 'fail', 'no service client; skipping every database check')
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any

  const tables = [
    'coach_athlete_profile',
    'coach_injury',
    'coach_pt_protocol',
    'coach_macrocycle',
    'coach_planned_session',
    'coach_activity_load',
    'coach_daily_readiness',
    'coach_memory',
    'coach_agent_run',
    'coach_cost_budget',
  ]

  for (const table of tables) {
    const { error } = await client.from(table).select('*', { head: true, count: 'exact' })
    if (error) {
      record(`table ${table}`, 'fail', error.message, 'yarn migrate')
    }
  }

  if (!checks.some((check) => check.name.startsWith('table ') && check.status === 'fail')) {
    record('coach schema', 'ok', `all ${tables.length} core tables reachable`)
  }

  // Seed data
  const { data: profile } = await client
    .from('coach_athlete_profile')
    .select('name, goal_race_date')
    .eq('is_active', true)
    .maybeSingle()

  if (profile) {
    const daysToRace = Math.round(
      (new Date(profile.goal_race_date).getTime() - Date.now()) / 86_400_000
    )
    record('athlete profile', 'ok', `${profile.name}, ${daysToRace} days to race`)
  } else {
    record('athlete profile', 'fail', 'no active profile', 'Apply migration 040')
  }

  const { count: ptCount } = await client
    .from('coach_pt_protocol')
    .select('id', { head: true, count: 'exact' })
    .eq('is_mandatory', true)

  if ((ptCount ?? 0) >= 2) {
    record('PT protocols', 'ok', `${ptCount} mandatory blocks seeded`)
  } else {
    record(
      'PT protocols',
      'fail',
      `only ${ptCount ?? 0} mandatory blocks; the guardrail that protects them has nothing to protect`,
      'Apply migration 040'
    )
  }

  const { count: sessionCount } = await client
    .from('coach_planned_session')
    .select('id', { head: true, count: 'exact' })

  if ((sessionCount ?? 0) > 0) {
    record('plan', 'ok', `${sessionCount} sessions scheduled`)
  } else {
    record('plan', 'warn', 'no sessions yet', 'Apply migration 041, or run the weekly plan job')
  }

  const { data: intake } = await client
    .from('coach_constraint')
    .select('id')
    .eq('kind', 'preference')
    .eq('label', 'intake_complete')
    .eq('is_active', true)
    .maybeSingle()

  if (intake) {
    record('intake', 'ok', 'interview saved')
  } else {
    record('intake', 'warn', 'not completed', 'Open /coach/onboard')
  }

  // pgvector
  const { error: vectorError } = await client.rpc('coach_match_chunks', {
    query_embedding: `[${new Array(1024).fill(0).join(',')}]`,
    match_count: 1,
    min_similarity: 0,
  })

  if (vectorError) {
    record('pgvector', 'fail', vectorError.message, 'CREATE EXTENSION vector; then yarn migrate')
  } else {
    record('pgvector', 'ok', 'vector search available')
  }

  // Retention: the default used to delete training samples after 90 days.
  const { data: oldSamples } = await client
    .from('apple_health_hr_samples')
    .select('timestamp')
    .order('timestamp', { ascending: true })
    .limit(1)

  if (oldSamples?.[0]) {
    const ageDays = Math.round(
      (Date.now() - new Date(oldSamples[0].timestamp).getTime()) / 86_400_000
    )
    if (ageDays > 95) {
      record('sample retention', 'ok', `oldest heart rate sample is ${ageDays} days old`)
    } else {
      record(
        'sample retention',
        'warn',
        `oldest sample is only ${ageDays} days old — either the history is short, or the 90-day cleanup is still running`,
        'Confirm migration 038 was applied'
      )
    }
  }

  // Knowledge base
  const { count: docCount } = await client
    .from('coach_document')
    .select('id', { head: true, count: 'exact' })

  if ((docCount ?? 0) > 0) {
    record('knowledge base', 'ok', `${docCount} documents indexed`)
  } else {
    record(
      'knowledge base',
      'warn',
      'empty — the coach cannot cite sources',
      'yarn coach:ingest --dir ./data/knowledge'
    )
  }

  // Budget
  const { data: budgets } = await client
    .from('coach_cost_budget')
    .select('period, cap_usd, spent_usd')

  if (budgets?.length) {
    const summary = (budgets as { period: string; cap_usd: number; spent_usd: number }[])
      .map((row) => `${row.period} $${Number(row.spent_usd).toFixed(2)}/$${Number(row.cap_usd).toFixed(2)}`)
      .join(', ')
    record('cost budget', 'ok', summary)
  } else {
    record('cost budget', 'warn', 'no budget rows; caps fall back to defaults')
  }
}

async function checkWorker(): Promise<void> {
  const port = process.env.COACH_WORKER_PORT ?? '3021'

  try {
    const response = await fetch(`http://localhost:${port}/healthz`, {
      signal: AbortSignal.timeout(3000),
    })
    const health = (await response.json()) as {
      lastJobAt: string | null
      lastJobName: string | null
      jobsRun: number
      jobsFailed: number
      listenerConnected: boolean
      stale: boolean
    }

    if (health.stale) {
      record(
        'coach worker',
        'warn',
        `running but no job since ${health.lastJobAt}`,
        'Check pm2 logs petehome-worker'
      )
    } else {
      record(
        'coach worker',
        'ok',
        `${health.jobsRun} jobs run, ${health.jobsFailed} failed, last was ${health.lastJobName ?? 'none yet'}`
      )
    }

    if (!health.listenerConnected) {
      record(
        'activity listener',
        'warn',
        'not connected — post-workout debriefs will not fire',
        'Check SUPABASE_DB_URL'
      )
    } else {
      record('activity listener', 'ok', 'connected')
    }
  } catch {
    record(
      'coach worker',
      'warn',
      'not reachable — scheduled briefings, debriefs and the weekly plan will not run',
      'yarn p:start:coach'
    )
  }
}

async function checkModel(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return

  try {
    const { generateText } = await import('ai')
    const { anthropic } = await import('@ai-sdk/anthropic')
    const { MODELS } = await import('@petehome/coach-core')

    const result = await generateText({
      model: anthropic(MODELS.fast.id),
      prompt: 'Reply with the single word: ready',
      maxOutputTokens: 10,
    })

    if (result.text.toLowerCase().includes('ready')) {
      record('Claude API', 'ok', `${MODELS.fast.id} responded`)
    } else {
      record('Claude API', 'warn', `unexpected reply: ${result.text.slice(0, 40)}`)
    }
  } catch (error) {
    record(
      'Claude API',
      'fail',
      error instanceof Error ? error.message : 'call failed',
      'Check ANTHROPIC_API_KEY and that the pinned model IDs still exist'
    )
  }
}

async function checkAnalytics(): Promise<void> {
  try {
    const { getLoadSummary, resolveThresholds } = await import(
      '../lib/services/coach/analytics.service'
    )

    const [load, thresholds] = await Promise.all([getLoadSummary(90), resolveThresholds()])

    record(
      'analytics',
      'ok',
      `CTL ${load.current?.ctl?.toFixed(0) ?? '—'}, ACWR ${load.acwr?.toFixed(2) ?? '—'}, ${load.pmc.length} days of PMC`
    )

    const missing: string[] = []
    if (!thresholds.cssSpeed) missing.push('CSS')
    if (!thresholds.vdot) missing.push('VDOT')
    if (!thresholds.ftpWatts) missing.push('FTP')

    if (missing.length) {
      record(
        'thresholds',
        'warn',
        `${missing.join(', ')} not set — load falls back to heart rate, and the race projection uses budget placeholders`,
        'Run the baseline tests in week 3'
      )
    } else {
      record('thresholds', 'ok', 'CSS, VDOT and FTP all set')
    }
  } catch (error) {
    record('analytics', 'fail', error instanceof Error ? error.message : 'failed')
  }
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\npetehome setup check\n' + '='.repeat(60))

  checkEnvironment()
  await checkDatabase()
  await checkAnalytics()
  await checkWorker()
  await checkModel()

  console.log('')

  const width = Math.max(...checks.map((check) => check.name.length)) + 2

  for (const check of checks) {
    const marker = check.status === 'ok' ? ' ok ' : check.status === 'warn' ? 'warn' : 'FAIL'
    console.log(`  ${marker}  ${check.name.padEnd(width)} ${check.detail}`)
    if (check.fix && check.status !== 'ok') {
      console.log(`        ${' '.repeat(width)} → ${check.fix}`)
    }
  }

  const failed = checks.filter((check) => check.status === 'fail').length
  const warned = checks.filter((check) => check.status === 'warn').length

  console.log('\n' + '='.repeat(60))
  console.log(
    `${checks.length - failed - warned} ok, ${warned} warnings, ${failed} failures\n`
  )

  if (failed > 0) {
    console.log('Fix the failures before relying on the coach.\n')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Setup check failed:', error)
  process.exit(1)
})
