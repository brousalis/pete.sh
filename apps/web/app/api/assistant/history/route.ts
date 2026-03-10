/**
 * Assistant Chat History API
 * GET - Load the most recent conversation or a specific one by chatId
 */

import { NextRequest } from 'next/server'
import { config } from '@/lib/config'
import {
  getLatestAssistantChatId,
  loadAssistantChatMessages,
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

    const targetId = chatId || (await getLatestAssistantChatId(userId))
    if (!targetId) {
      return Response.json({ success: true, data: { chatId: null, messages: [] } })
    }

    const messages = await loadAssistantChatMessages(targetId)

    return Response.json({
      success: true,
      data: { chatId: targetId, messages },
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
