/**
 * AI Chef Chat History API
 * GET - Load the most recent chat conversation or a specific one by ID
 */

import { NextRequest } from 'next/server'
import {
  loadChatMessages,
  getLatestChatId,
} from '@/lib/services/ai-chef.service'
import { config } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    if (!config.aiCoach.isConfigured) {
      return Response.json(
        { success: false, error: 'AI Chef is not configured.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')

    const targetId = chatId || (await getLatestChatId())
    if (!targetId) {
      return Response.json({ success: true, data: { chatId: null, messages: [] } })
    }

    const messages = await loadChatMessages(targetId)

    return Response.json({
      success: true,
      data: { chatId: targetId, messages },
    })
  } catch (error) {
    console.error('Error loading AI Chef chat history:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
