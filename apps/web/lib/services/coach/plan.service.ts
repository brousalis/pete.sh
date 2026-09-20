/**
 * Plan mutation.
 *
 * The single chokepoint for changing the calendar. Everything — chat, the
 * Sunday planning job, a same-day downgrade — goes through applyProposal, so
 * there is exactly one place where the Injury Guard can be bypassed, and it
 * isn't bypassed.
 */

import {
  applyChanges,
  daysAgo,
  evaluateGuardrails,
  isoWeekStart,
  planProposalSchema,
  type GuardrailContext,
  type GuardrailReport,
  type PlanChange,
  type PlannedSession,
  type SessionDraft,
} from '@petehome/coach-core'

import {
  coachDb,
  getActiveInjuries,
  getBenchmarks,
  getPtProtocols,
  getSessionsInRange,
  getSymptoms,
  queryActivities,
} from './coach-data.service'
import { computeAndStoreReadiness, getLoadSummary } from './analytics.service'

export interface ApplyProposalResult {
  applied: boolean
  summary: string
  schemaErrors: string[]
  guardrailReport: GuardrailReport | null
  appliedSessionIds: string[]
}

/**
 * Build the context the guardrails need.
 *
 * Deliberately gathers real history rather than trusting whatever the caller
 * passed: the progression rules only work if "last week's mileage" is the
 * actual number.
 */
export async function buildGuardrailContext(
  windowStart: string,
  windowEnd: string
): Promise<Omit<GuardrailContext, 'sessions'>> {
  const [injuries, symptoms, load, protocols, quadTests, activities, existing] =
    await Promise.all([
      getActiveInjuries(),
      getSymptoms(daysAgo(21)),
      getLoadSummary(),
      getPtProtocols(),
      getBenchmarks('quad_symmetry'),
      queryActivities({ from: daysAgo(56), limit: 400 }),
      getSessionsInRange(daysAgo(14), windowEnd),
    ])

  const readiness = await computeAndStoreReadiness().catch(() => null)

  // Weekly running and riding history, used by the progression rules.
  const weeklyRunMeters = new Map<string, number>()
  const weeklyLongRunMeters = new Map<string, number>()
  const weeklyLongRideMeters = new Map<string, number>()

  for (const activity of activities) {
    const week = isoWeekStart(activity.activityDate)
    const distance = activity.distanceMeters ?? 0
    if (distance <= 0) continue

    if (activity.sport === 'run') {
      weeklyRunMeters.set(week, (weeklyRunMeters.get(week) ?? 0) + distance)
      weeklyLongRunMeters.set(week, Math.max(weeklyLongRunMeters.get(week) ?? 0, distance))
    } else if (activity.sport === 'bike') {
      weeklyLongRideMeters.set(week, Math.max(weeklyLongRideMeters.get(week) ?? 0, distance))
    }
  }

  // The most recent quad symmetry test decides whether run intensity is open.
  const latestQuadTest = quadTests[0]
  const quadSymmetryPassed = latestQuadTest ? latestQuadTest.passed === true : false

  // First run after the layoff starts the six-week spacing window.
  const firstRun = [...activities]
    .filter((activity) => activity.sport === 'run')
    .sort((a, b) => a.activityDate.localeCompare(b.activityDate))[0]

  const mandatory = protocols.filter((protocol) => protocol.isMandatory).map((p) => p.slug)

  return {
    existingSessions: existing.filter(
      (session) => session.sessionDate < windowStart || session.sessionDate > windowEnd
    ),
    symptoms,
    injuries,
    readiness,
    acwr: load.acwr,
    monotony: load.monotony,
    weeklyRunMeters: [...weeklyRunMeters].map(([weekStart, meters]) => ({ weekStart, meters })),
    weeklyLongRunMeters: [...weeklyLongRunMeters].map(([weekStart, meters]) => ({
      weekStart,
      meters,
    })),
    weeklyLongRideMeters: [...weeklyLongRideMeters].map(([weekStart, meters]) => ({
      weekStart,
      meters,
    })),
    quadSymmetryPassed,
    returnToRunStartDate: firstRun?.activityDate ?? null,
    mandatoryProtocolSlugs: mandatory,
    // PT blocks live in their own tables rather than as sessions, so they are
    // always considered scheduled. The rule exists to stop the planner from
    // proposing a week that drops them.
    scheduledProtocolSlugs: mandatory,
    today: new Date().toISOString().slice(0, 10),
  }
}

