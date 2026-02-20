/**
 * TypeScript types for the Recipe Nutrition Enrichment system.
 * Covers ingredient nutrition lookup, USDA API responses,
 * enrichment pipeline results, and categorization.
 */

// ── Data Source & Confidence ─────────────────────────────────────────

export type NutritionDataSource = 'usda' | 'ai_estimate' | 'manual'

export type USDADataType = 'Foundation' | 'SR Legacy' | 'Branded'

// ── Ingredient Nutrition (DB row) ────────────────────────────────────

export interface IngredientNutrition {
  id: string
  canonical_name: string
  fdc_id?: number | null
  fdc_data_type?: USDADataType | null
  calories_per_100g?: number | null
  protein_per_100g?: number | null
  fat_per_100g?: number | null
  carbs_per_100g?: number | null
  fiber_per_100g?: number | null
  sugar_per_100g?: number | null
  sodium_mg_per_100g?: number | null
  saturated_fat_per_100g?: number | null
  trans_fat_per_100g?: number | null
  cholesterol_mg_per_100g?: number | null
  density_g_per_cup?: number | null
  portion_weight_g?: number | null
  portion_description?: string | null
  data_source: NutritionDataSource
  confidence?: number | null
  created_at: string
  updated_at: string
}

export type CreateIngredientNutritionInput = Omit<
  IngredientNutrition,
  'id' | 'created_at' | 'updated_at'
>

// ── Extended Recipe Nutrition Fields ─────────────────────────────────

export interface RecipeNutritionFields {
  calories_per_serving?: number | null
  protein_g?: number | null
  fat_g?: number | null
  carbs_g?: number | null
  fiber_g?: number | null
  sugar_g?: number | null
  sodium_mg?: number | null
  saturated_fat_g?: number | null
  nutrition_category: string[]
  nutrition_completeness?: number | null
  nutrition_updated_at?: string | null
}

// ── USDA FoodData Central API Shapes ─────────────────────────────────

export interface USDASearchRequest {
  query: string
  dataType?: USDADataType[]
  pageSize?: number
  pageNumber?: number
}

export interface USDASearchResponse {
  totalHits: number
  currentPage: number
  totalPages: number
  foods: USDASearchFood[]
}

export interface USDASearchFood {
  fdcId: number
  description: string
  dataType: string
  brandOwner?: string
  brandName?: string
  foodCategory?: string
  score?: number
  foodNutrients: USDASearchNutrient[]
}

export interface USDASearchNutrient {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  unitName: string
  value: number
}

export interface USDAFoodDetail {
  fdcId: number
  description: string
  dataType: string
  foodCategory?: { description: string }
  foodPortions?: USDAFoodPortion[]
  foodNutrients: USDADetailNutrient[]
}

export interface USDAFoodPortion {
  id: number
  amount: number
  gramWeight: number
  measureUnit?: { name: string; abbreviation: string }
  modifier?: string
  portionDescription?: string
}

export interface USDADetailNutrient {
  nutrient: {
    id: number
    number: string
    name: string
    unitName: string
  }
  amount?: number
}

// ── USDA Nutrient IDs (commonly used) ────────────────────────────────

export const USDA_NUTRIENT_IDS = {
  ENERGY: 1008,          // kcal
  PROTEIN: 1003,         // g
  TOTAL_FAT: 1004,       // g
  CARBOHYDRATE: 1005,    // g
  FIBER: 1079,           // g
  TOTAL_SUGARS: 2000,    // g
  SODIUM: 1093,          // mg
  SATURATED_FAT: 1258,   // g
  TRANS_FAT: 1257,       // g
  CHOLESTEROL: 1253,     // mg
} as const

// ── Enrichment Pipeline Types ────────────────────────────────────────

export interface IngredientEnrichmentResult {
  ingredient_id: string
  ingredient_name: string
  nutrition_id?: string
  weight_grams?: number
  resolved: boolean
  data_source?: NutritionDataSource
  confidence?: number
  error?: string
}

export interface RecipeEnrichmentResult {
  recipe_id: string
  recipe_name: string
  macros: RecipeNutritionFields
  categories: string[]
  completeness: number
  ingredients: IngredientEnrichmentResult[]
  unresolved_ingredients: string[]
}

export interface BatchEnrichmentProgress {
  total: number
  completed: number
  failed: number
  current_recipe?: string
  phase: 'dedup' | 'resolve' | 'enrich' | 'done'
}

// ── AI Estimation Types ──────────────────────────────────────────────

export interface AIIngredientEstimate {
  canonical_name: string
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  fiber_per_100g: number
  sugar_per_100g: number
  sodium_mg_per_100g: number
  saturated_fat_per_100g: number
  density_g_per_cup?: number | null
  portion_weight_g?: number | null
  confidence: number
}

// ── Nutrition Category Constants ─────────────────────────────────────

export type NutritionCategoryTier = 'macro' | 'quality' | 'fitness'

export interface NutritionCategoryRule {
  id: string
  label: string
  tier: NutritionCategoryTier
  description: string
}

export const NUTRITION_CATEGORIES: NutritionCategoryRule[] = [
  // Tier 1: Macro Ratio Labels
  { id: 'high-protein', label: 'High Protein', tier: 'macro', description: '>30% calories from protein' },
  { id: 'low-carb', label: 'Low Carb', tier: 'macro', description: '<25% calories from carbs' },
  { id: 'moderate-carb', label: 'Moderate Carb', tier: 'macro', description: '25-45% calories from carbs' },
  { id: 'high-carb', label: 'High Carb', tier: 'macro', description: '>55% calories from carbs' },
  { id: 'low-fat', label: 'Low Fat', tier: 'macro', description: '<20% calories from fat' },
  { id: 'high-fat', label: 'High Fat', tier: 'macro', description: '>45% calories from fat' },
  { id: 'balanced', label: 'Balanced', tier: 'macro', description: 'No macro exceeds 45% of calories' },
  { id: 'low-calorie', label: 'Low Calorie', tier: 'macro', description: '<400 cal/serving' },
  { id: 'high-calorie', label: 'High Calorie', tier: 'macro', description: '>800 cal/serving' },

  // Tier 2: Quality Labels
  { id: 'high-fiber', label: 'High Fiber', tier: 'quality', description: '>8g fiber per serving' },
  { id: 'low-sodium', label: 'Low Sodium', tier: 'quality', description: '<400mg sodium per serving' },
  { id: 'high-sugar', label: 'High Sugar', tier: 'quality', description: 'Sugar >25% of carbs AND >15g per serving' },
  { id: 'junk-carbs', label: 'Junk Carbs', tier: 'quality', description: 'Sugar-to-fiber ratio >5:1' },
  { id: 'inflammatory-fats', label: 'Inflammatory Fats', tier: 'quality', description: 'Saturated fat >40% of total fat or trans fat present' },
  { id: 'clean', label: 'Clean', tier: 'quality', description: 'High completeness, all USDA-verified ingredients' },

  // Tier 3: Fitness Labels
  { id: 'post-workout', label: 'Post-Workout', tier: 'fitness', description: 'Protein >25g AND carbs >20g per serving' },
  { id: 'pre-workout-friendly', label: 'Pre-Workout Friendly', tier: 'fitness', description: 'Moderate carbs, low fat, low fiber' },
  { id: 'rest-day', label: 'Rest Day', tier: 'fitness', description: '<500 cal AND >20g protein per serving' },
  { id: 'recomp-friendly', label: 'Recomp Friendly', tier: 'fitness', description: 'High protein AND low calorie' },
] as const
