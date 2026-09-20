/**
 * GET    /api/coach/conversations/[id] — load a thread
 * DELETE /api/coach/conversations/[id] — delete a thread
 */

import { NextRequest } from 'next/server'

import { handleApiError, successResponse } from '@/lib/api/utils'
import {
  deleteConversation,
  getRecentMessages,
} from '@/lib/services/coach/conversation.service'
import { coachDb } from '@/lib/services/coach/coach-data.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: conversation } = await coachDb()
      .from('coach_conversation')
      .select('id, title, summary, message_count, deep_mode')
      .eq('id', id)
      .maybeSingle()

    // A long thread returns its recent window plus the rolling summary; the
    // full transcript stays in the database but is not replayed to the client.
    const messages = await getRecentMessages(id, 40)

    return successResponse({ conversation, messages })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteConversation(id)
    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
