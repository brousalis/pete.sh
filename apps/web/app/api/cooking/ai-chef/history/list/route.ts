/**
 * AI Chef Conversation List API
 * GET - List all conversations with summaries
 */

import { listConversations } from '@/lib/services/ai-chef.service'
import { config } from '@/lib/config'

export async function GET() {
  try {
    if (!config.aiCoach.isConfigured) {
      return Response.json(
        { success: false, error: 'AI Chef is not configured.' },
        { status: 503 }
      )
    }

    const conversations = await listConversations()

    return Response.json({
      success: true,
      data: conversations,
    })
  } catch (error) {
    console.error('Error listing AI Chef conversations:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
