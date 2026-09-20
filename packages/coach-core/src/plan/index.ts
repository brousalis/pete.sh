/**
 * Plan schemas and the mutation engine.
 *
 * Every change the coach makes to the calendar arrives as structured output
 * validated against these schemas, then passes the Injury Guard before it is
 * written. The model proposes; the guardrails dispose. This is the single
 * chokepoint that makes "health outranks the goal" enforceable rather than
 * aspirational.
 */

import { z } from 'zod'

import { evaluateGuardrails, type GuardrailContext } from '../guardrails/engine'
import type { GuardrailReport, PlannedSession, Sport } from '../types'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const sportSchema = z.enum([
  'swim',
  'bike',
  'run',
  'strength',
  'pt',
  'brick',
  'walk',
  'hiit',
  'cross',
  'other',
  'rest',
])

export const sessionTypeSchema = z.enum([
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

const stepGoalSchema = z.object({
  type: z.enum(['time', 'distance', 'open', 'repetitions']),
  value: z.number().positive().optional(),
  unit: z.enum(['seconds', 'meters', 'yards', 'reps']).optional(),
})

const stepAlertSchema = z.object({
  type: z.enum(['heartRate', 'pace', 'power', 'cadence', 'none']),
  min: z.number().optional(),
  max: z.number().optional(),
  zone: z.number().int().min(1).max(5).optional(),
})

const workoutStepSchema = z.object({
  kind: z.enum(['warmup', 'work', 'recovery', 'cooldown']),
  label: z.string().max(60).optional(),
  goal: stepGoalSchema,
  alert: stepAlertSchema.optional(),
  note: z.string().max(200).optional(),
})

export const structuredWorkoutSchema = z.object({
  warmup: workoutStepSchema.optional(),
  blocks: z
    .array(
      z.object({
        repeat: z.number().int().min(1).max(40),
        steps: z.array(workoutStepSchema).min(1).max(10),
      })
    )
    .max(12),
  cooldown: workoutStepSchema.optional(),
})

export const sessionTargetsSchema = z.object({
  hrZone: z.number().int().min(1).max(5).optional(),
  hrRange: z.tuple([z.number(), z.number()]).optional(),
  paceRange: z.tuple([z.number(), z.number()]).optional(),
  cadenceRange: z.tuple([z.number(), z.number()]).optional(),
  rpe: z.number().min(1).max(10).optional(),
  powerRange: z.tuple([z.number(), z.number()]).optional(),
})

/** A session the coach wants to create or replace. */
export const sessionDraftSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  slot: z.enum(['primary', 'second', 'pt_morning', 'pt_evening']).default('primary'),
  sport: sportSchema,
  sessionType: sessionTypeSchema,
  title: z.string().min(3).max(80),
  description: z.string().max(1000).optional(),
  plannedDurationSeconds: z.number().int().positive().max(6 * 3600).optional(),
  plannedDistanceMeters: z.number().positive().max(200_000).optional(),
  steps: structuredWorkoutSchema.optional(),
  targets: sessionTargetsSchema.optional(),
  rationale: z.string().min(10).max(600),
})

export type SessionDraft = z.infer<typeof sessionDraftSchema>

export const planChangeSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add'),
    session: sessionDraftSchema,
  }),
  z.object({
    action: z.literal('replace'),
    sessionId: z.string().uuid(),
    session: sessionDraftSchema,
  }),
  z.object({
    action: z.literal('move'),
    sessionId: z.string().uuid(),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().min(10).max(400),
  }),
  z.object({
    action: z.literal('cancel'),
    sessionId: z.string().uuid(),
    reason: z.string().min(10).max(400),
  }),
  z.object({
    action: z.literal('downgrade'),
    sessionId: z.string().uuid(),
    session: sessionDraftSchema,
    reason: z.string().min(10).max(400),
  }),
])

export type PlanChange = z.infer<typeof planChangeSchema>

export const planProposalSchema = z.object({
  summary: z.string().min(10).max(1000),
  changes: z.array(planChangeSchema).min(1).max(30),
  /** Set when the coach believes the change should apply without approval. */
  autoApply: z.boolean().default(false),
})

export type PlanProposal = z.infer<typeof planProposalSchema>

/** A full week the planner generates on Sunday. */
export const weekPlanSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  focus: z.string().min(5).max(200),
  isDeload: z.boolean().default(false),
  rationale: z.string().min(20).max(2000),
  sessions: z.array(sessionDraftSchema).min(1).max(21),
})

export type WeekPlan = z.infer<typeof weekPlanSchema>

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  ok: boolean
  /** Populated when the schema itself rejected the payload. */
  schemaErrors: string[]
  /** Populated when the guardrails rejected an otherwise valid payload. */
  guardrailReport: GuardrailReport | null
  /** Sessions as they would exist after applying the proposal. */
  projectedSessions: PlannedSession[]
}

/**
 * Apply a proposal in memory and evaluate the result against the guardrails.
 *
 * Nothing is persisted. The caller writes only when `ok` is true, or when the
 * athlete explicitly overrides a warning-level report.
 */
