/**
 * Meal Planning Service
 * Handles meal plan creation, management, and shopping list generation
 */

import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import { cookingService } from './cooking.service'
import type {
  MealPlan,
  CreateMealPlanInput,
  UpdateMealPlanInput,
  ShoppingList,
  ShoppingListItem,
  RecipeWithIngredients,
} from '@/lib/types/cooking.types'

export class MealPlanningService {
  /**
   * Get week start date (Monday) for a given date
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(d.setDate(diff))
  }

  /**
   * Get week number for a date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }

  /**
   * Get meal plan for a specific week
   */
  async getMealPlan(weekStart?: Date): Promise<MealPlan | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const targetDate = weekStart || new Date()
    const weekStartDate = this.getWeekStart(targetDate)
    const year = weekStartDate.getFullYear()
    const weekNumber = this.getWeekNumber(weekStartDate)

    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('year', year)
      .eq('week_number', weekNumber)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching meal plan:', error)
      throw new Error(`Failed to fetch meal plan: ${error.message}`)
    }

    return data as MealPlan
  }

  /**
   * Save or update a meal plan
   */
  async saveMealPlan(input: CreateMealPlanInput | UpdateMealPlanInput): Promise<MealPlan> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const weekStartDate = new Date(input.week_start_date)
    const year = weekStartDate.getFullYear()
    const weekNumber = this.getWeekNumber(weekStartDate)

    // Check if meal plan exists
    const existing = await this.getMealPlan(weekStartDate)

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('meal_plans')
        .update({
          meals: input.meals as unknown as Record<string, unknown>,
          notes: input.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating meal plan:', error)
        throw new Error(`Failed to update meal plan: ${error.message}`)
      }

      return data as MealPlan
    } else {
      // Create new
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          week_start_date: weekStartDate.toISOString().split('T')[0],
          year,
          week_number: weekNumber,
          meals: input.meals as unknown as Record<string, unknown>,
          notes: input.notes || null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating meal plan:', error)
        throw new Error(`Failed to create meal plan: ${error.message}`)
      }

      return data as MealPlan
    }
  }

  /**
   * Delete a meal plan
   */
  async deleteMealPlan(id: string): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { error } = await supabase.from('meal_plans').delete().eq('id', id)

    if (error) {
      console.error('Error deleting meal plan:', error)
      throw new Error(`Failed to delete meal plan: ${error.message}`)
    }
  }

  /**
   * Generate shopping list from meal plan
   */
  async generateShoppingList(mealPlanId: string): Promise<ShoppingList> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Get meal plan
    const mealPlan = await this.getMealPlanById(mealPlanId)
    if (!mealPlan) {
      throw new Error('Meal plan not found')
    }

    // Collect all recipe IDs from the meal plan
    const recipeIds = new Set<string>()
    const days: Array<keyof typeof mealPlan.meals> = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]

    days.forEach((day) => {
      const dayMeals = mealPlan.meals[day]
      if (dayMeals) {
        if (dayMeals.breakfast) recipeIds.add(dayMeals.breakfast)
        if (dayMeals.lunch) recipeIds.add(dayMeals.lunch)
        if (dayMeals.dinner) recipeIds.add(dayMeals.dinner)
        if (dayMeals.snack) recipeIds.add(dayMeals.snack)
      }
    })

    // Fetch all recipes with ingredients
    const recipes: Array<{ recipe: RecipeWithIngredients; mealTypes: string[] }> = []

    for (const recipeId of recipeIds) {
      try {
        const recipe = await cookingService.getRecipe(recipeId)
        if (recipe) {
          // Determine which meals use this recipe
          const mealTypes: string[] = []
          days.forEach((day) => {
            const dayMeals = mealPlan.meals[day]
            if (dayMeals) {
              if (dayMeals.breakfast === recipeId) mealTypes.push(`${day} breakfast`)
              if (dayMeals.lunch === recipeId) mealTypes.push(`${day} lunch`)
              if (dayMeals.dinner === recipeId) mealTypes.push(`${day} dinner`)
              if (dayMeals.snack === recipeId) mealTypes.push(`${day} snack`)
            }
          })
          recipes.push({ recipe, mealTypes })
        }
      } catch (error) {
        console.error(`Failed to fetch recipe ${recipeId}:`, error)
      }
    }

    // Aggregate ingredients
    const ingredientMap = new Map<string, ShoppingListItem>()

    recipes.forEach(({ recipe, mealTypes }) => {
      recipe.ingredients.forEach((ing) => {
        const key = ing.name.toLowerCase().trim()
        const existing = ingredientMap.get(key)

        if (existing) {
          // Merge amounts if same unit
          if (existing.unit === ing.unit && ing.amount && existing.amount) {
            existing.amount += ing.amount
          } else if (ing.amount) {
            // Different units or no existing amount - keep separate or combine
            existing.recipes.push(recipe.name)
          }
        } else {
          ingredientMap.set(key, {
            ingredient: ing.name,
            amount: ing.amount || 0,
            unit: ing.unit || '',
            recipes: [recipe.name],
          })
        }
      })
    })

    const items: ShoppingListItem[] = Array.from(ingredientMap.values())

    // Check if shopping list already exists
    const { data: existingList } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('meal_plan_id', mealPlanId)
      .single()

    const listData = {
      meal_plan_id: mealPlanId,
      items: items as unknown as Record<string, unknown>[],
      status: 'draft' as const,
      updated_at: new Date().toISOString(),
    }

    if (existingList) {
      // Update existing
      const { data, error } = await supabase
        .from('shopping_lists')
        .update(listData)
        .eq('id', existingList.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating shopping list:', error)
        throw new Error(`Failed to update shopping list: ${error.message}`)
      }

      return {
        ...(data as ShoppingList),
        items,
      }
    } else {
      // Create new
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert(listData)
        .select()
        .single()

      if (error) {
        console.error('Error creating shopping list:', error)
        throw new Error(`Failed to create shopping list: ${error.message}`)
      }

      return {
        ...(data as ShoppingList),
        items,
      }
    }
  }

  /**
   * Get shopping list for a meal plan
   */
  async getShoppingList(mealPlanId: string): Promise<ShoppingList | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('meal_plan_id', mealPlanId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching shopping list:', error)
      throw new Error(`Failed to fetch shopping list: ${error.message}`)
    }

    return {
      ...(data as ShoppingList),
      items: (data.items as unknown as ShoppingListItem[]) || [],
    }
  }

  /**
   * Update shopping list status
   */
  async updateShoppingListStatus(
    shoppingListId: string,
    status: 'draft' | 'active' | 'completed'
  ): Promise<void> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { error } = await supabase
      .from('shopping_lists')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', shoppingListId)

    if (error) {
      console.error('Error updating shopping list status:', error)
      throw new Error(`Failed to update shopping list: ${error.message}`)
    }
  }

  /**
   * Get meal plan by ID
   */
  async getMealPlanById(id: string): Promise<MealPlan | null> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase.from('meal_plans').select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch meal plan: ${error.message}`)
    }

    return data as MealPlan
  }
}

// Export singleton instance
export const mealPlanningService = new MealPlanningService()
