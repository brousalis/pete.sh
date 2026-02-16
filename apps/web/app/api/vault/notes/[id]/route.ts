/**
 * Vault Notes API - Single Note Routes
 * GET: Get single note by ID
 * PUT: Update note (localhost only)
 * DELETE: Delete note (localhost only)
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { vaultService } from '@/lib/services/vault.service'
import type { UpdateVaultNoteInput } from '@/lib/types/vault.types'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Check if request is from localhost
 */
function isLocalhostRequest(request: NextRequest): boolean {
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0] ?? ''
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local')
  )
}

/**
 * GET /api/vault/notes/[id]
 * Get a single vault note by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const note = await vaultService.getNote(id)

    if (!note) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Note not found',
          },
          { status: 404 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: note,
      })
    )
  } catch (error) {
    console.error('Error fetching vault note:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to fetch note',
        },
        { status: 500 }
      )
    )
  }
}

/**
 * PUT /api/vault/notes/[id]
 * Update a vault note (localhost only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isLocalhostRequest(request)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Note updates are only available on localhost',
          },
          { status: 403 }
        )
      )
    }

    const { id } = await params
    const body = await request.json()

    const input: UpdateVaultNoteInput = {}

    if (body.title !== undefined) input.title = body.title
    if (body.content !== undefined) input.content = body.content
    if (body.contentHtml !== undefined) input.contentHtml = body.contentHtml
    if (body.tags !== undefined) input.tags = body.tags
    if (body.isPinned !== undefined) input.isPinned = body.isPinned
    if (body.sourceUrl !== undefined) input.sourceUrl = body.sourceUrl

    const note = await vaultService.updateNote(id, input)

    if (!note) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to update note',
          },
          { status: 500 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: note,
      })
    )
  } catch (error) {
    console.error('Error updating vault note:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to update note',
        },
        { status: 500 }
      )
    )
  }
}

/**
 * DELETE /api/vault/notes/[id]
 * Delete a vault note (localhost only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isLocalhostRequest(request)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Note deletion is only available on localhost',
          },
          { status: 403 }
        )
      )
    }

    const { id } = await params

    const success = await vaultService.deleteNote(id)

    if (!success) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to delete note',
          },
          { status: 500 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
      })
    )
  } catch (error) {
    console.error('Error deleting vault note:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to delete note',
        },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