export function validateProposal(
  proposal: unknown,
  existingSessions: PlannedSession[],
  guardrailContext: Omit<GuardrailContext, 'sessions'>
): ValidationResult {
  const parsed = planProposalSchema.safeParse(proposal)

  if (!parsed.success) {
    return {
      ok: false,
      schemaErrors: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || 'proposal'}: ${issue.message}`
      ),
      guardrailReport: null,
      projectedSessions: existingSessions,
    }
  }

  const projected = applyChanges(existingSessions, parsed.data.changes)

  const report = evaluateGuardrails({
    ...guardrailContext,
    sessions: projected,
    existingSessions,
  })

  return {
    ok: report.passed,
    schemaErrors: [],
    guardrailReport: report,
    projectedSessions: projected,
  }
}

/**
 * Apply changes to a session list in memory.
 *
 * Draft sessions get a temporary id prefixed `draft-` so the guardrail engine
 * can reference them in violation messages before anything is written.
 */
export function applyChanges(
  sessions: PlannedSession[],
  changes: PlanChange[]
): PlannedSession[] {
  let result = [...sessions]

  for (const change of changes) {
    switch (change.action) {
      case 'add': {
        result.push(draftToSession(change.session))
        break
      }
      case 'replace': {
        const index = result.findIndex((session) => session.id === change.sessionId)
        const replacement = draftToSession(change.session, change.sessionId)
        if (index >= 0) result[index] = replacement
        else result.push(replacement)
        break
      }
      case 'downgrade': {
        const index = result.findIndex((session) => session.id === change.sessionId)
        const replacement = draftToSession(change.session, change.sessionId)
        if (index >= 0) result[index] = { ...replacement, status: 'modified' }
        else result.push(replacement)
        break
      }
      case 'move': {
        result = result.map((session) =>
          session.id === change.sessionId
            ? { ...session, sessionDate: change.toDate, status: 'modified' }
            : session
        )
        break
      }
      case 'cancel': {
        result = result.map((session) =>
          session.id === change.sessionId ? { ...session, status: 'cancelled' } : session
        )
        break
      }
    }
  }

  return result.filter((session) => session.status !== 'cancelled')
}

let draftCounter = 0

function draftToSession(draft: SessionDraft, id?: string): PlannedSession {
  draftCounter += 1

  return {
    id: id ?? `draft-${draftCounter}`,
    weekId: '',
    sessionDate: draft.sessionDate,
    slot: draft.slot,
    sortOrder: draft.slot === 'second' ? 1 : 0,
    sport: draft.sport as Sport,
    sessionType: draft.sessionType,
    title: draft.title,
    description: draft.description ?? null,
    plannedDurationSeconds: draft.plannedDurationSeconds ?? null,
    plannedDistanceMeters: draft.plannedDistanceMeters ?? null,
    plannedLoad: estimatePlannedLoad(draft),
    steps: draft.steps ?? {},
    targets: draft.targets ?? {},
    rationale: draft.rationale,
    guardrailReport: null,
    status: 'planned',
    completedActivityId: null,
    watchSyncState: 'pending',
  }
}

/**
 * Planned TSS for a session that has not happened yet.
 *
 * Needed so ACWR and weekly-load rules can evaluate a *proposed* week rather
 * than only reacting after the training is done.
 */
export function estimatePlannedLoad(draft: SessionDraft): number {
  const hours = (draft.plannedDurationSeconds ?? 0) / 3600
  if (hours <= 0) return 0

  const intensityFactor: Record<string, number> = {
    recovery: 0.55,
    z2: 0.7,
    endurance: 0.72,
    long: 0.75,
    walk_run: 0.6,
    tempo: 0.85,
    threshold: 0.92,
    intervals: 0.95,
    vo2: 1.0,
    sprint: 1.0,
    technique: 0.6,
    test: 0.95,
    strength: 0.6,
    rehab: 0.35,
    brick: 0.82,
    rest: 0,
  }

  const factor = intensityFactor[draft.sessionType] ?? 0.7
  // Same quadratic relationship the measured TSS formulas use.
  return Math.round(hours * factor * factor * 100)
}

// ---------------------------------------------------------------------------
// WorkoutKit conversion
// ---------------------------------------------------------------------------

/**
 * Flatten a structured workout for the iOS companion, which builds a
 * WorkoutKit CustomWorkout from it.
 *
 * Kept here rather than in the app so the watch and the web UI always show
 * the same interpretation of a session.
 */
export function flattenWorkout(
  workout: z.infer<typeof structuredWorkoutSchema>
): { kind: string; label: string; goal: unknown; alert: unknown }[] {
  const steps: { kind: string; label: string; goal: unknown; alert: unknown }[] = []

  if (workout.warmup) {
    steps.push({
      kind: 'warmup',
      label: workout.warmup.label ?? 'Warm up',
      goal: workout.warmup.goal,
      alert: workout.warmup.alert ?? null,
    })
  }

  for (const block of workout.blocks) {
    for (let repeat = 0; repeat < block.repeat; repeat++) {
      for (const step of block.steps) {
        steps.push({
          kind: step.kind,
          label:
            block.repeat > 1
              ? `${step.label ?? step.kind} ${repeat + 1}/${block.repeat}`
              : (step.label ?? step.kind),
          goal: step.goal,
          alert: step.alert ?? null,
        })
      }
    }
  }

  if (workout.cooldown) {
    steps.push({
      kind: 'cooldown',
      label: workout.cooldown.label ?? 'Cool down',
      goal: workout.cooldown.goal,
      alert: workout.cooldown.alert ?? null,
    })
  }

  return steps
}

/** Total prescribed duration, for sanity-checking a generated session. */
export function workoutDuration(
  workout: z.infer<typeof structuredWorkoutSchema>
): number | null {
  let total = 0
  let sawOpen = false

  const addStep = (step: z.infer<typeof workoutStepSchema>, multiplier = 1) => {
    if (step.goal.type === 'time' && step.goal.value) {
      total += step.goal.value * multiplier
    } else if (step.goal.type === 'open') {
      sawOpen = true
    }
  }

  if (workout.warmup) addStep(workout.warmup)
  for (const block of workout.blocks) {
    for (const step of block.steps) addStep(step, block.repeat)
  }
  if (workout.cooldown) addStep(workout.cooldown)

  // An open-ended step means the total is a floor, not a duration.
  return sawOpen ? null : total
}
