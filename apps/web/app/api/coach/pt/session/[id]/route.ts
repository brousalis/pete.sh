/**
 * GET   /api/coach/pt/session/[id] — poll session state (display)
 * PATCH /api/coach/pt/session/[id] — apply remote command
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import {
  applyPlayerCommand,
  getPlayerSession,
  tickPlayerSession,
} from '@/lib/services/coach/pt-player.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('play') }),
  z.object({ type: z.literal('pause') }),
  z.object({ type: z.literal('resume') }),
  z.object({ type: z.literal('complete_step') }),
  z.object({ type: z.literal('add_rest'), seconds: z.number().int().min(1).max(300) }),
  z.object({ type: z.literal('skip_step') }),
  z.object({ type: z.literal('skip_exercise') }),
  z.object({ type: z.literal('previous_step') }),
  z.object({ type: z.literal('goto_exercise'), exerciseId: z.string().uuid() }),
  z.object({ type: z.literal('inc_rep') }),
  z.object({ type: z.literal('end') }),
  z.object({ type: z.literal('set_audio'), enabled: z.boolean() }),
  z.object({ type: z.literal('tick') }),
])

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!z.string().uuid().safeParse(id).success) {
      return errorResponse('Invalid session id.', 400)
    }

    const shouldTick = request.nextUrl.searchParams.get('tick') !== '0'
    const session = shouldTick ? await tickPlayerSession(id) : await getPlayerSession(id)
    if (!session) return errorResponse('Session not found.', 404)
    return successResponse(session)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!z.string().uuid().safeParse(id).success) {
      return errorResponse('Invalid session id.', 400)
    }

    const parsed = commandSchema.safeParse(await request.json())
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
        400
      )
    }

    if (parsed.data.type === 'tick') {
      const session = await tickPlayerSession(id)
      return successResponse(session)
    }

    const session = await applyPlayerCommand(id, parsed.data)
    return successResponse(session)
  } catch (error) {
    return handleApiError(error)
  }
}
