/**
 * Adherence + plan↔workout linking.
 *
 * Turns mark-done / skip / feedback / Apple Health into numbers the coach
 * can see in context and Sunday planning — without relying on the model to
 * invent tool calls for RPE history.
 */

import { coachDb, getSessionsInRange } from '@/lib/services/coach/coach-data.service'

function chicagoToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function daysAgo(n: number, from = chicagoToday()): string {
  const date = new Date(`${from}T12:00:00`)
  date.setDate(date.getDate() - n)
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

export interface SessionFeedbackRow {
  feedbackDate: string
  sessionId: string | null
  sessionTitle: string | null
  sport: string | null
  rpe: number | null
  maxPain: number | null
  mood: number | null
  energy: number | null
  sleepQuality: number | null
  notes: string | null
}

export interface AdherenceSummary {
  from: string
  to: string
  planned: number
  completed: number
  skipped: number
  missed: number
  modified: number
  completionRate: number | null
  meanRpe: number | null
  ptMandatoryDays: number
  ptMisses: number
  ptStreakDays: number
}

const SPORT_ALIASES: Record<string, string[]> = {
  run: ['run', 'running', 'outdoor_run', 'indoor_run', 'trail_run'],
  bike: ['bike', 'cycling', 'outdoor_cycle', 'indoor_cycle', 'hand_cycling'],
  swim: ['swim', 'swimming', 'pool_swim', 'open_water_swim'],
  strength: [
    'strength',
    'functional_strength_training',
    'traditional_strength_training',
    'core_training',
  ],
  brick: ['bike', 'run', 'cycling', 'running'],
}

function normalizeSport(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, '_')
}

function sportsMatch(plannedSport: string, workoutType: string): boolean {
  const planned = normalizeSport(plannedSport)
  const actual = normalizeSport(workoutType)
  if (planned === actual) return true
  const aliases = SPORT_ALIASES[planned] ?? [planned]
  return aliases.some((alias) => actual.includes(alias) || alias.includes(actual))
}

export async function getRecentSessionFeedback(days = 14): Promise<SessionFeedbackRow[]> {
  const from = daysAgo(days)
  const db = coachDb()

  const { data, error } = await db
    .from('coach_session_feedback')
    .select(
      'feedback_date, session_id, rpe, max_pain, mood, energy, sleep_quality, notes, coach_planned_session(title, sport)'
    )
    .gte('feedback_date', from)
    .order('feedback_date', { ascending: false })
    .limit(40)

  if (error) {
    console.error('[adherence] Failed to load feedback:', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const session = row.coach_planned_session as
      | { title?: string; sport?: string }
      | { title?: string; sport?: string }[]
      | null
    const linked = Array.isArray(session) ? session[0] : session
    return {
      feedbackDate: row.feedback_date as string,
      sessionId: (row.session_id as string | null) ?? null,
      sessionTitle: linked?.title ?? null,
      sport: linked?.sport ?? null,
      rpe: (row.rpe as number | null) ?? null,
      maxPain: (row.max_pain as number | null) ?? null,
      mood: (row.mood as number | null) ?? null,
      energy: (row.energy as number | null) ?? null,
      sleepQuality: (row.sleep_quality as number | null) ?? null,
      notes: (row.notes as string | null) ?? null,
    }
  })
}

export async function getAdherenceSummary(days = 14): Promise<AdherenceSummary> {
  const to = chicagoToday()
  const from = daysAgo(days - 1, to)
  const sessions = await getSessionsInRange(from, to)

  let completed = 0
  let skipped = 0
  let missed = 0
  let modified = 0
  let planned = 0

  for (const session of sessions) {
    if (session.status === 'cancelled') continue
    planned += 1
    if (session.status === 'completed') completed += 1
    else if (session.status === 'skipped') skipped += 1
    else if (session.status === 'modified') modified += 1
    else if (session.sessionDate < to) missed += 1
  }

  const feedback = await getRecentSessionFeedback(days)
  const rpes = feedback.map((row) => row.rpe).filter((value): value is number => value != null)
  const meanRpe = rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : null

  const pt = await getPtCompliance(days)

  return {
    from,
    to,
    planned,
    completed,
    skipped,
    missed,
    modified,
    completionRate: planned > 0 ? completed / planned : null,
    meanRpe,
    ptMandatoryDays: pt.mandatoryDays,
    ptMisses: pt.misses,
    ptStreakDays: pt.streakDays,
  }
}