/**
 * Validate a proposal and, if it passes, write it.
 *
 * `force` exists for the athlete explicitly overriding a warning from the UI.
 * It cannot override a block or a red flag — those are the whole point.
 */
export async function applyProposal(
  proposal: unknown,
  options: { force?: boolean; actor?: 'coach' | 'athlete' | 'guardrail'; autoApplied?: boolean } = {}
): Promise<ApplyProposalResult> {
  const parsed = planProposalSchema.safeParse(proposal)

  if (!parsed.success) {
    return {
      applied: false,
      summary: 'The proposal did not match the expected shape.',
      schemaErrors: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || 'proposal'}: ${issue.message}`
      ),
      guardrailReport: null,
      appliedSessionIds: [],
    }
  }

  const dates = collectDates(parsed.data.changes)
  const windowStart = dates[0] ?? new Date().toISOString().slice(0, 10)
  const windowEnd = dates[dates.length - 1] ?? windowStart

  const currentSessions = await getSessionsInRange(windowStart, windowEnd)
  const guardrailContext = await buildGuardrailContext(windowStart, windowEnd)

  const projected = applyChanges(currentSessions, parsed.data.changes)
  const report = evaluateGuardrails({ ...guardrailContext, sessions: projected })

  const hardFailure = report.severity === 'block' || report.severity === 'red_flag'
  const shouldApply = report.passed || (options.force === true && !hardFailure)

  if (!shouldApply) {
    return {
      applied: false,
      summary: buildRejectionSummary(report),
      schemaErrors: [],
      guardrailReport: report,
      appliedSessionIds: [],
    }
  }

  const appliedSessionIds = await persistChanges(parsed.data.changes, report, options)

  return {
    applied: true,
    summary: parsed.data.summary,
    schemaErrors: [],
    guardrailReport: report,
    appliedSessionIds,
  }
}

function buildRejectionSummary(report: GuardrailReport): string {
  const blocking = report.violations.filter(
    (violation) => violation.severity === 'block' || violation.severity === 'red_flag'
  )

  if (blocking.length === 0) return 'Rejected by the Injury Guard.'

  const lines = blocking.map(
    (violation) => `- ${violation.message}${violation.remedy ? ` → ${violation.remedy}` : ''}`
  )

  return `Rejected by the Injury Guard (${report.rulesetVersion}):\n${lines.join('\n')}`
}

function collectDates(changes: PlanChange[]): string[] {
  const dates = new Set<string>()

  for (const change of changes) {
    if (change.action === 'add' || change.action === 'replace' || change.action === 'downgrade') {
      dates.add(change.session.sessionDate)
    } else if (change.action === 'move') {
      dates.add(change.toDate)
    }
  }

  return [...dates].sort()
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

async function persistChanges(
  changes: PlanChange[],
  report: GuardrailReport,
  options: { actor?: 'coach' | 'athlete' | 'guardrail'; autoApplied?: boolean }
): Promise<string[]> {
  const db = coachDb()
  const applied: string[] = []
  const actor = options.actor ?? 'coach'

  for (const change of changes) {
    switch (change.action) {
      case 'add': {
        const id = await insertSession(change.session, report)
        applied.push(id)
        await recordAudible(id, actor, 'add', change.session.rationale, null, change.session, options)
        break
      }

      case 'replace':
      case 'downgrade': {
        const before = await loadSessionRow(change.sessionId)
        const id = await upsertSession(change.sessionId, change.session, report)
        applied.push(id)
        await recordAudible(
          id,
          actor,
          change.action === 'downgrade' ? 'downgrade' : 'swap',
          change.action === 'downgrade' ? change.reason : change.session.rationale,
          before,
          change.session,
          options
        )
        break
      }

      case 'move': {
        const before = await loadSessionRow(change.sessionId)
        const { error } = await db
          .from('coach_planned_session')
          .update({
            session_date: change.toDate,
            status: 'modified',
            // The watch has the old date; it needs rescheduling.
            watch_sync_state: 'pending',
          })
          .eq('id', change.sessionId)

        if (error) throw new Error(`Failed to move session: ${error.message}`)
        applied.push(change.sessionId)
        await recordAudible(
          change.sessionId,
          actor,
          'move',
          change.reason,
          before,
          { toDate: change.toDate },
          options
        )
        break
      }

      case 'cancel': {
        const before = await loadSessionRow(change.sessionId)
        const { error } = await db
          .from('coach_planned_session')
          .update({ status: 'cancelled', watch_sync_state: 'pending' })
          .eq('id', change.sessionId)

        if (error) throw new Error(`Failed to cancel session: ${error.message}`)
        applied.push(change.sessionId)
        await recordAudible(change.sessionId, actor, 'cancel', change.reason, before, null, options)
        break
      }
    }
  }

  return applied
}

async function loadSessionRow(sessionId: string): Promise<Record<string, unknown> | null> {
  const { data } = await coachDb()
    .from('coach_planned_session')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  return data ?? null
}

/** Find or create the week row a session belongs to. */
async function resolveWeekId(sessionDate: string): Promise<string> {
  const db = coachDb()
  const weekStart = isoWeekStart(sessionDate)

  const { data: existing } = await db
    .from('coach_week')
    .select('id')
    .eq('week_start', weekStart)
    .maybeSingle()

  if (existing) return existing.id

  // Attach to whichever block covers the date, if one does.
  const { data: block } = await db
    .from('coach_block')
    .select('id, start_date')
    .lte('start_date', sessionDate)
    .gte('end_date', sessionDate)
    .maybeSingle()

  const { data: macrocycle } = await db
    .from('coach_macrocycle')
    .select('start_date')
    .eq('is_active', true)
    .maybeSingle()

  const weekNumber = macrocycle
    ? Math.max(
        1,
        Math.floor(
          (new Date(`${weekStart}T00:00:00Z`).getTime() -
            new Date(`${macrocycle.start_date}T00:00:00Z`).getTime()) /
            (7 * 86_400_000)
        ) + 1
      )
    : 1

  const { data: created, error } = await db
    .from('coach_week')
    .insert({
      block_id: block?.id ?? null,
      week_start: weekStart,
      week_number: weekNumber,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create week: ${error.message}`)
  return created.id
}

