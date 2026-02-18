/**
 * Cooking Service
 * Handles recipe storage, version history, and management
 */

import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type {
  Recipe,
  RecipeWithIngredients,
  RecipeIngredient,
  RecipeVersion,
  RecipeFilters,
  CreateRecipeInput,
  UpdateRecipeInput,
  MealCompletion,
  CreateMealCompletionInput,
  UpdateMealCompletionInput,
  SanitizationReport,
  IngredientChange,
  CacheSanitizationReport,
} from '@/lib/types/cooking.types'
import {
  sanitizeIngredientName,
  sanitizeIngredientUnit,
  sanitizeRawIngredientString,
  mergeNotes,
} from '@/lib/utils/ingredient-sanitizer'

export class CookingService {
  /**
   * Get recipes with optional filters
   */
  async getRecipes(filters?: RecipeFilters): Promise<Recipe[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    let query = supabase.from('recipes').select('*').order('created_at', { ascending: false })

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    if (filters?.source) {
      query = query.eq('source', filters.source)
    }

    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty)
    }

    if (filters?.is_favorite !== undefined) {
      query = query.eq('is_favorite', filters.is_favorite)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching recipes:', error)
      throw new Error(`Failed to fetch recipes: ${error.message}`)
    }

    return (data || []) as Recipe[]
  }

  /**
   * Get all recipes with their ingredients joined.
   * Used for fridge-matching against own recipes.
   */
  async getRecipesWithIngredients(): Promise<RecipeWithIngredients[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data: recipesData, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })

    if (recipesError) {
      console.error('Error fetching recipes with ingredients:', recipesError)
      throw new Error(`Failed to fetch recipes: ${recipesError.message}`)
    }

    const recipes = (recipesData || []) as Recipe[]
    if (recipes.length === 0) return []

    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .in('recipe_id', recipes.map((r) => r.id))
      .order('order_index', { ascending: true })

    if (ingredientsError) {
      console.error('Error fetching ingredients:', ingredientsError)
      return recipes.map((r) => ({ ...r, ingredients: [] }))
    }

    const ingredientsByRecipe = new Map<string, RecipeIngredient[]>()
    for (const ing of (ingredientsData || []) as RecipeIngredient[]) {
      const list = ingredientsByRecipe.get(ing.recipe_id) || []
      list.push(ing)
      ingredientsByRecipe.set(ing.recipe_id, list)
    }

    return recipes.map((r) => ({
      ...r,
      ingredients: ingredientsByRecipe.get(r.id) || [],
    }))
  }

  /**
   * Get a single recipe with ingredients
   */
  async getRecipe(id: string): Promise<RecipeWithIngredients | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Get recipe
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (recipeError) {
      if (recipeError.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching recipe:', recipeError)
      throw new Error(`Failed to fetch recipe: ${recipeError.message}`)
    }

    // Get ingredients
    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', id)
      .order('order_index', { ascending: true })

    if (ingredientsError) {
      console.error('Error fetching ingredients:', ingredientsError)
      throw new Error(`Failed to fetch ingredients: ${ingredientsError.message}`)
    }

    const recipe = recipeData as Recipe
    const ingredients = (ingredientsData || []) as RecipeIngredient[]

    return {
      ...recipe,
      ingredients,
    }
  }

  /**
   * Create a new recipe
   */
  async createRecipe(input: CreateRecipeInput): Promise<RecipeWithIngredients> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const {
      ingredients,
      instructions = [],
      tags = [],
      is_favorite = false,
      source = 'custom',
      ...recipeData
    } = input

    // Insert recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        ...recipeData,
        instructions: instructions as unknown as Record<string, unknown>,
        tags: tags || [],
        is_favorite,
        source,
        updated_at: new Date().toISOString(),
      } as never)
      .select()
      .single()

    if (recipeError) {
      console.error('Error creating recipe:', recipeError)
      throw new Error(`Failed to create recipe: ${recipeError.message}`)
    }

    const recipeId = (recipe as Recipe).id

    // Insert ingredients if provided
    if (ingredients && ingredients.length > 0) {
      const ingredientsToInsert = ingredients.map((ing, index) => ({
        recipe_id: recipeId,
        name: ing.name,
        amount: ing.amount ?? null,
        unit: ing.unit ?? null,
        notes: ing.notes ?? null,
        order_index: ing.order_index ?? index,
      }))

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsToInsert as never)

      if (ingredientsError) {
        console.error('Error creating ingredients:', ingredientsError)
        // Don't fail the whole operation, but log the error
      }
    }

    // Create initial version
    await this.createVersion(recipeId, recipe as Recipe, 'Initial version')

    // Fetch the complete recipe with ingredients
    const fullRecipe = await this.getRecipe(recipeId)
    if (!fullRecipe) {
      throw new Error('Failed to fetch created recipe')
    }

    return fullRecipe
  }

  /**
   * Update a recipe (creates a new version)
   */
  async updateRecipe(
    id: string,
    input: UpdateRecipeInput,
    commitMessage?: string
  ): Promise<RecipeWithIngredients> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Get current recipe for version snapshot
    const currentRecipe = await this.getRecipe(id)
    if (!currentRecipe) {
      throw new Error('Recipe not found')
    }

    const { ingredients, instructions, tags, ...recipeData } = input

    // Update recipe
    const updateData: Record<string, unknown> = {
      ...recipeData,
      updated_at: new Date().toISOString(),
    }

    if (instructions !== undefined) {
      updateData.instructions = instructions as unknown as Record<string, unknown>
    }

    if (tags !== undefined) {
      updateData.tags = tags
    }

    const { data: updatedRecipe, error: recipeError } = await supabase
      .from('recipes')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (recipeError) {
      console.error('Error updating recipe:', recipeError)
      throw new Error(`Failed to update recipe: ${recipeError.message}`)
    }

    // Update ingredients if provided
    if (ingredients !== undefined) {
      // Delete existing ingredients
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)

      // Insert new ingredients
      if (ingredients.length > 0) {
        const ingredientsToInsert = ingredients.map((ing, index) => ({
          recipe_id: id,
          name: ing.name,
          amount: ing.amount ?? null,
          unit: ing.unit ?? null,
          notes: ing.notes ?? null,
          order_index: ing.order_index ?? index,
        }))

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsToInsert as never)

        if (ingredientsError) {
          console.error('Error updating ingredients:', ingredientsError)
          // Don't fail the whole operation
        }
      }
    }

    // Create version snapshot
    const versionMessage = commitMessage || 'Recipe updated'
    await this.createVersion(id, updatedRecipe as Recipe, versionMessage)

    // Fetch the complete updated recipe
    const fullRecipe = await this.getRecipe(id)
    if (!fullRecipe) {
      throw new Error('Failed to fetch updated recipe')
    }

    return fullRecipe
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(id: string): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Delete recipe (cascade will delete ingredients and versions)
    const { error } = await supabase.from('recipes').delete().eq('id', id)

    if (error) {
      console.error('Error deleting recipe:', error)
      throw new Error(`Failed to delete recipe: ${error.message}`)
    }
  }

  /**
   * Get version history for a recipe
   */
  async getRecipeVersions(recipeId: string): Promise<RecipeVersion[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('recipe_versions')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('version_number', { ascending: false })

    if (error) {
      console.error('Error fetching versions:', error)
      throw new Error(`Failed to fetch versions: ${error.message}`)
    }

    return (data || []) as RecipeVersion[]
  }

  /**
   * Get a specific version
   */
  async getRecipeVersion(recipeId: string, versionId: string): Promise<RecipeVersion | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('recipe_versions')
      .select('*')
      .eq('id', versionId)
      .eq('recipe_id', recipeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching version:', error)
      throw new Error(`Failed to fetch version: ${error.message}`)
    }

    return data as RecipeVersion
  }

  /**
   * Restore a recipe to a specific version
   */
  async restoreRecipeVersion(recipeId: string, versionId: string): Promise<RecipeWithIngredients> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Get the version
    const version = await this.getRecipeVersion(recipeId, versionId)
    if (!version) {
      throw new Error('Version not found')
    }

    const snapshot = version.recipe_snapshot as Recipe

    // Restore recipe from snapshot
    const { data: updatedRecipe, error: recipeError } = await supabase
      .from('recipes')
      .update({
        name: snapshot.name,
        description: snapshot.description,
        source: snapshot.source,
        source_url: snapshot.source_url,
        prep_time: snapshot.prep_time,
        cook_time: snapshot.cook_time,
        servings: snapshot.servings,
        difficulty: snapshot.difficulty,
        tags: snapshot.tags,
        image_url: snapshot.image_url,
        instructions: snapshot.instructions as unknown as Record<string, unknown>,
        notes: snapshot.notes,
        is_favorite: snapshot.is_favorite,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', recipeId)
      .select()
      .single()

    if (recipeError) {
      console.error('Error restoring recipe:', recipeError)
      throw new Error(`Failed to restore recipe: ${recipeError.message}`)
    }

    // Restore ingredients from snapshot (if available in snapshot)
    // Note: We need to check if ingredients are stored in the snapshot
    // For now, we'll restore from the current recipe's ingredients structure
    // In a full implementation, you might want to store ingredients in the snapshot too

    // Create a new version documenting the restore
    await this.createVersion(
      recipeId,
      updatedRecipe as Recipe,
      `Restored to version ${version.version_number}`
    )

    // Fetch the complete restored recipe
    const fullRecipe = await this.getRecipe(recipeId)
    if (!fullRecipe) {
      throw new Error('Failed to fetch restored recipe')
    }

    return fullRecipe
  }

  /**
   * Create a version snapshot (internal method)
   */
  private async createVersion(
    recipeId: string,
    recipe: Recipe,
    commitMessage: string
  ): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Get next version number
    const { data: versionData } = await supabase.rpc('get_next_version_number', {
      p_recipe_id: recipeId,
    } as never)

    const versionNumber = ((versionData as unknown) as number) || 1

    // Get current ingredients to include in snapshot
    const { data: ingredientsData } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('order_index', { ascending: true })

    const ingredients = (ingredientsData || []) as RecipeIngredient[]

    // Create snapshot with recipe and ingredients
    const snapshot: RecipeWithIngredients = {
      ...recipe,
      ingredients,
    }

    // Insert version
    const { error } = await supabase.from('recipe_versions').insert({
      recipe_id: recipeId,
      version_number: versionNumber,
      commit_message: commitMessage,
      recipe_snapshot: snapshot as unknown as Record<string, unknown>,
    } as never)

    if (error) {
      console.error('Error creating version:', error)
      // Don't throw - versioning is not critical for recipe updates
    }
  }

  // ── Meal Completions ──

  async getMealCompletions(filters: {
    recipe_id?: string
    meal_plan_id?: string
    limit?: number
  }): Promise<MealCompletion[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) throw new Error('Supabase not configured')

    let query = supabase
      .from('meal_completions')
      .select('*')
      .order('cooked_at', { ascending: false })

    if (filters.recipe_id) {
      query = query.eq('recipe_id', filters.recipe_id)
    }
    if (filters.meal_plan_id) {
      query = query.eq('meal_plan_id', filters.meal_plan_id)
    }
    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error fetching meal completions:', error)
      throw new Error(`Failed to fetch meal completions: ${error.message}`)
    }
    return (data || []) as MealCompletion[]
  }

  async createMealCompletion(input: CreateMealCompletionInput): Promise<MealCompletion> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) throw new Error('Supabase not configured')

    const { data, error } = await supabase
      .from('meal_completions')
      .insert({
        recipe_id: input.recipe_id,
        meal_plan_id: input.meal_plan_id ?? null,
        day_of_week: input.day_of_week ?? null,
        meal_type: input.meal_type ?? null,
        rating: input.rating ?? null,
        notes: input.notes ?? null,
        cooked_at: input.cooked_at ?? new Date().toISOString(),
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Error creating meal completion:', error)
      throw new Error(`Failed to create meal completion: ${error.message}`)
    }
    return data as MealCompletion
  }

  async updateMealCompletion(id: string, input: UpdateMealCompletionInput): Promise<MealCompletion> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) throw new Error('Supabase not configured')

    const updateData: Record<string, unknown> = {}
    if (input.rating !== undefined) updateData.rating = input.rating
    if (input.notes !== undefined) updateData.notes = input.notes

    const { data, error } = await supabase
      .from('meal_completions')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating meal completion:', error)
      throw new Error(`Failed to update meal completion: ${error.message}`)
    }
    return data as MealCompletion
  }

  async deleteMealCompletion(id: string): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) throw new Error('Supabase not configured')

    const { error } = await supabase
      .from('meal_completions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting meal completion:', error)
      throw new Error(`Failed to delete meal completion: ${error.message}`)
    }
  }

  // ── Ingredient Sanitization ──

  /**
   * Sanitize all recipe_ingredients rows belonging to trader_joes recipes.
   * Returns a report of changes; set dryRun=false to persist.
   */
  async sanitizeAllIngredients(dryRun = true): Promise<SanitizationReport> {
    const supabase = getSupabaseClientForOperation(dryRun ? 'read' : 'write')
    if (!supabase) throw new Error('Supabase not configured')

    const { data: tjRecipes, error: recipeErr } = await supabase
      .from('recipes')
      .select('id')
      .eq('source', 'trader_joes')

    if (recipeErr) throw new Error(`Failed to fetch TJ recipes: ${recipeErr.message}`)
    const tjIds = (tjRecipes || []).map((r: { id: string }) => r.id)

    if (tjIds.length === 0) {
      return { total_scanned: 0, total_changed: 0, changes: [] }
    }

    let allIngredients: RecipeIngredient[] = []
    const batchSize = 100
    for (let i = 0; i < tjIds.length; i += batchSize) {
      const batch = tjIds.slice(i, i + batchSize)
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .in('recipe_id', batch)
      if (error) throw new Error(`Failed to fetch ingredients: ${error.message}`)
      allIngredients = allIngredients.concat((data || []) as RecipeIngredient[])
    }

    const changes: IngredientChange[] = []

    for (const ing of allIngredients) {
      const { name: newName, extractedNotes } = sanitizeIngredientName(ing.name)
      const newNotes = mergeNotes(ing.notes, extractedNotes)
      const newUnit = ing.unit ? sanitizeIngredientUnit(ing.unit) : ing.unit

      const nameChanged = newName !== ing.name
      const notesChanged = (newNotes ?? null) !== (ing.notes ?? null)
      const unitChanged = (newUnit ?? null) !== (ing.unit ?? null)

      if (nameChanged || notesChanged || unitChanged) {
        changes.push({
          id: ing.id,
          recipe_id: ing.recipe_id,
          before: { name: ing.name, notes: ing.notes ?? null, unit: ing.unit ?? null },
          after: { name: newName, notes: newNotes, unit: newUnit ?? null },
        })
      }
    }

    if (!dryRun && changes.length > 0) {
      for (let i = 0; i < changes.length; i += 50) {
        const batch = changes.slice(i, i + 50)
        const updates = batch.map((c) =>
          supabase
            .from('recipe_ingredients')
            .update({
              name: c.after.name,
              notes: c.after.notes,
              unit: c.after.unit,
            } as never)
            .eq('id', c.id)
        )
        await Promise.all(updates)
      }
    }

    return {
      total_scanned: allIngredients.length,
      total_changed: changes.length,
      changes,
    }
  }

  /**
   * Sanitize all raw ingredient strings in the trader_joes_recipes_cache table.
   * Strips branding only (no structural changes). Set dryRun=false to persist.
   */
  async sanitizeRecipeCache(dryRun = true): Promise<CacheSanitizationReport> {
    const supabase = getSupabaseClientForOperation(dryRun ? 'read' : 'write')
    if (!supabase) throw new Error('Supabase not configured')

    let allCache: { id: string; recipe_data: Record<string, unknown> }[] = []
    let page = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await supabase
        .from('trader_joes_recipes_cache')
        .select('id, recipe_data')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (error) throw new Error(`Failed to fetch cache: ${error.message}`)
      allCache = allCache.concat(data || [])
      if (!data || data.length < pageSize) break
      page++
    }

    let totalRecipesChanged = 0
    let totalIngredientsChanged = 0

    for (const row of allCache) {
      const ingredients = (row.recipe_data?.ingredients as string[]) || []
      if (!ingredients.length) continue

      const sanitized = ingredients.map(sanitizeRawIngredientString)
      const hasChanges = sanitized.some((s, i) => s !== ingredients[i])

      if (hasChanges) {
        totalRecipesChanged++
        totalIngredientsChanged += sanitized.filter((s, i) => s !== ingredients[i]).length

        if (!dryRun) {
          const updatedData = { ...row.recipe_data, ingredients: sanitized }
          await supabase
            .from('trader_joes_recipes_cache')
            .update({ recipe_data: updatedData } as never)
            .eq('id', row.id)
        }
      }
    }

    return {
      total_recipes_scanned: allCache.length,
      total_recipes_changed: totalRecipesChanged,
      total_ingredients_changed: totalIngredientsChanged,
    }
  }
}

// Export singleton instance
export const cookingService = new CookingService()
