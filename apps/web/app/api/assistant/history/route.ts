/**
 * Assistant Chat History API
 * GET - Load the most recent conversation or a specific one by chatId.
 * Supports pagination: limit (default 50), before (messageId) for "load older".
 */

import { NextRequest } from 'next/server'
import { config } from '@/lib/config'
import {
  getLatestAssistantChatId,
  loadAssistantChatMessagesWindow,
} from '@/lib/services/assistant-memory.service'

export async function GET(request: NextRequest) {
  try {
    if (!config.aiCoach.isConfigured) {
      return Response.json(
        { success: false, error: 'Assistant is not configured.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')
    const userId = searchParams.get('userId') ?? undefined
    const limitParam = searchParams.get('limit')
    const beforeMessageId = searchParams.get('before') ?? undefined

    const targetId = chatId || (await getLatestAssistantChatId(userId))
    if (!targetId) {
      return Response.json({
        success: true,
        data: { chatId: null, messages: [], hasMore: false },
      })
    }

    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50
    const { messages, hasMore, totalCount } = await loadAssistantChatMessagesWindow(targetId, {
      limit,
      beforeMessageId: beforeMessageId || undefined,
    })

    return Response.json({
      success: true,
      data: { chatId: targetId, messages, hasMore, totalCount },
    })
  } catch (error) {
    console.error('[Assistant] Error loading history:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
