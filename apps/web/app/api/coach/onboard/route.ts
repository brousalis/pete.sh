/**
 * GET /api/coach/onboard — intake + baseline status
 * POST /api/coach/onboard — persist the structured intake interview
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import {
  getAthleteProfile,
  getBenchmarks,
  getConstraints,
  isIntakeComplete,
  updateAthleteProfile,
  upsertConstraint,
} from '@/lib/services/coach/coach-data.service'
import { remember } from '@/lib/services/coach/memory.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const intakeSchema = z.object({
  kneeStatus: z.enum(['cleared_full', 'cleared_graded', 'still_limited', 'flare']),
  kneeNotes: z.string().max(1000).optional(),
  weekdayWindow: z.string().min(2).max(80),
  weekendWindow: z.string().min(2).max(80),
  poolAccess: z.enum(['regular', 'limited', 'none']),
  iceFallback: z.enum(['treadmill', 'indoor_track', 'cancel', 'other']),
  iceFallbackNote: z.string().max(200).optional(),
  twoADays: z.enum(['yes', 'low_impact_only', 'no']),
  nutritionStance: z.enum(['maintenance', 'discuss', 'keep_deficit']),
  nsaidUse: z.enum(['as_needed', 'daily', 'none']),
})

const REQUIRED_TESTS = ['css', 'quad_symmetry', 'bike_z2'] as const

export async function GET() {
  try {
    const [profile, constraints, tests, intakeComplete] = await Promise.all([
      getAthleteProfile(),
      getConstraints(),
      getBenchmarks(),
      isIntakeComplete(),
    ])

    const latestByType = new Map<string, (typeof tests)[number]>()
    for (const test of tests) {
      if (!latestByType.has(test.testType)) latestByType.set(test.testType, test)
    }

    const missingTests = REQUIRED_TESTS.filter((type) => {
      if (type === 'quad_symmetry') {
        return !latestByType.has('quad_symmetry') && !latestByType.has('step_down')
      }
      return !latestByType.has(type)
    })

    return successResponse({
      intakeComplete,
      profile,
      constraints: constraints.filter((row) => row.label !== 'intake_complete'),
      tests: [...latestByType.values()],
      missingTests,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = intakeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        400
      )
    }

    const answers = parsed.data
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    await upsertConstraint({
      kind: 'preference',
      label: 'intake_complete',
      detail: { completedAt: today, ...answers },
    })

    await upsertConstraint({
      kind: 'schedule_window',
      label: 'Weekday training window',
      detail: { window: answers.weekdayWindow },
    })

    await upsertConstraint({
      kind: 'schedule_window',
      label: 'Weekend training window',
      detail: { window: answers.weekendWindow },
    })

    await upsertConstraint({
      kind: 'preference',
      label: 'Winter run fallback',
      detail: {
        mode: answers.iceFallback,
        note: answers.iceFallbackNote ?? null,
      },
    })

    await upsertConstraint({
      kind: 'preference',
      label: 'Two-a-days',
      detail: { policy: answers.twoADays },
    })

    await upsertConstraint({
      kind: 'preference',
      label: 'Nutrition stance',
      detail: { stance: answers.nutritionStance },
    })

    if (answers.poolAccess === 'none') {
      await upsertConstraint({
        kind: 'facility',
        label: 'Pool access',
        detail: { available: false, note: 'No regular pool access at intake' },
      })
    }

    const stanceNote =
      answers.nutritionStance === 'maintenance'
        ? 'Fueling: periodized maintenance. Weight band 170–175 is a constraint, not a deficit.'
        : answers.nutritionStance === 'keep_deficit'
          ? 'Athlete asked to keep a cut. Coach will challenge this against tendon healing and two-a-day load.'
          : 'Nutrition stance left open for discussion with the coach.'

    const profile = await getAthleteProfile()
    const existingNotes = profile?.notes ?? ''
    if (!existingNotes.includes('Intake completed')) {
      await updateAthleteProfile({
        notes: `${existingNotes}\n\nIntake completed ${today}. Knee: ${answers.kneeStatus}. ${stanceNote}`.trim(),
      })
    }

    const memories = [
      `Intake ${today}: knee status ${answers.kneeStatus}${answers.kneeNotes ? ` — ${answers.kneeNotes}` : ''}.`,
      `Weekday sessions: ${answers.weekdayWindow}. Weekend: ${answers.weekendWindow}.`,
      `Ice-day run fallback: ${answers.iceFallback}${answers.iceFallbackNote ? ` (${answers.iceFallbackNote})` : ''}.`,
      `Two-a-days: ${answers.twoADays}. Pool access: ${answers.poolAccess}.`,
      stanceNote,
      `NSAID use: ${answers.nsaidUse}. Chronic NSAID use should be reviewed with the sports MD.`,
    ]

    for (const content of memories) {
      await remember({
        content,
        memoryType: content.includes('NSAID') || content.includes('knee') ? 'fact' : 'preference',
        tags: ['intake'],
        confidence: 0.95,
        source: 'intake',
      }).catch(() => undefined)
    }

    return successResponse({ intakeComplete: true, completedAt: today })
  } catch (error) {
    return handleApiError(error)
  }
}
