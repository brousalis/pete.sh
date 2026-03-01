/**
 * AI Chef Recipe Hints API
 * POST - Get AI-powered recipe prioritization hints for meal plan wizard
 * Body: { prompt: string, candidates: Array<{ id, name, tags?, prep_time?, cook_time?, difficulty?, description? }> }
 * Returns: { prioritizedIds: string[], excludedIds?: string[], reasoning?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRecipeHints, type RecipeHintCandidate } from '@/lib/services/ai-chef.service'
import { withCors } from '@/lib/api/cors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, candidates } = body as { prompt?: string; candidates?: RecipeHintCandidate[] }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return withCors(
        NextResponse.json(
          { success: false, error: 'prompt is required and must be a non-empty string' },
          { status: 400 }
        )
      )
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return withCors(
        NextResponse.json(
          { success: false, error: 'candidates must be a non-empty array' },
          { status: 400 }
        )
      )
    }

    const validCandidates: RecipeHintCandidate[] = candidates.filter(
      (c): c is RecipeHintCandidate =>
        c &&
        typeof c === 'object' &&
        typeof c.id === 'string' &&
        typeof c.name === 'string'
    )

    if (validCandidates.length === 0) {
      return withCors(
        NextResponse.json(
          { success: false, error: 'No valid candidates (each must have id and name)' },
          { status: 400 }
        )
      )
    }

    const result = await getRecipeHints(prompt.trim(), validCandidates)

    if (!result) {
      return withCors(
        NextResponse.json({
          success: true,
          data: { prioritizedIds: [], excludedIds: [], reasoning: 'AI unavailable — using filters only' },
        })
      )
    }

    // Validate returned IDs are in candidates
    const validIds = new Set(validCandidates.map((c) => c.id))
    const prioritizedIds = (result.prioritizedIds || []).filter((id) => validIds.has(id))
    const excludedIds = (result.excludedIds || []).filter((id) => validIds.has(id))

    return withCors(
      NextResponse.json({
        success: true,
        data: {
          prioritizedIds,
          excludedIds,
          reasoning: result.reasoning,
        },
      })
    )
  } catch (error) {
    console.error('[AI Chef] Recipe hints error:', error)
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
