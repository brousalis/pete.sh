/**
 * TypeScript types for Cooking / Recipe Management feature
 */

export type RecipeSource = 'trader_joes' | 'custom' | 'imported'

export type RecipeDifficulty = 'easy' | 'medium' | 'hard'

export type ShoppingListStatus = 'draft' | 'active' | 'completed'

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface Recipe {
  id: string
  name: string
  description?: string
  source: RecipeSource
  source_url?: string
  prep_time?: number // minutes
  cook_time?: number // minutes
  servings?: number
  difficulty?: RecipeDifficulty
  tags: string[]
  image_url?: string
  instructions: RecipeStep[]
  notes?: string
  is_favorite: boolean
  // Nutrition per serving (optional, for AI coach TDEE calculations)
  calories_per_serving?: number
  protein_g?: number
  fat_g?: number
  carbs_g?: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
  saturated_fat_g?: number
  nutrition_category: string[]
  nutrition_completeness?: number
  nutrition_updated_at?: string
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  name: string
  amount?: number
  unit?: string // 'cup', 'tbsp', 'oz', 'lb', 'g', 'ml', etc.
  notes?: string // e.g., "chopped", "diced", "optional"
  order_index: number
  nutrition_id?: string
  weight_grams?: number
  nutrition?: IngredientNutritionInline | null
  created_at?: string
}

/** Inline nutrition data joined from ingredient_nutrition when fetching a recipe */
export interface IngredientNutritionInline {
  calories_per_100g?: number | null
  protein_per_100g?: number | null
  fat_per_100g?: number | null
  carbs_per_100g?: number | null
  fiber_per_100g?: number | null
  data_source?: string | null
  confidence?: number | null
}

export interface RecipeStep {
  step_number: number
  instruction: string
  duration?: number // minutes
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[]
}

export interface RecipeVersion {
  id: string
  recipe_id: string
  version_number: number
  commit_message?: string
  recipe_snapshot: Recipe
  created_by?: string
  created_at: string
}

export interface MealPlan {
  id: string
  week_start_date: string // ISO date string (Monday)
  year: number
  week_number: number
  meals: WeeklyMeals
  notes?: string
  created_at: string
  updated_at: string
}

export interface WeeklyMeals {
  monday?: DayMeals
  tuesday?: DayMeals
  wednesday?: DayMeals
  thursday?: DayMeals
  friday?: DayMeals
  saturday?: DayMeals
  sunday?: DayMeals
}

export interface DayMeals {
  breakfast?: string // recipe_id
  lunch?: string // recipe_id
  dinner?: string // recipe_id
  snack?: string // recipe_id
  skipped?: boolean
  skip_note?: string
}

export type MealPlanMode = 'dinner-only' | 'all-meals'

export interface ManualItem {
  name: string
  checked: boolean
}

export interface TripItem {
  ingredient: string
  amount: number
  unit: string
}

export interface ShoppingTrip {
  id: string
  completedAt: string
  items: TripItem[]
  manualItems: string[]
}

export interface ShoppingList {
  id: string
  meal_plan_id: string
  items: ShoppingListItem[]
  status: ShoppingListStatus
  checked_items: string[]
  hidden_items: string[]
  manual_items: ManualItem[]
  trips: ShoppingTrip[]
  created_at: string
  updated_at: string
}

export interface ShoppingListItem {
  ingredient: string
  amount: number
  unit: string
  recipes: string[]
}

export interface ShoppingListStatePatch {
  checked_items?: string[]
  hidden_items?: string[]
  manual_items?: ManualItem[]
  trips?: ShoppingTrip[]
}

export interface TraderJoesRecipe {
  id: string
  tj_recipe_id?: string
  name: string
  url: string
  category?: string
  image_url?: string
  recipe_data: {
    description?: string
    prep_time?: number
    cook_time?: number
    servings?: number
    ingredients?: string[]
    instructions?: string[]
    tags?: string[]
    categories?: string[] // All categories the recipe belongs to
  }
  last_scraped_at?: string
  created_at?: string
}

export interface RecipeFilters {
  search?: string
  tags?: string[]
  source?: RecipeSource
  difficulty?: RecipeDifficulty
  is_favorite?: boolean
}

export interface CreateRecipeInput {
  name: string
  description?: string
  source?: RecipeSource
  source_url?: string
  prep_time?: number
  cook_time?: number
  servings?: number
  difficulty?: RecipeDifficulty
  tags?: string[]
  image_url?: string
  instructions?: RecipeStep[]
  notes?: string
  is_favorite?: boolean
  ingredients?: Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at'>[]
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  commit_message?: string
}

export interface CreateMealPlanInput {
  week_start_date: string
  meals: WeeklyMeals
  notes?: string
}

export interface UpdateMealPlanInput extends Partial<CreateMealPlanInput> {}

// Fridge Scanner types
export interface FridgeScan {
  id: string
  scan_type: 'voice' | 'photo' | 'manual'
  raw_transcript?: string
  identified_items: string[]
  confirmed_items: string[]
  recipes_matched: number
  created_at: string
}

export interface MealCompletion {
  id: string
  recipe_id: string
  meal_plan_id?: string
  day_of_week?: DayOfWeek
  meal_type?: string
  rating?: number // 1–7
  notes?: string
  cooked_at: string
  created_at: string
}

export interface CreateMealCompletionInput {
  recipe_id: string
  meal_plan_id?: string
  day_of_week?: DayOfWeek
  meal_type?: string
  rating?: number
  notes?: string
  cooked_at?: string
}

export interface UpdateMealCompletionInput {
  rating?: number
  notes?: string
}

// ── Ingredient sanitization report types ──

export interface IngredientChange {
  id: string
  recipe_id: string
  before: { name: string; notes: string | null; unit: string | null }
  after: { name: string; notes: string | null; unit: string | null }
}

export interface SanitizationReport {
  total_scanned: number
  total_changed: number
  changes: IngredientChange[]
}

export interface CacheSanitizationReport {
  total_recipes_scanned: number
  total_recipes_changed: number
  total_ingredients_changed: number
}
