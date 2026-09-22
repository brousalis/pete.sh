/**
 * POST /api/coach/pt/complete — mark a protocol done with completed_items.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { logSymptom } from '@/lib/services/coach/coach-data.service'
import { recordPtCompletion } from '@/lib/services/coach/pt-player.service'
import { computeAndStoreReadiness } from '@/lib/services/coach/analytics.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  protocolId: z.string().uuid(),
  completedItemIds: z.array(z.string().uuid()).default([]),
  skipped: z.boolean().optional(),
  notes: z.string().max(500).optional(),
  painScore: z.number().int().min(0).max(10).optional(),
  protocolName: z.string().max(120).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        400
      )
    }

    const input = parsed.data
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    await recordPtCompletion({
      protocolId: input.protocolId,
      completedItemIds: input.completedItemIds,
      skipped: input.skipped,
      notes: input.notes,
    })

    if (input.painScore != null && input.painScore > 0) {
      await logSymptom({
        site: 'r_knee_medial',
        painScore: input.painScore,
        context: 'during',
        notes: `During ${input.protocolName ?? 'PT block'}`,
        logDate: date,
      })
    }

    const readiness = await computeAndStoreReadiness(date).catch(() => null)

    return successResponse({
      date,
      readiness: readiness
        ? { score: readiness.score, level: readiness.level, flags: readiness.flags }
        : null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
