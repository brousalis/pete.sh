/**
 * Coffee Quick Dose by ID API Routes
 * PUT - Update dose
 * DELETE - Delete dose
 */

import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { coffeeConfigService } from '@/lib/services/coffee-config.service'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/coffee/config/doses/[id]
 * Update quick dose
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const dose = await coffeeConfigService.updateQuickDose(id, body)

    if (!dose) {
      return withCors(
        NextResponse.json(
          {
            success: false,
            error: 'Failed to update quick dose',
          },
          { status: 500 }
        )
      )
    }

    return withCors(
      NextResponse.json({
        success: true,
        data: dose,
      })
    )
  } catch (error) {
    console.error('Error updating quick dose:', error)
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
 * DELETE /api/coffee/config/doses/[id]
 * Delete quick dose
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await coffeeConfigService.deleteQuickDose(id)

    return withCors(
      NextResponse.json({
        success: true,
      })
    )
  } catch (error) {
    console.error('Error deleting quick dose:', error)
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
