/**
 * POST /api/coach/checkin — the 30-second daily check-in
 *
 * Pain, RPE, sleep quality, PT completion and nutrition adherence in one
 * request. Readiness is recomputed immediately, and if a reported pain score
 * now blocks a scheduled session the caller is told so in the response rather
 * than discovering it at the trailhead.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { computeAndStoreReadiness } from '@/lib/services/coach/analytics.service'
import { coachDb, logSymptom } from '@/lib/services/coach/coach-data.service'
import { autoDowngradeToday } from '@/lib/services/coach/plan.service'
import { readinessGuidance } from '@petehome/coach-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const checkinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  symptoms: z
    .array(
      z.object({
        site: z.string().min(2),
        painScore: z.number().int().min(0).max(10),
        context: z.enum(['during', 'after', 'next_morning', 'rest']).optional(),
        swelling: z.boolean().optional(),
        instability: z.boolean().optional(),
        locking: z.boolean().optional(),
        notes: z.string().max(500).optional(),
      })
    )
    .optional(),
  feedback: z
    .object({
      sessionId: z.string().uuid().optional(),
      rpe: z.number().int().min(1).max(10).optional(),
      maxPain: z.number().int().min(0).max(10).optional(),
      mood: z.number().int().min(1).max(5).optional(),
      energy: z.number().int().min(1).max(5).optional(),
      sleepQuality: z.number().int().min(1).max(5).optional(),
      nutritionAdherence: z.number().int().min(1).max(5).optional(),
      notes: z.string().max(1000).optional(),
    })
    .optional(),
  ptCompleted: z
    .array(
      z.object({
        protocolId: z.string().uuid(),
        skipped: z.boolean().optional(),
        completedItemIds: z.array(z.string().uuid()).optional(),
      })
    )
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = checkinSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        400
      )
    }

    const input = parsed.data
    const date =
      input.date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const db = coachDb()

    const symptomIds: string[] = []
    for (const symptom of input.symptoms ?? []) {
      // Zero-pain entries are still recorded: the absence of pain on a run day
      // is evidence the progression is working.
      symptomIds.push(await logSymptom({ ...symptom, logDate: date }))
    }

    if (input.feedback) {
      const { error } = await db.from('coach_session_feedback').insert({
        session_id: input.feedback.sessionId ?? null,
        feedback_date: date,
        rpe: input.feedback.rpe ?? null,
        mood: input.feedback.mood ?? null,
        energy: input.feedback.energy ?? null,
        sleep_quality: input.feedback.sleepQuality ?? null,
        max_pain:
          input.feedback.maxPain ??
          (input.symptoms?.length
            ? Math.max(...input.symptoms.map((symptom) => symptom.painScore))
            : null),
        nutrition_adherence: input.feedback.nutritionAdherence ?? null,
        notes: input.feedback.notes ?? null,
      })

      if (error) console.error('[coach] Failed to save feedback:', error.message)
    }

    for (const completion of input.ptCompleted ?? []) {
      const { error } = await db.from('coach_pt_completion').upsert(
        {
          protocol_id: completion.protocolId,
          completed_date: date,
          skipped: completion.skipped ?? false,
          completed_items: completion.completedItemIds ?? [],
        },
        { onConflict: 'protocol_id,completed_date' }
      )

      if (error) console.error('[coach] Failed to record PT completion:', error.message)
    }

    const readiness = await computeAndStoreReadiness(date).catch(() => null)

    // A newly reported pain score can invalidate a session that is still on
    // today's plan; resolve that now rather than letting the athlete find out
    // when they try to start it.
    const isToday = date === new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const downgrade = isToday
      ? await autoDowngradeToday().catch(() => ({ downgraded: [], report: null }))
      : { downgraded: [], report: null }

    return successResponse({
      date,
      symptomsLogged: symptomIds.length,
      readiness: readiness
        ? {
            score: readiness.score,
            level: readiness.level,
            flags: readiness.flags,
            guidance: readinessGuidance(readiness.level),
          }
        : null,
      planChanged: downgrade.downgraded.length > 0,
      downgradedSessions: downgrade.downgraded.map((session) => ({
        id: session.id,
        title: session.title,
      })),
      redFlag:
        downgrade.report?.violations.some((violation) => violation.severity === 'red_flag') ?? false,
      guardrailMessages:
        downgrade.report?.violations
          .filter((violation) => violation.severity === 'block' || violation.severity === 'red_flag')
          .map((violation) => ({ message: violation.message, remedy: violation.remedy })) ?? [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}
