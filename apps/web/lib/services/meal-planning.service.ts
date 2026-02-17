/**
 * Meal Planning Service
 * Handles meal plan creation, management, and shopping list generation
 */

import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type {
    CreateMealPlanInput,
    MealPlan,
    RecipeWithIngredients,
    ShoppingList,
    ShoppingListItem,
    UpdateMealPlanInput,
} from '@/lib/types/cooking.types'
import { cookingService } from './cooking.service'
import { traderJoesService } from './trader-joes.service'
import {
  normalizeIngredientName,
  normalizeUnit,
  tryConvertUnits,
  preferredUnit,
} from '@/lib/utils/shopping-utils'

/**
 * Parse a TJ ingredient string like "2 cups all-purpose flour" into structured parts.
 * Handles fractions (½, ¼), ranges (1-2), and plain names.
 */
function parseTjIngredientString(raw: string): {
  name: string
  amount?: number
  unit?: string
} {
  const trimmed = raw.trim()
  if (!trimmed) return { name: raw }

  // Match: optional amount (number, fraction, mixed), optional unit, then name
  const match = trimmed.match(
    /^([\d½¼¾⅓⅔⅛⅜⅝⅞./]+(?:\s*[-–]\s*[\d½¼¾⅓⅔⅛⅜⅝⅞./]+)?)\s+(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|l|liter|liters|can|cans|package|packages|pkg|bunch|bunches|head|heads|clove|cloves|piece|pieces|slice|slices|sprig|sprigs|stalk|stalks|pinch|pinches|dash|dashes)\s+(.+)$/i
  )

  if (match && match[1] && match[2] && match[3]) {
    return {
      amount: parseFractionAmount(match[1]),
      unit: match[2],
      name: match[3],
    }
  }

  // Try just amount + name (no unit), e.g. "2 eggs"
  const amountMatch = trimmed.match(
    /^([\d½¼¾⅓⅔⅛⅜⅝⅞./]+(?:\s*[-–]\s*[\d½¼¾⅓⅔⅛⅜⅝⅞./]+)?)\s+(.+)$/
  )

  if (amountMatch && amountMatch[1] && amountMatch[2]) {
    return {
      amount: parseFractionAmount(amountMatch[1]),
      name: amountMatch[2],
    }
  }

  return { name: trimmed }
}

/** Parse a fractional amount like "1½", "1/2", "½", "1-2" into a number */
function parseFractionAmount(str: string): number {
  const unicodeFractions: Record<string, number> = {
    '½': 0.5, '¼': 0.25, '¾': 0.75,
    '⅓': 0.333, '⅔': 0.667,
    '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
  }

  // Handle ranges like "1-2" — use the average
  if (/[-–]/.test(str)) {
    const parts = str.split(/[-–]/).map((p) => parseFractionAmount(p.trim()))
    return parts.reduce((a, b) => a + b, 0) / parts.length
  }

  // Handle unicode fractions mixed with whole numbers: "1½"
  for (const [frac, val] of Object.entries(unicodeFractions)) {
    if (str.includes(frac)) {
      const whole = str.replace(frac, '').trim()
      return (whole ? parseFloat(whole) : 0) + val
    }
  }

  // Handle slash fractions: "1/2"
  if (str.includes('/')) {
    const parts = str.split('/')
    const numVal = parseFloat(parts[0] ?? '')
    const denVal = parseFloat(parts[1] ?? '')
    if (!isNaN(numVal) && !isNaN(denVal) && denVal !== 0) {
      return numVal / denVal
    }
  }

  const val = parseFloat(str)
  return isNaN(val) ? 0 : val
}