function sessionRow(
  draft: SessionDraft,
  weekId: string,
  report: GuardrailReport
): Record<string, unknown> {
  return {
    week_id: weekId,
    session_date: draft.sessionDate,
    slot: draft.slot,
    sort_order: draft.slot === 'second' ? 1 : 0,
    sport: draft.sport,
    session_type: draft.sessionType,
    title: draft.title,
    description: draft.description ?? null,
    planned_duration_seconds: draft.plannedDurationSeconds ?? null,
    planned_distance_meters: draft.plannedDistanceMeters ?? null,
    planned_load: estimateLoad(draft),
    steps: draft.steps ?? {},
    targets: draft.targets ?? {},
    rationale: draft.rationale,
    guardrail_report: report,
    status: 'planned',
    watch_sync_state: 'pending',
  }
}

function estimateLoad(draft: SessionDraft): number {
  // Mirrors estimatePlannedLoad in coach-core; re-derived here to avoid
  // importing the draft-to-session conversion for a single number.
  const hours = (draft.plannedDurationSeconds ?? 0) / 3600
  if (hours <= 0) return 0

  const factors: Record<string, number> = {
    recovery: 0.55,
    z2: 0.7,
    endurance: 0.72,
    long: 0.75,
    walk_run: 0.6,
    tempo: 0.85,
    threshold: 0.92,
    intervals: 0.95,
    vo2: 1,
    sprint: 1,
    technique: 0.6,
    test: 0.95,
    strength: 0.6,
    rehab: 0.35,
    brick: 0.82,
    rest: 0,
  }

  const factor = factors[draft.sessionType] ?? 0.7
  return Math.round(hours * factor * factor * 100)
}

