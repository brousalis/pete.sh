/**
 * PATCH /api/coach/sessions/[id] — athlete mark-done / skip
 *
 * Records that a planned session was completed or skipped. Idempotent: posting
 * the same status twice succeeds without rewriting. Plan mutations (move,
 * cancel, replace) still go through /api/coach/plan → applyProposal.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { setSessionAthleteStatus } from '@/lib/services/coach/coach-data.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  status: z.enum(['completed', 'skipped']),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    if (!z.string().uuid().safeParse(id).success) {
      return errorResponse('Invalid session id.', 400)
    }

    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        400
      )
    }

    try {
      const session = await setSessionAthleteStatus(id, parsed.data.status)
      return successResponse({
        id: session.id,
        status: session.status,
        title: session.title,
        sessionDate: session.sessionDate,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update session.'
      if (message.includes('not found')) return errorResponse(message, 404)
      if (message.includes('already')) return errorResponse(message, 409)
      throw error
    }
  } catch (error) {
    return handleApiError(error)
  }
}
