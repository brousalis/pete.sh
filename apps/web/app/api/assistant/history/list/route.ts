/**
 * Assistant Chat History List API
 * GET - List conversation summaries
 */

import { NextRequest } from 'next/server'
import { config } from '@/lib/config'
import { listAssistantConversations } from '@/lib/services/assistant-memory.service'

export async function GET(request: NextRequest) {
  try {
    if (!config.aiCoach.isConfigured) {
      return Response.json(
        { success: false, error: 'Assistant is not configured.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') ?? undefined

    const conversations = await listAssistantConversations(userId)

    return Response.json({
      success: true,
      data: conversations,
    })
  } catch (error) {
    console.error('[Assistant] Error listing conversations:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
