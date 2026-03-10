/**
 * Assistant Conversation API
 * DELETE - Delete a conversation by ID
 */

import { NextRequest } from 'next/server'
import { config } from '@/lib/config'
import { deleteAssistantConversation } from '@/lib/services/assistant-memory.service'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!config.aiCoach.isConfigured) {
      return Response.json(
        { success: false, error: 'Assistant is not configured.' },
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

    const deleted = await deleteAssistantConversation(id)

    return Response.json({
      success: deleted,
      message: deleted ? 'Conversation deleted' : 'Failed to delete conversation',
    })
  } catch (error) {
    console.error('[Assistant] Error deleting conversation:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
