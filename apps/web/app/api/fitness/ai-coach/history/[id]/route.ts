/**
 * AI Coach Conversation API
 * DELETE - Delete a specific conversation by ID
 */

import { config } from '@/lib/config'
import { deleteConversation } from '@/lib/services/ai-coach.service'
import { NextRequest } from 'next/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!config.aiCoach.isConfigured) {
      return Response.json(
        { success: false, error: 'AI Coach is not configured.' },
        { status: 503 }
      )
    }

    const { id } = await params

    if (!id) {
      return Response.json(
        { success: false, error: 'Missing conversation ID' },
        { status: 400 }
      )
    }

    const deleted = await deleteConversation(id)

    return Response.json({
      success: deleted,
      message: deleted ? 'Conversation deleted' : 'Failed to delete conversation',
    })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
