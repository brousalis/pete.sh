/**
 * AI Chef Single Conversation API
 * DELETE - Delete a conversation by ID
 */

import { NextRequest } from 'next/server'
import { deleteConversation } from '@/lib/services/ai-chef.service'
import { config } from '@/lib/config'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!config.aiCoach.isConfigured) {
      return Response.json(
        { success: false, error: 'AI Chef is not configured.' },
        { status: 503 }
      )
    }

    const { id } = await params
    const deleted = await deleteConversation(id)

    if (!deleted) {
      return Response.json(
        { success: false, error: 'Failed to delete conversation.' },
        { status: 500 }
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error deleting AI Chef conversation:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
