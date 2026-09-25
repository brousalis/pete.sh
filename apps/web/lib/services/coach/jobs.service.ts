/**
 * Scheduled coaching jobs.
 *
 * Plain async functions so they can run from Vercel cron (`/api/cron/[job]`),
 * the worker CLI, or a one-off curl. They reuse the same services as chat so
 * Sunday planning and an ad-hoc question produce consistent coaching.
 *
 * Every job degrades rather than failing: when the Claude budget is exhausted,
 * the briefing still goes out from deterministic analytics.
 */

import {
  daysAgo,
  formatTime,
  isoWeekStart,
  readinessGuidance,
} from '@petehome/coach-core'

import { syncPolarSleep } from '@/lib/services/polar.service'

import { linkWorkoutToPlannedSession, refreshWeekActualLoad } from './adherence.service'
import { computeActivityLoad, computeAndStoreReadiness, getLoadSummary, getRaceProjection, nightlyRecompute } from './analytics.service'
import {
  coachDb,
  getActivity,
  getCurrentBlock,
  getPtProtocols,
  getSessionsInRange,
  getSymptoms,
} from './coach-data.service'
import { getWeatherContext } from './environment.service'
import { backfillMemoryEmbeddings, decayMemories } from './memory.service'
import { sendCoachNotification } from './notify.service'
import { autoDowngradeToday } from './plan.service'
import { runCoachJob } from './runtime.service'

export interface JobResult {
  job: string
  ok: boolean
  summary: string
  costUsd?: number
  detail?: Record<string, unknown>
}

function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

// ---------------------------------------------------------------------------
// Morning briefing
// ---------------------------------------------------------------------------

/**
 * 05:30 briefing.
 *
 * Auto-downgrades run first: if a guardrail already blocks today's session,
 * the briefing should describe the corrected plan rather than one the athlete
 * is not allowed to do.
 */
export async function runMorningBriefing(): Promise<JobResult> {
  const date = today()

  const downgrades = await autoDowngradeToday().catch((error) => {
    console.error('[coach] Auto-downgrade failed:', error)
    return { downgraded: [], report: null }
  })

  const [readiness, sessions, weather] = await Promise.all([
    computeAndStoreReadiness(date).catch(() => null),
    getSessionsInRange(date, date),
    getWeatherContext(date).catch(() => null),
  ])

  const redFlag = downgrades.report?.violations.some(
    (violation) => violation.severity === 'red_flag'
  )

  const result = await runCoachJob({
    job: 'briefing',
    prompt: buildBriefingPrompt(date, downgrades.downgraded.length, redFlag ?? false),
    focus: 'today training readiness plan',
    maxOutputTokens: 900,
    templateFallback: () =>
      templateBriefing({
        date,
        readinessScore: readiness?.score ?? null,
        readinessLevel: readiness?.level ?? null,
        sessions: sessions.map((session) => ({
          title: session.title,
          sport: session.sport,
          durationMinutes: session.plannedDurationSeconds
            ? Math.round(session.plannedDurationSeconds / 60)
            : null,
        })),
        weatherSummary: weather?.summary ?? null,
        trainingNotes: weather?.trainingNotes ?? [],
        downgradeCount: downgrades.downgraded.length,
      }),
  })

  await sendCoachNotification({
    title: redFlag ? 'petehome — hold training' : 'Morning briefing',
    body: firstLine(result.text, 180),
    tag: 'briefing',
    url: '/coach',
    urgent: redFlag ?? false,
  })

  await storeBriefing(date, result.text)

  return {
    job: 'briefing',
    ok: true,
    summary: firstLine(result.text, 120),
    costUsd: result.costUsd,
    detail: {
      downgraded: downgrades.downgraded.length,
      redFlag: redFlag ?? false,
      usedTemplate: result.usedTemplate,
    },
  }
}

function buildBriefingPrompt(date: string, downgradeCount: number, redFlag: boolean): string {
  const parts = [`Write the morning briefing for ${date}.`]

  if (redFlag) {
    parts.push(
      'A red flag is active. Lead with the instruction to stop training and contact the PT or MD, and explain what triggered it.'
    )
  } else if (downgradeCount > 0) {
    parts.push(
      `${downgradeCount} session(s) were automatically downgraded overnight because of a guardrail violation. Explain what changed and why, plainly.`
    )
  }

  return parts.join(' ')
}

/**
 * Templated briefing used when the budget is exhausted.
 *
 * Deliberately still useful: readiness, sessions and conditions are all
 * computed deterministically, so the athlete is never left with nothing.
 */
