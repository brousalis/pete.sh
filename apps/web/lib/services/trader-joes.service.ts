/**
 * Trader Joe's Service
 * Handles searching, caching, and importing Trader Joe's recipes
 * All data is stored in Supabase - no scraping needed
 */

import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type { TraderJoesRecipe, CreateRecipeInput } from '@/lib/types/cooking.types'
import {
  sanitizeIngredientName,
  sanitizeIngredientUnit,
  mergeNotes,
} from '@/lib/utils/ingredient-sanitizer'
import { parseIngredientString } from '@/lib/utils/ingredient-parser'

export class TraderJoesService {
  /**
   * Search Trader Joe's recipes from Supabase cache
   */
  async searchRecipes(query?: string, category?: string): Promise<TraderJoesRecipe[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    let dbQuery = supabase.from('trader_joes_recipes_cache').select('*').order('name', { ascending: true })

    if (query) {
      const q = `%${query}%`
      dbQuery = dbQuery.or(
        `name.ilike.${q},category.ilike.${q},url.ilike.${q},recipe_data->>description.ilike.${q},recipe_data->>categories.ilike.${q},recipe_data->>tags.ilike.${q},recipe_data->>ingredients.ilike.${q}`
      )
    }

    if (category) {
      dbQuery = dbQuery.eq('category', category)
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error('Error fetching cached TJ recipes:', error)
      throw new Error(`Failed to fetch recipes: ${error.message}`)
    }

    // Convert to TraderJoesRecipe format
    type TJRow = {
      id: string
      tj_recipe_id: string | null
      name: string
      url: string
      category: string | null
      image_url: string | null
      recipe_data: Record<string, unknown>
      last_scraped_at: string | null
      created_at: string
    }
    const recipes: TraderJoesRecipe[] = ((data || []) as TJRow[]).map((row) => ({
      id: row.id,
      tj_recipe_id: row.tj_recipe_id || undefined,
      name: row.name,
      url: row.url,
      category: row.category || undefined,
      image_url: row.image_url || undefined,
      recipe_data: row.recipe_data as TraderJoesRecipe['recipe_data'],
      last_scraped_at: row.last_scraped_at || undefined,
      created_at: row.created_at,
    }))

    return recipes
  }

  /**
   * Get a Trader Joe's recipe by its UUID
   */
  async getRecipeById(id: string): Promise<TraderJoesRecipe | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('trader_joes_recipes_cache')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      return null
    }

    type TJRow = {
      id: string
      tj_recipe_id: string | null
      name: string
      url: string
      category: string | null
      image_url: string | null
      recipe_data: Record<string, unknown>
      last_scraped_at: string | null
      created_at: string
    }
    const row = data as TJRow

    return {
      id: row.id,
      tj_recipe_id: row.tj_recipe_id || undefined,
      name: row.name,
      url: row.url,
      category: row.category || undefined,
      image_url: row.image_url || undefined,
      recipe_data: row.recipe_data as TraderJoesRecipe['recipe_data'],
      last_scraped_at: row.last_scraped_at || undefined,
      created_at: row.created_at,
    }
  }

  /**
   * Get recipe details from URL
   * Returns cached recipe from Supabase
   */
  async getRecipeDetails(url: string): Promise<TraderJoesRecipe | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Get from cache
    const { data: cached, error: cacheError } = await supabase
      .from('trader_joes_recipes_cache')
      .select('*')
      .eq('url', url)
      .single()

    if (cacheError || !cached) {
      return null
    }

    type TJCached = {
      id: string
      tj_recipe_id: string | null
      name: string
      url: string
      category: string | null
      image_url: string | null
      recipe_data: Record<string, unknown>
      last_scraped_at: string | null
      created_at: string
    }
    const typedCached = cached as TJCached

    return {
      id: typedCached.id,
      tj_recipe_id: typedCached.tj_recipe_id || undefined,
      name: typedCached.name,
      url: typedCached.url,
      category: typedCached.category || undefined,
      image_url: typedCached.image_url || undefined,
      recipe_data: typedCached.recipe_data as TraderJoesRecipe['recipe_data'],
      last_scraped_at: typedCached.last_scraped_at || undefined,
      created_at: typedCached.created_at,
    }
  }

  /**
   * Cache a Trader Joe's recipe
   */
  async cacheRecipe(recipe: Omit<TraderJoesRecipe, 'id' | 'created_at'>): Promise<TraderJoesRecipe> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('trader_joes_recipes_cache')
      .upsert(
        {
          tj_recipe_id: recipe.tj_recipe_id || null,
          name: recipe.name,
          url: recipe.url,
          category: recipe.category || null,
          image_url: recipe.image_url || null,
          recipe_data: recipe.recipe_data as unknown as Record<string, unknown>,
          last_scraped_at: new Date().toISOString(),
        } as never,
        { onConflict: 'url' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error caching recipe:', error)
      throw new Error(`Failed to cache recipe: ${error.message}`)
    }

    type TJData = {
      id: string
      tj_recipe_id: string | null
      name: string
      url: string
      category: string | null
      image_url: string | null
      recipe_data: Record<string, unknown>
      last_scraped_at: string | null
      created_at: string
    }
    const typedData = data as TJData

    return {
      id: typedData.id,
      tj_recipe_id: typedData.tj_recipe_id || undefined,
      name: typedData.name,
      url: typedData.url,
      category: typedData.category || undefined,
      image_url: typedData.image_url || undefined,
      recipe_data: typedData.recipe_data as TraderJoesRecipe['recipe_data'],
      last_scraped_at: typedData.last_scraped_at || undefined,
      created_at: typedData.created_at,
    }
  }

  /**
   * Import a Trader Joe's recipe into user's collection
   */
  async importRecipe(tjRecipe: TraderJoesRecipe): Promise<CreateRecipeInput> {
    const recipeData = tjRecipe.recipe_data

    // Convert TJ recipe format to our recipe format
    const recipeInput: CreateRecipeInput = {
      name: tjRecipe.name,
      description: recipeData.description,
      source: 'trader_joes',
      source_url: tjRecipe.url,
      prep_time: recipeData.prep_time,
      cook_time: recipeData.cook_time,
      servings: recipeData.servings,
      tags: recipeData.tags || [],
      image_url: tjRecipe.image_url,
      instructions:
        recipeData.instructions?.map((instruction, index) => ({
          step_number: index + 1,
          instruction,
        })) || [],
      ingredients:
        recipeData.ingredients?.map((ingredient, index) => {
          const parsed = parseIngredientString(ingredient)
          const sanitized = sanitizeIngredientName(parsed.name)
          return {
            name: sanitized.name,
            amount: parsed.amount,
            unit: parsed.unit ? sanitizeIngredientUnit(parsed.unit) : parsed.unit,
            notes: mergeNotes(null, sanitized.extractedNotes) ?? undefined,
            order_index: index,
          }
        }) || [],
    }

    return recipeInput
  }

}

// Export singleton instance
export const traderJoesService = new TraderJoesService()
