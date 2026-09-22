/**
 * POST /api/coach/pt/session — create a synced player session for a protocol.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { createPlayerSession } from '@/lib/services/coach/pt-player.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  protocolSlug: z.string().min(2).max(80),
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

    const session = await createPlayerSession(parsed.data.protocolSlug)
    return successResponse(session)
  } catch (error) {
    return handleApiError(error)
  }
}