function templateBriefing(input: {
  date: string
  readinessScore: number | null
  readinessLevel: string | null
  sessions: { title: string; sport: string; durationMinutes: number | null }[]
  weatherSummary: string | null
  trainingNotes: string[]
  downgradeCount: number
}): string {
  const lines: string[] = []

  lines.push(`Briefing for ${input.date} (generated without the model — Claude budget reached).`)
  lines.push('')

  if (input.readinessScore != null) {
    const guidance = input.readinessLevel
      ? readinessGuidance(input.readinessLevel as 'fresh' | 'moderate' | 'fatigued' | 'compromised')
      : null
    lines.push(`Readiness ${input.readinessScore}/100 (${input.readinessLevel}).`)
    if (guidance) lines.push(guidance.summary)
    lines.push('')
  }

  if (input.downgradeCount > 0) {
    lines.push(
      `${input.downgradeCount} session(s) were downgraded automatically by the Injury Guard. Check the plan before training.`
    )
    lines.push('')
  }

  if (input.sessions.length) {
    lines.push('Scheduled today:')
    for (const session of input.sessions) {
      const duration = session.durationMinutes ? ` — ${session.durationMinutes} min` : ''
      lines.push(`  ${session.sport}: ${session.title}${duration}`)
    }
  } else {
    lines.push('Nothing scheduled today.')
  }

  if (input.weatherSummary) {
    lines.push('')
    lines.push(`Conditions: ${input.weatherSummary}`)
    for (const note of input.trainingNotes) lines.push(`  ${note}`)
  }

  return lines.join('\n')
}

async function storeBriefing(date: string, text: string): Promise<void> {
  const { error } = await coachDb()
    .from('coach_journal')
    .upsert({ week_start: date, entry: text, metrics: { kind: 'briefing' } }, { onConflict: 'week_start' })

  // Briefings share the journal table keyed by date; a conflict with the
  // weekly entry is possible but harmless, so a failure is only logged.
  if (error) console.error('[coach] Failed to store briefing:', error.message)
}

// ---------------------------------------------------------------------------
// Post-activity debrief
// ---------------------------------------------------------------------------

/**
 * Run after a workout syncs (Vercel debrief-sweep, or CLI).
 *
 * The delay between finishing a session and reading the debrief is what makes
 * it useful, which is why ingestion moved to HealthKit background delivery.
 */
export async function runDebrief(activityId: string): Promise<JobResult> {
  const activity = await getActivity(activityId)
  if (!activity) {
    return { job: 'debrief', ok: false, summary: `Activity ${activityId} not found.` }
  }

  // Load must be computed before the debrief, or the coach reasons about a
  // session with no TSS.
  await computeActivityLoad(activity).catch((error) =>
    console.error('[coach] Load computation failed:', error)
  )

  await computeAndStoreReadiness().catch(() => null)

  const link = await linkWorkoutToPlannedSession({
    workoutId: activity.id,
    workoutType: activity.sport,
    startDate: `${activity.activityDate}T12:00:00`,
  }).catch(() => ({ sessionId: null as string | null, linked: false }))

  let plannedLine = 'No matching planned session found.'
  if (link.sessionId) {
    const sessions = await getSessionsInRange(activity.activityDate, activity.activityDate)
    const matched = sessions.find((session: { id: string }) => session.id === link.sessionId)
    if (matched) {
      plannedLine = [
        `Linked planned session [${matched.id}] "${matched.title}" (${matched.sport}).`,
        matched.plannedDurationSeconds
          ? `Prescribed ${Math.round(matched.plannedDurationSeconds / 60)} min.`
          : null,
        matched.plannedLoad != null ? `Planned load ~${matched.plannedLoad} TSS.` : null,
        matched.rationale ? `Rationale: ${matched.rationale}` : null,
      ]
        .filter(Boolean)
        .join(' ')
    }

    const weekStart = isoWeekStart(activity.activityDate)
    await refreshWeekActualLoad(weekStart).catch(() => null)
  }

  const result = await runCoachJob({
    job: 'debrief',
    prompt: [
      `A ${activity.sport} session just synced (activity id ${activity.id}, ${activity.activityDate}).`,
      plannedLine,
      'Compare what was prescribed to what happened, then write the debrief.',
    ].join(' '),
    focus: `${activity.sport} session debrief`,
    maxOutputTokens: 700,
    templateFallback: () =>
      `${activity.sport} session recorded: ${Math.round(activity.durationSeconds / 60)} min` +
      (activity.distanceMeters
        ? `, ${(activity.distanceMeters / 1609.344).toFixed(2)} mi`
        : '') +
      (activity.tss ? `, ${activity.tss.toFixed(0)} TSS` : '') +
      '. Debrief unavailable: Claude budget reached.',
  })

  // Persist against the activity (and linked session when present) so the
  // debrief-sweep can skip work that already ran.
  const { error: debriefError } = await coachDb()
    .from('coach_session_feedback')
    .insert({
      session_id: link.sessionId,
      activity_id: activity.id,
      feedback_date: activity.activityDate,
      notes: `Debrief [${activity.id}]: ${firstLine(result.text, 400)}`,
    })
  if (debriefError) console.error('[coach] Failed to store debrief feedback:', debriefError.message)

  await sendCoachNotification({
    title: `${capitalise(activity.sport)} debrief`,
    body: firstLine(result.text, 180),
    tag: 'debrief',
    url: '/coach',
  })

  return {
    job: 'debrief',
    ok: true,
    summary: firstLine(result.text, 120),
    costUsd: result.costUsd,
    detail: { activityId, sport: activity.sport, sessionId: link.sessionId },
  }
}

