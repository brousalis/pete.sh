/**
 * GET /api/coach/pt/protocol/[slug] — full protocol for the interactive player.
 */

import { NextRequest } from 'next/server'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { expandProtocol } from '@/lib/coach/pt/expand-protocol'
import { loadProtocolForPlayer } from '@/lib/services/coach/pt-player.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const protocol = await loadProtocolForPlayer(slug)
    if (!protocol) return errorResponse('Protocol not found.', 404)

    const steps = expandProtocol(protocol)
    return successResponse({
      protocol,
      steps,
      stepCount: steps.length,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