async function insertSession(draft: SessionDraft, report: GuardrailReport): Promise<string> {
  const weekId = await resolveWeekId(draft.sessionDate)

  const { data, error } = await coachDb()
    .from('coach_planned_session')
    .insert(sessionRow(draft, weekId, report))
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return data.id as string
}

async function upsertSession(
  sessionId: string,
  draft: SessionDraft,
  report: GuardrailReport
): Promise<string> {
  const weekId = await resolveWeekId(draft.sessionDate)

  const { data, error } = await coachDb()
    .from('coach_planned_session')
    .update(sessionRow(draft, weekId, report))
    .eq('id', sessionId)
    .select('id')
    .maybeSingle()

  if (error) throw new Error(`Failed to update session: ${error.message}`)
  if (data) return data.id as string

  // The id did not exist; treat it as a create so the change is not lost.
  return insertSession(draft, report)
}

/**
 * Record every deviation.
 *
 * This log is what makes the season reviewable: at the end of a block it
 * answers "why did the plan end up like this" without guesswork.
 */
async function recordAudible(
  sessionId: string,
  actor: 'coach' | 'athlete' | 'guardrail',
  changeType: 'add' | 'swap' | 'move' | 'cancel' | 'downgrade' | 'upgrade',
  reason: string,
  before: unknown,
  after: unknown,
  options: { autoApplied?: boolean }
): Promise<void> {
  const { error } = await coachDb()
    .from('coach_audible')
    .insert({
      session_id: sessionId,
      actor,
      change_type: changeType,
      reason,
      before_state: before ?? null,
      after_state: after ?? null,
      auto_applied: options.autoApplied ?? false,
    })

  if (error) console.error('[coach] Failed to record audible:', error.message)
}

/**
 * Automatic same-day downgrade.
 *
 * The one mutation that applies without approval, because the alternative is
 * the athlete training through a guardrail violation while waiting for a
 * response. Only ever reduces load.
 */
export async function autoDowngradeToday(): Promise<{
  downgraded: PlannedSession[]
  report: GuardrailReport | null
}> {
  const today = new Date().toISOString().slice(0, 10)
  const sessions = await getSessionsInRange(today, today)

  if (sessions.length === 0) return { downgraded: [], report: null }

  const guardrailContext = await buildGuardrailContext(today, today)
  const report = evaluateGuardrails({ ...guardrailContext, sessions })

  if (report.passed) return { downgraded: [], report }

  const { downgradeSession } = await import('@petehome/coach-core')
  const downgraded: PlannedSession[] = []

  const blocking = report.violations.filter(
    (violation) => violation.severity === 'block' || violation.severity === 'red_flag'
  )

  // All downgrades go in one proposal. Applying them one at a time would fail
  // validation on the second violation while the first is still unresolved.
  const changes: PlanChange[] = []
  const seen = new Set<string>()

  for (const violation of blocking) {
    const sessionId = violation.data?.sessionId as string | undefined
    if (!sessionId || seen.has(sessionId)) continue

    const session = sessions.find((candidate) => candidate.id === sessionId)
    if (!session) continue

    seen.add(sessionId)
    const replacement = downgradeSession(session, violation.message)

    changes.push({
      action: 'downgrade',
      sessionId: session.id,
      reason: violation.remedy ?? violation.message,
      session: {
        sessionDate: session.sessionDate,
        slot: session.slot,
        sport: replacement.sport,
        sessionType: replacement.sessionType,
        title: replacement.title,
        plannedDurationSeconds: session.plannedDurationSeconds ?? undefined,
        rationale: replacement.rationale,
        targets: replacement.sport === 'bike' ? { cadenceRange: [90, 100] } : {},
      },
    })

    downgraded.push(session)
  }

  if (changes.length === 0) return { downgraded: [], report }

  const result = await applyProposal(
    {
      summary: `Automatic downgrade of ${changes.length} session(s) after a guardrail violation.`,
      autoApply: true,
      changes,
    },
    { actor: 'guardrail', autoApplied: true }
  )

  // A red flag blocks even the downgrade, because the correct response is to
  // stop rather than substitute. Report it instead of silently doing nothing.
  if (!result.applied) {
    return { downgraded: [], report: result.guardrailReport ?? report }
  }

  return { downgraded, report }
}