export class MealPlanningService {
  /**
   * Safely parse a date string, handling date-only strings ("2026-02-16")
   * by interpreting them as local noon to avoid UTC midnight timezone shifts.
   */
  private safeParseDate(input: string | Date): Date {
    if (input instanceof Date) return input
    // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by JS,
    // which can shift to the previous day in western timezones.
    // Append T12:00:00 to force local noon interpretation.
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return new Date(`${input}T12:00:00`)
    }
    return new Date(input)
  }

  /**
   * Get week start date (Monday) for a given date
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
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
    const weekStartDate = this.getWeekStart(
      typeof targetDate === 'string' ? this.safeParseDate(targetDate) : targetDate
    )
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

    const weekStartDate = input.week_start_date
      ? this.safeParseDate(input.week_start_date)
      : new Date()
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
        } as never)
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
        } as never)
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
   * Update a meal plan directly by ID (no date round-trip)
   */
  async updateMealPlanById(
    id: string,
    update: { meals?: Record<string, unknown>; notes?: string }
  ): Promise<MealPlan> {
    const supabase = getSupabaseClientForOperation('write')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (update.meals !== undefined) {
      updatePayload.meals = update.meals
    }
    if (update.notes !== undefined) {
      updatePayload.notes = update.notes || null
    }

    const { data, error } = await supabase
      .from('meal_plans')
      .update(updatePayload as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating meal plan by ID:', error)
      throw new Error(`Failed to update meal plan: ${error.message}`)
    }

    return data as MealPlan
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

    // Unified ingredient structure for both user and TJ recipes
    interface ParsedIngredient {
      name: string
      amount?: number
      unit?: string
    }

    // Fetch all recipes (user recipes and TJ recipes) with ingredients
    const recipeIngredients: Array<{
      recipeName: string
      ingredients: ParsedIngredient[]
    }> = []

    for (const recipeId of recipeIds) {
      try {
        // Try user recipes first
        const recipe = await cookingService.getRecipe(recipeId)
        if (recipe) {
          recipeIngredients.push({
            recipeName: recipe.name,
            ingredients: recipe.ingredients.map((ing) => ({
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
            })),
          })
          continue
        }
      } catch {
        // Not a user recipe, try TJ
      }

      try {
        // Try Trader Joe's recipes
        const tjRecipe = await traderJoesService.getRecipeById(recipeId)
        if (tjRecipe && tjRecipe.recipe_data.ingredients) {
          const parsed = tjRecipe.recipe_data.ingredients.map(
            parseTjIngredientString
          )
          recipeIngredients.push({
            recipeName: tjRecipe.name,
            ingredients: parsed,
          })
        }
      } catch (error) {
        console.error(`Failed to fetch recipe ${recipeId}:`, error)
      }
    }

    // Aggregate ingredients using normalization
    const ingredientMap = new Map<
      string,
      ShoppingListItem & { _normUnit: string; _displayNames: string[] }
    >()

    for (const { recipeName, ingredients } of recipeIngredients) {
      for (const ing of ingredients) {
        const normName = normalizeIngredientName(ing.name)
        const normUnit = normalizeUnit(ing.unit)
        const amount = ing.amount || 0

        const existing = ingredientMap.get(normName)

        if (existing) {
          // Add recipe attribution (deduplicated)
          if (!existing.recipes.includes(recipeName)) {
            existing.recipes.push(recipeName)
          }
          // Track display name candidates (prefer the longer/more descriptive one)
          if (!existing._displayNames.includes(ing.name)) {
            existing._displayNames.push(ing.name)
          }

          if (!amount) {
            // No amount to merge, just attribute
            continue
          }

          if (existing._normUnit === normUnit) {
            // Same normalized unit — sum directly
            existing.amount += amount
          } else if (existing._normUnit && normUnit) {
            // Different units — try to convert
            const converted = tryConvertUnits(amount, normUnit, existing._normUnit)
            if (converted !== null) {
              existing.amount += converted
            } else {
              // Try converting the other way (into the larger unit)
              const preferred = preferredUnit(existing._normUnit, normUnit)
              if (preferred !== existing._normUnit) {
                const existingConverted = tryConvertUnits(
                  existing.amount,
                  existing._normUnit,
                  normUnit
                )
                if (existingConverted !== null) {
                  existing.amount = existingConverted + amount
                  existing._normUnit = normUnit
                  existing.unit = normUnit
                }
              }
              // If still not convertible, just keep existing amount
            }
          } else if (!existing._normUnit && normUnit) {
            // Existing has no unit, new one does — adopt the unit
            existing.amount += amount
            existing._normUnit = normUnit
            existing.unit = normUnit
          } else {
            // Both have no unit — sum as counts
            existing.amount += amount
          }
        } else {
          ingredientMap.set(normName, {
            ingredient: ing.name,
            amount,
            unit: normUnit || '',
            recipes: [recipeName],
            _normUnit: normUnit,
            _displayNames: [ing.name],
          })
        }
      }
    }

    // Finalize items: pick best display name, clean up internal fields
    const items: ShoppingListItem[] = Array.from(ingredientMap.values()).map(
      ({ _displayNames, _normUnit, ...item }) => {
        // Use the longest display name (most descriptive)
        const bestName =
          _displayNames.sort((a, b) => b.length - a.length)[0] || item.ingredient
        return {
          ...item,
          ingredient: bestName,
          // Don't show "0" amounts
          amount: item.amount || 0,
        }
      }
    )

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
        .update(listData as never)
        .eq('id', (existingList as { id: string }).id)
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
        .insert(listData as never)
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
      items: ((data as ShoppingList).items as unknown as ShoppingListItem[]) || [],
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
      .update({ status, updated_at: new Date().toISOString() } as never)
      .eq('id', shoppingListId)

    if (error) {
      console.error('Error updating shopping list status:', error)
      throw new Error(`Failed to update shopping list: ${error.message}`)
    }
  }

  /**
   * Get recent meal plans for the past N weeks (for deduplication)
   */
  async getRecentMealPlans(weeks: number = 2): Promise<MealPlan[]> {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - weeks * 7)

    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .gte('week_start_date', cutoff.toISOString().split('T')[0])
      .order('week_start_date', { ascending: false })

    if (error) {
      console.error('Error fetching recent meal plans:', error)
      return []
    }

    return (data || []) as MealPlan[]
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
