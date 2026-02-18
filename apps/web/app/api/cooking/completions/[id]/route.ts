import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { cookingService } from '@/lib/services/cooking.service'
import type { UpdateMealCompletionInput } from '@/lib/types/cooking.types'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateMealCompletionInput = await request.json()
    const completion = await cookingService.updateMealCompletion(id, body)
    return withCors(NextResponse.json({ success: true, data: completion }))
  } catch (error) {
    console.error('Error updating completion:', error)
    return withCors(
      NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await cookingService.deleteMealCompletion(id)
    return withCors(NextResponse.json({ success: true }))
  } catch (error) {
    console.error('Error deleting completion:', error)
    return withCors(
      NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    )
  }
}

export async function OPTIONS() {
  return corsOptionsResponse()
}
