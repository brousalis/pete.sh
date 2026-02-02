/**
 * Coffee Golden Rules API Routes
 * GET - List rules
 * POST - Create rule
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/coffee/config/rules
 * List golden rules
 */
export async function GET() {
  try {
    const rules = await coffeeConfigService.getGoldenRules()

    return withCors(
      NextResponse.json({
        success: true,
        data: rules,
      })
    )
  } catch (error) {
    console.error('Error fetching golden rules:', error)
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
 * POST /api/coffee/config/rules
 * Create a new golden rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.description) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Title and description are required',
          },
          { status: 400 }
        )
      )
    }

    const rule = await coffeeConfigService.createGoldenRule(body)

    if (!rule) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to create golden rule',
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
    console.error('Error creating golden rule:', error)
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
