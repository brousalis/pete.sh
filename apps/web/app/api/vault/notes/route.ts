/**
 * Vault Notes API - Collection Routes
 * GET: List notes (with optional filters)
 * POST: Create new note (localhost only)
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { vaultService } from '@/lib/services/vault.service'
import type { CreateVaultNoteInput, VaultNoteFilters } from '@/lib/types/vault.types'
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
 * GET /api/vault/notes
 * List vault notes with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const pinned = searchParams.get('pinned')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    const filters: VaultNoteFilters = {}
    if (tag) filters.tag = tag
    if (search) filters.search = search
    if (pinned !== null) filters.pinned = pinned === 'true'

    const result = await vaultService.getNotes(filters, { page, pageSize })

    return withCors(
      NextResponse.json({
        success: true,
        data: {
          notes: result.notes,
          total: result.total,
          page,
          pageSize,
          hasMore: page * pageSize < result.total,
        },
      })
    )
  } catch (error) {
    console.error('Error fetching vault notes:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to fetch notes',
        },
        { status: 500 }
      )
    )
  }
}

/**
 * POST /api/vault/notes
 * Create a new vault note (localhost only)
 */
export async function POST(request: NextRequest) {
  try {
    if (!isLocalhostRequest(request)) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Note creation is only available on localhost',
          },
          { status: 403 }
        )
      )
    }

    const body = await request.json()

    const input: CreateVaultNoteInput = {
      title: body.title?.trim() || undefined,
      content: body.content || undefined,
      contentHtml: body.contentHtml || undefined,
      tags: body.tags || [],
      isPinned: body.isPinned || false,
      sourceUrl: body.sourceUrl?.trim() || undefined,
    }

    const note = await vaultService.createNote(input)

    if (!note) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to create note',
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
    console.error('Error creating vault note:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to create note',
        },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
