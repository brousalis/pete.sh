/**
 * Athlete audibles — confirm-first plan rewrites when the day diverged.
 *
 * Always goes through applyProposal so Injury Guard + coach_audible fire.
 * After adds for uploaded workouts, links completed_activity_id so Today/Plan
 * show glances without waiting for sport auto-match.
 */

import { z } from 'zod'

import {
  getActivitiesByIds,
  getSessionsInRange,
  coachDb,
} from '@/lib/services/coach/coach-data.service'
import {
  applyProposal,
  type ApplyProposalResult,
} from '@/lib/services/coach/plan.service'
import type { Activity, PlanChange, SessionDraft, Sport } from '@petehome/coach-core'
import { sportSchema } from '@petehome/coach-core'

export const audibleRequestSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().min(10).max(400),
    /** Planned sessions to cancel (missed / replaced by actuals). */
    cancelSessionIds: z.array(z.string().uuid()).max(10).default([]),
    /** Uploaded workouts to book as completed stand-in sessions. */
    activityIds: z.array(z.string().uuid()).max(10).default([]),
    /**
     * Pre-swap without uploads: replace one planned session with a different
     * sport/type before training.
     */
    replace: z
      .object({
        sessionId: z.string().uuid(),
        sport: sportSchema,
        sessionType: z
          .enum([
            'recovery',
            'z2',
            'endurance',
            'long',
            'tempo',
            'threshold',
            'intervals',
            'vo2',
            'sprint',
            'technique',
            'test',
            'strength',
            'rehab',
            'brick',
            'rest',
            'walk_run',
          ])
          .optional(),
        title: z.string().min(3).max(80).optional(),
        plannedDurationSeconds: z.number().int().positive().max(6 * 3600).optional(),
      })
      .optional(),
    force: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.cancelSessionIds.length > 0 ||
      body.activityIds.length > 0 ||
      body.replace != null,
    { message: 'Provide cancelSessionIds, activityIds, and/or replace.' }
  )

export type AudibleRequest = z.infer<typeof audibleRequestSchema>

export interface AudibleResult extends ApplyProposalResult {
  linkedActivityIds: string[]
}

export async function applyAudible(input: AudibleRequest): Promise<AudibleResult> {
  const sessions = await getSessionsInRange(input.date, input.date)
  const sessionById = new Map(sessions.map((session) => [session.id, session]))

  for (const id of input.cancelSessionIds) {
    if (!sessionById.has(id)) {
      return {
        applied: false,
        summary: `Session ${id} is not on ${input.date}.`,
        schemaErrors: [`cancelSessionIds: unknown session for ${input.date}`],
        guardrailReport: null,
        appliedSessionIds: [],
        linkedActivityIds: [],
      }
    }
  }

  if (input.replace && !sessionById.has(input.replace.sessionId)) {
    return {
      applied: false,
      summary: `Session ${input.replace.sessionId} is not on ${input.date}.`,
      schemaErrors: [`replace.sessionId: unknown session for ${input.date}`],
      guardrailReport: null,
      appliedSessionIds: [],
      linkedActivityIds: [],
    }
  }

  const activities =
    input.activityIds.length > 0 ? await getActivitiesByIds(input.activityIds) : []
  const activityById = new Map(activities.map((activity) => [activity.id, activity]))

  for (const id of input.activityIds) {
    const activity = activityById.get(id)
    if (!activity) {
      return {
        applied: false,
        summary: `Activity ${id} was not found.`,
        schemaErrors: [`activityIds: unknown activity ${id}`],
        guardrailReport: null,
        appliedSessionIds: [],
        linkedActivityIds: [],
      }
    }
    if (activity.activityDate !== input.date) {
      return {
        applied: false,
        summary: `Activity ${id} is on ${activity.activityDate}, not ${input.date}.`,
        schemaErrors: [`activityIds: activity ${id} date mismatch`],
        guardrailReport: null,
        appliedSessionIds: [],
        linkedActivityIds: [],
      }
    }
    if (activity.plannedSessionId) {
      return {
        applied: false,
        summary: `Activity ${id} is already linked to a planned session.`,
        schemaErrors: [`activityIds: activity ${id} already linked`],
        guardrailReport: null,
        appliedSessionIds: [],
        linkedActivityIds: [],
      }
    }
  }

  const changes: PlanChange[] = []
  const addActivityOrder: string[] = []

  for (const sessionId of input.cancelSessionIds) {
    changes.push({
      action: 'cancel',
      sessionId,
      reason: input.reason,
    })
  }

  if (input.replace) {
    const existing = sessionById.get(input.replace.sessionId)!
    const sport = input.replace.sport
    const draft: SessionDraft = {
      sessionDate: input.date,
      slot: existing.slot,
      sport,
      sessionType: input.replace.sessionType ?? defaultSessionType(sport),
      title:
        input.replace.title ??
        `Audible ${sportLabel(sport)}${
          input.replace.plannedDurationSeconds
            ? ` · ${Math.round(input.replace.plannedDurationSeconds / 60)} min`
            : ''
        }`.slice(0, 80),
      description: existing.description ?? undefined,
      plannedDurationSeconds:
        input.replace.plannedDurationSeconds ?? existing.plannedDurationSeconds ?? undefined,
      plannedDistanceMeters: undefined,
      rationale: input.reason,
    }
    changes.push({
      action: 'replace',
      sessionId: input.replace.sessionId,
      session: draft,
    })
  }

  // Slot assignment: first added actual is primary, rest second (sort_order).
  let addIndex = 0
  for (const activityId of input.activityIds) {
    const activity = activityById.get(activityId)!
    const draft = draftFromActivity(activity, input.date, input.reason, addIndex)
    changes.push({ action: 'add', session: draft })
    addActivityOrder.push(activityId)
    addIndex += 1
  }

  if (changes.length === 0) {
    return {
      applied: false,
      summary: 'No plan changes to apply.',
      schemaErrors: ['changes: empty'],
      guardrailReport: null,
      appliedSessionIds: [],
      linkedActivityIds: [],
    }
  }

  const cancelledTitles = input.cancelSessionIds
    .map((id) => sessionById.get(id)?.title)
    .filter(Boolean)
  const addedLabels = addActivityOrder
    .map((id) => activityById.get(id))
    .filter((a): a is Activity => a != null)
    .map((a) => `${sportLabel(a.sport)} ${Math.round(a.durationSeconds / 60)}′`)

  const summaryParts = [
    cancelledTitles.length
      ? `Cancelled: ${cancelledTitles.join(', ')}`
      : null,
    input.replace
      ? `Replaced with ${sportLabel(input.replace.sport)}`
      : null,
    addedLabels.length ? `Booked actuals: ${addedLabels.join(', ')}` : null,
  ].filter(Boolean)

  const result = await applyProposal(
    {
      summary: summaryParts.join(' · ') || input.reason,
      changes,
      autoApply: false,
    },
    {
      actor: 'athlete',
      force: input.force === true,
      trigger: 'manual',
    }
  )

  if (!result.applied) {
    return { ...result, linkedActivityIds: [] }
  }

  // appliedSessionIds follow change order: cancels, optional replace, then adds.
  const addStart =
    input.cancelSessionIds.length + (input.replace != null ? 1 : 0)
  const linkedActivityIds: string[] = []

  for (let i = 0; i < addActivityOrder.length; i += 1) {
    const sessionId = result.appliedSessionIds[addStart + i]
    const activityId = addActivityOrder[i]
    if (!sessionId || !activityId) continue
    const linked = await markSessionCompletedWithActivity(sessionId, activityId)
    if (linked) linkedActivityIds.push(activityId)
  }

  return { ...result, linkedActivityIds }
}