const DEBRIEF_LOOKBACK_MS = 6 * 60 * 60 * 1000
const DEBRIEF_MIN_AGE_MS = 2 * 60 * 1000
const DEBRIEF_CAP = 3

/**
 * Poll recent workouts and debrief any that have not been handled yet.
 *
 * Replaces the local worker's LISTEN/NOTIFY path so debriefs still run when
 * the home PC is off.
 */
export async function runDebriefSweep(): Promise<JobResult> {
  const now = Date.now()
  const since = new Date(now - DEBRIEF_LOOKBACK_MS).toISOString()
  const until = new Date(now - DEBRIEF_MIN_AGE_MS).toISOString()

  const { data: workouts, error } = await coachDb()
    .from('apple_health_workouts')
    .select('id')
    .gte('updated_at', since)
    .lte('updated_at', until)
    .order('updated_at', { ascending: true })
    .limit(20)

  if (error) {
    return { job: 'debrief_sweep', ok: false, summary: error.message }
  }

  const ids = ((workouts ?? []) as { id: string }[]).map((row) => row.id)
  if (ids.length === 0) {
    return { job: 'debrief_sweep', ok: true, summary: 'No recent workouts to debrief.' }
  }

  const { data: done } = await coachDb()
    .from('coach_session_feedback')
    .select('activity_id')
    .in('activity_id', ids)

  const doneIds = new Set(
    ((done ?? []) as { activity_id: string | null }[])
      .map((row) => row.activity_id)
      .filter((id): id is string => Boolean(id))
  )

  const pending = ids.filter((id) => !doneIds.has(id)).slice(0, DEBRIEF_CAP)
  const results: JobResult[] = []
  for (const id of pending) {
    results.push(await runDebrief(id))
  }

  const okCount = results.filter((result) => result.ok).length
  return {
    job: 'debrief_sweep',
    ok: true,
    summary: `Debriefed ${okCount}/${pending.length}; skipped ${doneIds.size} already done.`,
    detail: {
      candidates: ids.length,
      pending,
      results: results.map((result) => ({
        ok: result.ok,
        summary: result.summary,
        costUsd: result.costUsd,
      })),
    },
  }
}

// ---------------------------------------------------------------------------
// Evening check-in nudge
// ---------------------------------------------------------------------------

/**
 * 20:30 nudge, only when nothing has been logged.
 *
 * No model call: this is a reminder, and spending tokens on it would be
 * waste.
 */
export async function runEveningNudge(): Promise<JobResult> {
  const date = today()

  const [{ data: feedback }, { data: ptDone }, symptoms] = await Promise.all([
    coachDb().from('coach_session_feedback').select('id').eq('feedback_date', date).limit(1),
    coachDb().from('coach_pt_completion').select('id').eq('completed_date', date).limit(1),
    getSymptoms(date, date),
  ])

  const hasFeedback = (feedback?.length ?? 0) > 0
  const hasPt = (ptDone?.length ?? 0) > 0
  const hasSymptoms = symptoms.length > 0

  if (hasFeedback && hasPt) {
    return { job: 'nudge', ok: true, summary: 'Everything already logged; no nudge sent.' }
  }

  const missing: string[] = []
  if (!hasPt) missing.push('evening armor block')
  if (!hasFeedback && !hasSymptoms) missing.push('session check-in')

  await sendCoachNotification({
    title: 'Evening check-in',
    body: `Still to log: ${missing.join(' and ')}.`,
    tag: 'nudge',
    url: '/coach',
  })

  return { job: 'nudge', ok: true, summary: `Nudged for: ${missing.join(', ')}.` }
}

