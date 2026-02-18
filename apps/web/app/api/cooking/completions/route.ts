import { corsOptionsResponse, withCors } from '@/lib/api/cors'
import { cookingService } from '@/lib/services/cooking.service'
import type { CreateMealCompletionInput } from '@/lib/types/cooking.types'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const recipe_id = searchParams.get('recipe_id') || undefined
    const meal_plan_id = searchParams.get('meal_plan_id') || undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined

    const completions = await cookingService.getMealCompletions({
      recipe_id,
      meal_plan_id,
      limit,
    })

    return withCors(NextResponse.json({ success: true, data: completions }))
  } catch (error) {
    console.error('Error fetching completions:', error)
    return withCors(
      NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMealCompletionInput = await request.json()

    if (!body.recipe_id) {
      return withCors(
        NextResponse.json({ success: false, error: 'recipe_id is required' }, { status: 400 })
      )
    }

    const completion = await cookingService.createMealCompletion(body)
    return withCors(NextResponse.json({ success: true, data: completion }))
  } catch (error) {
    console.error('Error creating completion:', error)
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