async function markSessionCompletedWithActivity(
  sessionId: string,
  activityId: string
): Promise<boolean> {
  const { error } = await coachDb()
    .from('coach_planned_session')
    .update({
      completed_activity_id: activityId,
      status: 'completed',
      watch_sync_state: 'pending',
    })
    .eq('id', sessionId)

  if (error) {
    console.error('[audible] Failed to link activity:', error.message)
    return false
  }
  return true
}

function draftFromActivity(
  activity: Activity,
  date: string,
  reason: string,
  addIndex: number
): SessionDraft {
  const minutes = Math.max(1, Math.round(activity.durationSeconds / 60))
  const sport = activity.sport
  return {
    sessionDate: date,
    slot: addIndex === 0 ? 'primary' : 'second',
    sport,
    sessionType: defaultSessionType(sport),
    title: `${sportLabel(sport)} · ${minutes} min`.slice(0, 80),
    description: `Uploaded ${activity.rawType.replace(/_/g, ' ')}.`,
    plannedDurationSeconds: activity.durationSeconds,
    plannedDistanceMeters: activity.distanceMeters ?? undefined,
    rationale: reason.length >= 10 ? reason : `${reason} (audible from upload)`.slice(0, 600),
  }
}

function defaultSessionType(sport: Sport): SessionDraft['sessionType'] {
  switch (sport) {
    case 'strength':
      return 'strength'
    case 'pt':
      return 'rehab'
    case 'swim':
      return 'technique'
    case 'walk':
      return 'walk_run'
    case 'hiit':
      return 'intervals'
    case 'brick':
      return 'brick'
    case 'rest':
      return 'rest'
    case 'run':
    case 'bike':
    case 'cross':
    case 'other':
    default:
      return 'z2'
  }
}

function sportLabel(sport: Sport): string {
  const labels: Record<Sport, string> = {
    swim: 'Swim',
    bike: 'Bike',
    run: 'Run',
    strength: 'Strength',
    pt: 'PT',
    brick: 'Brick',
    walk: 'Walk',
    hiit: 'HIIT',
    cross: 'Cross-train',
    other: 'Workout',
    rest: 'Rest',
  }
  return labels[sport]
}

export interface RecentAudible {
  id: string
  createdAt: string
  sessionId: string | null
  actor: string
  changeType: string
  trigger: string | null
  reason: string
  autoApplied: boolean
  beforeSummary: string | null
  afterSummary: string | null
}

export async function getRecentAudibles(days = 14, limit = 20): Promise<RecentAudible[]> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)

  const { data, error } = await coachDb()
    .from('coach_audible')
    .select(
      'id, created_at, session_id, actor, change_type, trigger, reason, auto_applied, before_state, after_state'
    )
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[audible] Failed to load recent audibles:', error.message)
    return []
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    createdAt: row.created_at as string,
    sessionId: (row.session_id as string | null) ?? null,
    actor: row.actor as string,
    changeType: row.change_type as string,
    trigger: (row.trigger as string | null) ?? null,
    reason: row.reason as string,
    autoApplied: Boolean(row.auto_applied),
    beforeSummary: summariseState(row.before_state),
    afterSummary: summariseState(row.after_state),
  }))
}

function summariseState(state: unknown): string | null {
  if (state == null || typeof state !== 'object') return null
  const row = state as Record<string, unknown>
  const sport = (row.sport as string | undefined) ?? null
  const title = (row.title as string | undefined) ?? null
  const toDate = (row.toDate as string | undefined) ?? null
  if (toDate) return `→ ${toDate}`
  if (sport && title) return `${sport}: ${title}`
  if (title) return title
  if (sport) return sport
  return null
}
