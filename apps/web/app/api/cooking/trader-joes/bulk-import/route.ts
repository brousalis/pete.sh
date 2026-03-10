/**
 * Trader Joe's Bulk Import API
 * POST - Import all TJ cache recipes into the recipes table
 * Preserves TJ cache UUIDs for meal plan reference integrity
 */

import { NextResponse } from 'next/server'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import { traderJoesService } from '@/lib/services/trader-joes.service'
import { maybeRecomputeNutrition } from '@/lib/services/nutrition.service'
import type { TraderJoesRecipe } from '@/lib/types/cooking.types'
import { withCors, corsOptionsResponse } from '@/lib/api/cors'

export async function POST() {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) {
    return withCors(
      NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })
    )
  }

  try {
    const allTjCacheRecipes = await traderJoesService.searchRecipes()

    const { data: existingImported } = await supabase
      .from('recipes')
      .select('source_url')
      .eq('source', 'trader_joes')

    const importedUrls = new Set(
      (existingImported || []).map((r: { source_url: string | null }) => r.source_url).filter(Boolean)
    )

    const toImport: TraderJoesRecipe[] = allTjCacheRecipes.filter(
      (tj) => !importedUrls.has(tj.url)
    )

    if (toImport.length === 0) {
      return withCors(
        NextResponse.json({
          success: true,
          imported: 0,
          skipped: allTjCacheRecipes.length,
          errors: [],
          message: 'All TJ recipes already imported',
        })
      )
    }

    const recipeRows: Record<string, unknown>[] = []
    const ingredientRows: Record<string, unknown>[] = []
    const errors: string[] = []
    const now = new Date().toISOString()

    for (const tj of toImport) {
      try {
        const input = await traderJoesService.importRecipe(tj)

        recipeRows.push({
          id: tj.id,
          name: input.name,
          description: input.description ?? null,
          source: 'trader_joes',
          source_url: input.source_url ?? null,
          prep_time: input.prep_time ?? null,
          cook_time: input.cook_time ?? null,
          servings: input.servings ?? null,
          difficulty: null,
          tags: input.tags || [],
          image_url: input.image_url ?? null,
          instructions: JSON.stringify(input.instructions || []),
          notes: null,
          is_favorite: false,
          created_at: now,
          updated_at: now,
        })

        if (input.ingredients) {
          for (const ing of input.ingredients) {
            ingredientRows.push({
              recipe_id: tj.id,
              name: ing.name,
              amount: ing.amount ?? null,
              unit: ing.unit ?? null,
              notes: ing.notes ?? null,
              order_index: ing.order_index ?? 0,
            })
          }
        }
      } catch (err) {
        errors.push(`${tj.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    const BATCH_SIZE = 200
    let importedCount = 0

    for (let i = 0; i < recipeRows.length; i += BATCH_SIZE) {
      const batch = recipeRows.slice(i, i + BATCH_SIZE)
      const { error: recipeErr } = await supabase
        .from('recipes')
        .upsert(batch as never[], { onConflict: 'id', ignoreDuplicates: true })

      if (recipeErr) {
        errors.push(`Recipe batch ${i}-${i + batch.length}: ${recipeErr.message}`)
      } else {
        importedCount += batch.length
      }
    }

    for (let i = 0; i < ingredientRows.length; i += BATCH_SIZE) {
      const batch = ingredientRows.slice(i, i + BATCH_SIZE)
      const { error: ingErr } = await supabase
        .from('recipe_ingredients')
        .insert(batch as never[])

      if (ingErr) {
        errors.push(`Ingredient batch ${i}-${i + batch.length}: ${ingErr.message}`)
      }
    }

    // Fire-and-forget nutrition enrichment for newly imported recipes
    const importedIds = recipeRows.map((r) => r.id as string)
    if (importedIds.length > 0) {
      console.log(`[TJ Import] Queuing nutrition enrichment for ${importedIds.length} recipes`)
      Promise.allSettled(
        importedIds.map((id) => maybeRecomputeNutrition(id))
      ).then((results) => {
        const succeeded = results.filter((r) => r.status === 'fulfilled').length
        console.log(`[TJ Import] Nutrition enrichment: ${succeeded}/${importedIds.length} completed`)
      }).catch(() => {})
    }

    return withCors(
      NextResponse.json({
        success: errors.length === 0,
        imported: importedCount,
        skipped: allTjCacheRecipes.length - toImport.length,
        errors,
        message: `Imported ${importedCount} recipes, skipped ${allTjCacheRecipes.length - toImport.length}. Nutrition enrichment queued.`,
      })
    )
  } catch (error) {
    console.error('Bulk import error:', error)
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
