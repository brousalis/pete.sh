/**
 * GET /api/coach/conversations — thread list for the chat sidebar
 */

import { handleApiError, successResponse } from '@/lib/api/utils'
import { listConversations } from '@/lib/services/coach/conversation.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return successResponse(await listConversations())
  } catch (error) {
    return handleApiError(error)
  }
}