// ---------------------------------------------------------------------------
// Sunday weekly plan
// ---------------------------------------------------------------------------

/**
 * Generate next week and leave it for approval.
 *
 * Runs on the deep model with a generous step budget: this is the most
 * consequential decision the coach makes each week and the one place where
 * paying for the better model is clearly worth it.
 */
export async function runWeeklyPlan(): Promise<JobResult> {
  const nextMonday = isoWeekStart(daysAgo(-7))

  const [
    block,
    load,
    projection,
    { getAdherenceSummary, getRecentSessionFeedback, formatAdherenceForPrompt },
  ] = await Promise.all([
    getCurrentBlock(),
    getLoadSummary(),
    getRaceProjection().catch(() => null),
    import('./adherence.service'),
  ])

  const [adherence, feedback] = await Promise.all([
    getAdherenceSummary(14).catch(() => null),
    getRecentSessionFeedback(14).catch(() => []),
  ])

  const adherenceBlock =
    adherence != null ? formatAdherenceForPrompt(adherence, feedback) : 'Adherence data unavailable.'

  const prompt = [
    `Plan the training week beginning ${nextMonday}.`,
    block ? `Current block: ${block.name} (${block.phase}).` : 'No block is configured yet.',
    load.current
      ? `Fitness ${load.current.ctl.toFixed(0)}, fatigue ${load.current.atl.toFixed(0)}, form ${load.current.tsb.toFixed(0)}.`
      : '',
    load.acwr != null ? `ACWR ${load.acwr.toFixed(2)}.` : '',
    projection
      ? `Projected finish ${formatTime(projection.projectedSeconds)} against a goal of ${formatTime(projection.goalSeconds)}.`
      : '',
    adherenceBlock,
    'Use the adherence numbers above, then submit the week through propose_plan_change. If the guardrails reject it, fix the cause and resubmit.',
  ]
    .filter(Boolean)
    .join('\n')

  const result = await runCoachJob({
    job: 'weekly_plan',
    prompt,
    focus: 'weekly training plan periodisation',
    maxOutputTokens: 6000,
  })

  await sendCoachNotification({
    title: 'Next week is ready',
    body: firstLine(result.text, 180),
    tag: 'weekly-plan',
    url: '/coach/plan',
  })

  return {
    job: 'weekly_plan',
    ok: true,
    summary: firstLine(result.text, 160),
    costUsd: result.costUsd,
    detail: { weekStart: nextMonday },
  }
}

// ---------------------------------------------------------------------------
// Block review
// ---------------------------------------------------------------------------

export async function runBlockReview(): Promise<JobResult> {
  const block = await getCurrentBlock()
  if (!block) {
    return { job: 'block_review', ok: false, summary: 'No active block to review.' }
  }

  const result = await runCoachJob({
    job: 'block_review',
    prompt: `Review block ${block.blockNumber}, "${block.name}" (${block.startDate} to ${block.endDate}). Re-budget the race splits against current measured fitness and name the limiter for the next block.`,
    focus: 'block review periodisation progress',
    maxOutputTokens: 4000,
  })

  const { error } = await coachDb()
    .from('coach_block')
    .update({ review: { text: result.text, reviewedAt: new Date().toISOString() } })
    .eq('id', block.id)

  if (error) console.error('[coach] Failed to store block review:', error.message)

  await sendCoachNotification({
    title: `Block ${block.blockNumber} review`,
    body: firstLine(result.text, 180),
    tag: 'block-review',
    url: '/coach/analytics',
  })

  return {
    job: 'block_review',
    ok: true,
    summary: firstLine(result.text, 160),
    costUsd: result.costUsd,
  }
}

// ---------------------------------------------------------------------------
// Nightly maintenance
// ---------------------------------------------------------------------------

/**
 * Recompute analytics, decay memory, backfill embeddings.
 *
 * Recomputation matters because HealthKit backfills samples after the fact
 * and symptoms are often logged later in the day, both of which change
 * readiness for days that have already passed.
 */
