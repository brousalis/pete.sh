/**
 * Coffee Recommendations API Routes
 * GET - List recommendations
 * POST - Create recommendation
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/coffee/config/recommendations
 * List recommendations
 */
export async function GET() {
  try {
    const recommendations = await coffeeConfigService.getRecommendations()

    return withCors(
      NextResponse.json({
        success: true,
        data: recommendations,
      })
    )
  } catch (error) {
    console.error('Error fetching recommendations:', error)
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
 * POST /api/coffee/config/recommendations
 * Create a new recommendation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.method || !body.cupSize || !body.roast) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Name, method, cupSize, and roast are required',
          },
          { status: 400 }
        )
      )
    }

    const recommendation = await coffeeConfigService.createRecommendation(body)

    if (!recommendation) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to create recommendation',
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
    console.error('Error creating recommendation:', error)
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
