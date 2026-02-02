/**
 * Coffee Roast Strategy by ID API Routes
 * PUT - Update roast strategy
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/coffee/config/roast-strategies/[id]
 * Update roast strategy
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const strategy = await coffeeConfigService.updateRoastStrategy(id, body)

    if (!strategy) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to update roast strategy',
          },
          { status: 500 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: strategy,
      })
    )
  } catch (error) {
    console.error('Error updating roast strategy:', error)
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