async function getPtCompliance(days: number): Promise<{
  mandatoryDays: number
  misses: number
  streakDays: number
}> {
  const db = coachDb()
  const to = chicagoToday()
  const from = daysAgo(days - 1, to)

  const [{ data: protocols }, { data: completions }] = await Promise.all([
    db.from('coach_pt_protocol').select('id, time_of_day').eq('is_mandatory', true),
    db
      .from('coach_pt_completion')
      .select('protocol_id, completed_date, skipped')
      .gte('completed_date', from)
      .lte('completed_date', to),
  ])

  const mandatory = (protocols ?? []) as { id: string; time_of_day: string }[]
  if (mandatory.length === 0) {
    return { mandatoryDays: 0, misses: 0, streakDays: 0 }
  }

  const doneByDate = new Map<string, Set<string>>()
  for (const row of (completions ?? []) as {
    protocol_id: string
    completed_date: string
    skipped: boolean
  }[]) {
    if (row.skipped) continue
    const set = doneByDate.get(row.completed_date) ?? new Set()
    set.add(row.protocol_id)
    doneByDate.set(row.completed_date, set)
  }

  let mandatoryDays = 0
  let misses = 0
  for (let offset = 0; offset < days; offset++) {
    const date = daysAgo(offset, to)
    if (date > to) continue
    mandatoryDays += 1
    const done = doneByDate.get(date) ?? new Set()
    const missing = mandatory.filter((protocol) => !done.has(protocol.id))
    if (missing.length > 0) misses += 1
  }

  let streakDays = 0
  for (let offset = 0; offset < days; offset++) {
    const date = daysAgo(offset, to)
    const done = doneByDate.get(date) ?? new Set()
    const allDone = mandatory.every((protocol) => done.has(protocol.id))
    if (!allDone) break
    streakDays += 1
  }

  return { mandatoryDays, misses, streakDays }
}

/**
 * Link an ingested Apple Health workout to a same-day planned session of the
 * matching sport. Idempotent if already linked.
 */
export async function linkWorkoutToPlannedSession(input: {
  workoutId: string
  workoutType: string
  startDate: string
}): Promise<{ sessionId: string | null; linked: boolean }> {
  const sessionDate = new Date(input.startDate).toLocaleDateString('en-CA', {
    timeZone: 'America/Chicago',
  })
  const db = coachDb()

  const { data: already } = await db
    .from('coach_planned_session')
    .select('id')
    .eq('completed_activity_id', input.workoutId)
    .maybeSingle()

  if (already?.id) {
    return { sessionId: already.id as string, linked: false }
  }

  const { data: candidates, error } = await db
    .from('coach_planned_session')
    .select('id, sport, status, completed_activity_id')
    .eq('session_date', sessionDate)
    .in('status', ['planned', 'modified', 'completed'])
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[adherence] Failed to find sessions for link:', error.message)
    return { sessionId: null, linked: false }
  }

  const match = ((candidates ?? []) as {
    id: string
    sport: string
    status: string
    completed_activity_id: string | null
  }[]).find(
    (session) =>
      !session.completed_activity_id && sportsMatch(session.sport, input.workoutType)
  )

  if (!match) return { sessionId: null, linked: false }

  const { error: updateError } = await db
    .from('coach_planned_session')
    .update({
      completed_activity_id: input.workoutId,
      status: match.status === 'skipped' ? match.status : 'completed',
    })
    .eq('id', match.id)

  if (updateError) {
    console.error('[adherence] Failed to link workout:', updateError.message)
    return { sessionId: null, linked: false }
  }

  return { sessionId: match.id, linked: true }
}

/** Format adherence for prompts / weekly plan job. */
export function formatAdherenceForPrompt(
  adherence: AdherenceSummary,
  feedback: SessionFeedbackRow[]
): string {
  const lines = [
    `Adherence ${adherence.from} → ${adherence.to}:`,
    `  Sessions planned ${adherence.planned}: ${adherence.completed} completed, ${adherence.skipped} skipped, ${adherence.missed} missed` +
      (adherence.completionRate != null
        ? ` (${Math.round(adherence.completionRate * 100)}% completed)`
        : ''),
  ]

  if (adherence.meanRpe != null) {
    lines.push(`  Mean session RPE ${adherence.meanRpe.toFixed(1)}`)
  }

  lines.push(
    `  PT mandatory days ${adherence.ptMandatoryDays}: ${adherence.ptMisses} with misses, streak ${adherence.ptStreakDays} day(s)`
  )

  if (feedback.length) {
    lines.push('  Recent feedback:')
    for (const row of feedback.slice(0, 8)) {
      const parts = [
        row.feedbackDate,
        row.sport ?? row.sessionTitle ?? 'session',
        row.rpe != null ? `RPE ${row.rpe}` : null,
        row.maxPain != null ? `pain ${row.maxPain}/10` : null,
        row.notes ? `— ${row.notes.slice(0, 80)}` : null,
      ].filter(Boolean)
      lines.push(`    ${parts.join(' · ')}`)
    }
  }

  return lines.join('\n')
}

/**
 * Roll linked activity TSS into coach_week.actual_load for the week containing date.
 */
export async function refreshWeekActualLoad(weekStart: string): Promise<void> {
  const weekEndDate = new Date(`${weekStart}T12:00:00`)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekEnd = weekEndDate.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  const sessions = await getSessionsInRange(weekStart, weekEnd)
  const activityIds = sessions
    .map((session) => session.completedActivityId)
    .filter((id): id is string => Boolean(id))

  if (activityIds.length === 0) {
    await coachDb()
      .from('coach_week')
      .update({ actual_load: { tss: 0, sessions: 0 } })
      .eq('week_start', weekStart)
    return
  }

  const { data: loads } = await coachDb()
    .from('coach_activity_load')
    .select('tss')
    .in('activity_id', activityIds)

  const tss = ((loads ?? []) as { tss: number | null }[]).reduce(
    (sum, row) => sum + (Number(row.tss) || 0),
    0
  )

  await coachDb()
    .from('coach_week')
    .update({ actual_load: { tss: Math.round(tss), sessions: activityIds.length } })
    .eq('week_start', weekStart)
}