export async function runNightlyMaintenance(): Promise<JobResult> {
  // Catch any workouts that missed an ingest-triggered debrief (Hobby plan
  // cannot run a */5 cron).
  const sweep = await runDebriefSweep().catch((error) => {
    console.error('[coach] Nightly debrief sweep failed:', error)
    return {
      job: 'debrief_sweep',
      ok: false,
      summary: error instanceof Error ? error.message : String(error),
    } satisfies JobResult
  })

  const analytics = await nightlyRecompute()

  const { recomputeGearUsage } = await import('./gear.service')

  const [decayed, embedded, gearLinked] = await Promise.all([
    decayMemories().catch((error) => {
      console.error('[coach] Memory decay failed:', error)
      return 0
    }),
    backfillMemoryEmbeddings().catch(() => 0),
    // Shoe mileage accumulates automatically; worn-out shoes are an
    // avoidable load on a knee with existing cartilage wear.
    recomputeGearUsage().catch(() => 0),
  ])

  // Verify the retention policy is not eating training data.
  const { count: sampleCount } = await coachDb()
    .from('apple_health_hr_samples')
    .select('id', { count: 'exact', head: true })

  return {
    job: 'nightly',
    ok: true,
    summary: `Recomputed ${analytics.loadsComputed} loads and ${analytics.readinessDays} readiness days; decayed ${decayed} memories; ${sweep.summary}`,
    detail: {
      ...analytics,
      memoriesDecayed: decayed,
      embeddingsBackfilled: embedded,
      gearUsageLinked: gearLinked,
      hrSampleCount: sampleCount ?? null,
      debriefSweep: 'detail' in sweep ? sweep.detail : { summary: sweep.summary },
    },
  }
}

// ---------------------------------------------------------------------------
// PT reminder
// ---------------------------------------------------------------------------

/** Morning activation block reminder. No model call needed. */
export async function runPtReminder(timeOfDay: 'morning' | 'evening'): Promise<JobResult> {
  const date = today()
  const protocols = await getPtProtocols()
  const target = protocols.filter(
    (protocol) => protocol.timeOfDay === timeOfDay && protocol.isMandatory
  )

  if (target.length === 0) {
    return { job: `pt_${timeOfDay}`, ok: true, summary: 'No protocol for this time of day.' }
  }

  const { data: done } = await coachDb()
    .from('coach_pt_completion')
    .select('protocol_id')
    .eq('completed_date', date)
    .in(
      'protocol_id',
      target.map((protocol) => protocol.id)
    )

  const completed = new Set(((done ?? []) as { protocol_id: string }[]).map((row) => row.protocol_id))
  const pending = target.filter((protocol) => !completed.has(protocol.id))

  if (pending.length === 0) {
    return { job: `pt_${timeOfDay}`, ok: true, summary: 'Already complete.' }
  }

  const protocol = pending[0]!
  await sendCoachNotification({
    title: protocol.name,
    body: `${protocol.items.length} exercises, about ${protocol.durationMinutes ?? 10} minutes. This is the prescribed treatment, not optional.`,
    tag: `pt-${timeOfDay}`,
    url: '/coach',
  })

  return { job: `pt_${timeOfDay}`, ok: true, summary: `Reminded: ${protocol.name}.` }
}

// ---------------------------------------------------------------------------
// Polar sleep sync (comparison only — Apple remains coach SoT)
// ---------------------------------------------------------------------------

/**
 * Pull Polar Loop sleep via AccessLink into polar_sleep_nights.
 * Soft-skips when Polar env or OAuth tokens are missing.
 */
export async function runPolarSleepSync(): Promise<JobResult> {
  try {
    const result = await syncPolarSleep()
    if (result.skipped) {
      return {
        job: 'polar-sleep',
        ok: true,
        summary: `Skipped: ${result.reason ?? 'unconfigured'}`,
        detail: result,
      }
    }
    return {
      job: 'polar-sleep',
      ok: true,
      summary: `Upserted ${result.upserted} Polar sleep night(s)${result.reason ? ` — ${result.reason}` : ''}`,
      detail: result,
    }
  } catch (error) {
    console.error('[coach] Polar sleep sync failed:', error)
    return {
      job: 'polar-sleep',
      ok: false,
      summary: error instanceof Error ? error.message : String(error),
    }
  }
}

// ---------------------------------------------------------------------------

function firstLine(text: string, maxLength: number): string {
  const line = text.split('\n').find((candidate) => candidate.trim().length > 0) ?? text
  const trimmed = line.trim()
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
