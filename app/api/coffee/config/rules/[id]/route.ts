/**
 * Coffee Golden Rule by ID API Routes
 * PUT - Update rule
 * DELETE - Delete rule
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/coffee/config/rules/[id]
 * Update golden rule
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const rule = await coffeeConfigService.updateGoldenRule(id, body)

    if (!rule) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to update golden rule',
          },
          { status: 500 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: rule,
      })
    )
  } catch (error) {
    console.error('Error updating golden rule:', error)
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
 * DELETE /api/coffee/config/rules/[id]
 * Delete golden rule
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await coffeeConfigService.deleteGoldenRule(id)

    return withCors(
      NextResponse.json({
        success: true,
      })
    )
  } catch (error) {
    console.error('Error deleting golden rule:', error)
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
