/**
 * Coffee Recommendation by ID API Routes
 * PUT - Update recommendation
 * DELETE - Delete recommendation
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/coffee/config/recommendations/[id]
 * Update recommendation
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const recommendation = await coffeeConfigService.updateRecommendation(
      id,
      body
    )

    if (!recommendation) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to update recommendation',
          },
          { status: 500 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: recommendation,
      })
    )
  } catch (error) {
    console.error('Error updating recommendation:', error)
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
 * DELETE /api/coffee/config/recommendations/[id]
 * Delete recommendation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await coffeeConfigService.deleteRecommendation(id)

    return withCors(
      NextResponse.json({
        success: true,
      })
    )
  } catch (error) {
    console.error('Error deleting recommendation:', error)
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
