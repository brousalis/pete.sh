/**
 * AI Coach Chat History List API
 * GET - List all conversations (lightweight summaries)
 */

import { config } from '@/lib/config'
import { listConversations } from '@/lib/services/ai-coach.service'

export async function GET() {
  try {
    if (!config.aiCoach.isConfigured) {
      return Response.json(
        { success: false, error: 'AI Coach is not configured.' },
        { status: 503 }
      )
    }

    const conversations = await listConversations()

    return Response.json({
      success: true,
      data: conversations,
    })
  } catch (error) {
    console.error('Error listing conversations:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
