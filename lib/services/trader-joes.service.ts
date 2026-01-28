/**
 * Trader Joe's Service
 * Handles searching, caching, and importing Trader Joe's recipes
 * All data is stored in Supabase - no scraping needed
 */

import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type { TraderJoesRecipe, Recipe, CreateRecipeInput } from '@/lib/types/cooking.types'

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
      dbQuery = dbQuery.ilike('name', `%${query}%`)
    }

    if (category) {
      dbQuery = dbQuery.eq('category', category)
    }

    // Return all matching recipes (we have ~535 total)
    const { data, error } = await dbQuery

    if (error) {
      console.error('Error fetching cached TJ recipes:', error)
      throw new Error(`Failed to fetch recipes: ${error.message}`)
    }

    // Convert to TraderJoesRecipe format
    const recipes: TraderJoesRecipe[] = (data || []).map((row) => ({
      id: row.id,
      tj_recipe_id: row.tj_recipe_id || undefined,
      name: row.name,
      url: row.url,
      category: row.category || undefined,
      image_url: row.image_url || undefined,
      recipe_data: row.recipe_data as TraderJoesRecipe['recipe_data'],
      last_scraped_at: row.last_scraped_at,
      created_at: row.created_at,
    }))

    return recipes
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

    return {
      id: cached.id,
      tj_recipe_id: cached.tj_recipe_id || undefined,
      name: cached.name,
      url: cached.url,
      category: cached.category || undefined,
      image_url: cached.image_url || undefined,
      recipe_data: cached.recipe_data as TraderJoesRecipe['recipe_data'],
      last_scraped_at: cached.last_scraped_at,
      created_at: cached.created_at,
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
        },
        { onConflict: 'url' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error caching recipe:', error)
      throw new Error(`Failed to cache recipe: ${error.message}`)
    }

    return {
      id: data.id,
      tj_recipe_id: data.tj_recipe_id || undefined,
      name: data.name,
      url: data.url,
      category: data.category || undefined,
      image_url: data.image_url || undefined,
      recipe_data: data.recipe_data as TraderJoesRecipe['recipe_data'],
      last_scraped_at: data.last_scraped_at,
      created_at: data.created_at,
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
          // Try to parse ingredient string (e.g., "2 cups flour" or "1 tbsp olive oil")
          // This is a simple parser - in production, you'd want a more robust solution
          const parts = ingredient.trim().split(/\s+/)
          let amount: number | undefined
          let unit: string | undefined
          let name: string

          if (parts.length >= 3 && !isNaN(parseFloat(parts[0]))) {
            amount = parseFloat(parts[0])
            unit = parts[1]
            name = parts.slice(2).join(' ')
          } else if (parts.length >= 2 && !isNaN(parseFloat(parts[0]))) {
            amount = parseFloat(parts[0])
            name = parts.slice(1).join(' ')
          } else {
            name = ingredient
          }

          return {
            name,
            amount,
            unit,
            order_index: index,
          }
        }) || [],
    }

    return recipeInput
  }

}

// Export singleton instance
export const traderJoesService = new TraderJoesService()
