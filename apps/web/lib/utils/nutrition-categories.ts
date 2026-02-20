/**
 * Recipe Nutrition Categorization Engine
 *
 * Three tiers of labels computed from per-serving nutrition data:
 *
 * Tier 1 - Macro Ratios: quantitative labels based on % of calories from each macro
 * Tier 2 - Quality Labels: derived from extended macros (fiber, sugar, sodium, sat fat)
 * Tier 3 - Fitness Labels: aligned with coaching-knowledge.md training/eating rules
 *
 * All thresholds are configurable constants at the top of the file.
 */

import type { RecipeNutritionFields, IngredientEnrichmentResult } from '@/lib/types/nutrition.types'

// ── Caloric conversion factors ───────────────────────────────────────

const CAL_PER_G_PROTEIN = 4
const CAL_PER_G_CARBS = 4
const CAL_PER_G_FAT = 9

// ── Tier 1 thresholds (% of total calories) ─────────────────────────

const HIGH_PROTEIN_PCT = 0.30
const LOW_CARB_PCT = 0.25
const MODERATE_CARB_LOW_PCT = 0.25
const MODERATE_CARB_HIGH_PCT = 0.45
const HIGH_CARB_PCT = 0.55
const LOW_FAT_PCT = 0.20
const HIGH_FAT_PCT = 0.45
const BALANCED_MAX_PCT = 0.45
const LOW_CAL_THRESHOLD = 400
const HIGH_CAL_THRESHOLD = 800

// ── Tier 2 thresholds (absolute values per serving) ─────────────────

const HIGH_FIBER_G = 8
const LOW_SODIUM_MG = 400
const HIGH_SUGAR_CARB_PCT = 0.25
const HIGH_SUGAR_ABSOLUTE_G = 15
const JUNK_CARB_SUGAR_FIBER_RATIO = 5
const INFLAMMATORY_SAT_FAT_PCT = 0.40
const CLEAN_COMPLETENESS_THRESHOLD = 0.9

// ── Tier 3 thresholds (per serving) ─────────────────────────────────

const POST_WORKOUT_PROTEIN_G = 25
const POST_WORKOUT_CARBS_G = 20
const PRE_WORKOUT_FAT_G = 10
const PRE_WORKOUT_FIBER_G = 5
const REST_DAY_CAL = 500
const REST_DAY_PROTEIN_G = 20

// ── Public API ───────────────────────────────────────────────────────

/**
 * Compute nutrition category labels for a recipe based on its per-serving macros.
 */
export function categorizeRecipe(
  macros: RecipeNutritionFields,
  ingredientResults?: IngredientEnrichmentResult[]
): string[] {
  const categories: string[] = []

  const cal = macros.calories_per_serving ?? 0
  const protein = macros.protein_g ?? 0
  const fat = macros.fat_g ?? 0
  const carbs = macros.carbs_g ?? 0
  const fiber = macros.fiber_g ?? 0
  const sugar = macros.sugar_g ?? 0
  const sodium = macros.sodium_mg ?? 0
  const satFat = macros.saturated_fat_g ?? 0

  if (cal <= 0) return categories

  // ── Tier 1: Macro Ratios ───────────────────────────────────────────

  const calFromProtein = protein * CAL_PER_G_PROTEIN
  const calFromCarbs = carbs * CAL_PER_G_CARBS
  const calFromFat = fat * CAL_PER_G_FAT
  const totalMacroCal = calFromProtein + calFromCarbs + calFromFat

  if (totalMacroCal > 0) {
    const proteinPct = calFromProtein / totalMacroCal
    const carbPct = calFromCarbs / totalMacroCal
    const fatPct = calFromFat / totalMacroCal

    if (proteinPct > HIGH_PROTEIN_PCT) categories.push('high-protein')
    if (carbPct < LOW_CARB_PCT) categories.push('low-carb')
    else if (carbPct >= MODERATE_CARB_LOW_PCT && carbPct <= MODERATE_CARB_HIGH_PCT) categories.push('moderate-carb')
    if (carbPct > HIGH_CARB_PCT) categories.push('high-carb')
    if (fatPct < LOW_FAT_PCT) categories.push('low-fat')
    if (fatPct > HIGH_FAT_PCT) categories.push('high-fat')

    if (proteinPct <= BALANCED_MAX_PCT && carbPct <= BALANCED_MAX_PCT && fatPct <= BALANCED_MAX_PCT) {
      categories.push('balanced')
    }
  }

  if (cal < LOW_CAL_THRESHOLD) categories.push('low-calorie')
  if (cal > HIGH_CAL_THRESHOLD) categories.push('high-calorie')

  // ── Tier 2: Quality Labels ─────────────────────────────────────────

  if (fiber > HIGH_FIBER_G) categories.push('high-fiber')
  if (sodium > 0 && sodium < LOW_SODIUM_MG) categories.push('low-sodium')

  if (carbs > 0 && sugar > HIGH_SUGAR_ABSOLUTE_G && (sugar / carbs) > HIGH_SUGAR_CARB_PCT) {
    categories.push('high-sugar')
  }

  if (fiber > 0 && (sugar / fiber) > JUNK_CARB_SUGAR_FIBER_RATIO) {
    categories.push('junk-carbs')
  }

  if (fat > 0) {
    if ((satFat / fat) > INFLAMMATORY_SAT_FAT_PCT) {
      categories.push('inflammatory-fats')
    }
  }

  // "Clean" label: high completeness + all USDA-verified
  if (ingredientResults) {
    const completeness = macros.nutrition_completeness ?? 0
    const allUsda = ingredientResults.every(
      (r) => r.resolved && r.data_source === 'usda'
    )
    if (completeness >= CLEAN_COMPLETENESS_THRESHOLD && allUsda) {
      categories.push('clean')
    }
  }

  // ── Tier 3: Fitness Labels ─────────────────────────────────────────

  if (protein > POST_WORKOUT_PROTEIN_G && carbs > POST_WORKOUT_CARBS_G) {
    categories.push('post-workout')
  }

  if (carbs > 15 && fat < PRE_WORKOUT_FAT_G && fiber < PRE_WORKOUT_FIBER_G) {
    categories.push('pre-workout-friendly')
  }

  if (cal < REST_DAY_CAL && protein > REST_DAY_PROTEIN_G) {
    categories.push('rest-day')
  }

  // Recomp friendly: high protein + low calorie
  if (categories.includes('high-protein') && categories.includes('low-calorie')) {
    categories.push('recomp-friendly')
  }

  return categories
}
