import { handleApiError, successResponse } from '@/lib/api/utils'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { NextRequest } from 'next/server'
import type { UpdateVersionRequest } from '@/lib/types/routine-editor.types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/fitness/routine/versions/[id]
 * Get a specific version by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const adapter = getFitnessAdapter()

    const version = await adapter.getVersion(id)
    if (!version) {
      return successResponse({ error: 'Version not found' }, 404)
    }

    return successResponse(version)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/fitness/routine/versions/[id]
 * Update a draft version
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body: UpdateVersionRequest = await request.json()
    const adapter = getFitnessAdapter()

    const version = await adapter.updateVersion(id, body)
    if (!version) {
      return successResponse({ error: 'Version not found or cannot be updated' }, 404)
    }

    return successResponse(version)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/fitness/routine/versions/[id]
 * Delete a draft version (only drafts can be deleted)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const adapter = getFitnessAdapter()

    const success = await adapter.deleteVersion(id)
    if (!success) {
      return successResponse({ error: 'Version not found or cannot be deleted' }, 404)
    }

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
