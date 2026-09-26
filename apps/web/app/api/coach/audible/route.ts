/**
 * POST /api/coach/audible — athlete confirm-first day rewrite.
 *
 * Cancels missed planned work and/or books uploaded actuals (or a pre-swap)
 * through applyProposal so Injury Guard and coach_audible stay authoritative.
 */

import { NextRequest } from 'next/server'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import {
  applyAudible,
  audibleRequestSchema,
} from '@/lib/services/coach/audible.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = audibleRequestSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues
          .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
          .join('; '),
        400
      )
    }

    const result = await applyAudible(parsed.data)
    return successResponse(result, result.applied ? 200 : 409)
  } catch (error) {
    return handleApiError(error)
  }
}
