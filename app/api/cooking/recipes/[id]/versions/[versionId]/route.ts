/**
 * Recipe Version API Routes
 * GET - Get specific version
 * POST - Restore recipe to this version
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookingService } from '@/lib/services/cooking.service'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

/**
 * GET /api/cooking/recipes/[id]/versions/[versionId]
 * Get a specific version
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params

    const version = await cookingService.getRecipeVersion(id, versionId)

    if (!version) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Version not found',
          },
          { status: 404 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: version,
      })
    )
  } catch (error) {
    console.error('Error fetching version:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    )
  }
}

/**
 * POST /api/cooking/recipes/[id]/versions/[versionId]
 * Restore recipe to this version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params

    const recipe = await cookingService.restoreRecipeVersion(id, versionId)

    return withCors(
      NextResponse.json({
        success: true,
        data: recipe,
        message: 'Recipe restored to version',
      })
    )
  } catch (error) {
    console.error('Error restoring version:', error)
    return withCors(
      NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
