/**
 * Nutrition Service
 * Handles USDA FoodData Central lookups, AI-assisted ingredient resolution,
 * unit-to-grams conversion, recipe enrichment, and categorization.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, Output, wrapLanguageModel, defaultSettingsMiddleware } from 'ai'
import { z } from 'zod'

import { config } from '@/lib/config'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type {
  IngredientNutrition,
  CreateIngredientNutritionInput,
  USDASearchResponse,
  USDASearchFood,
  USDAFoodDetail,
  USDADataType,
  RecipeNutritionFields,
  IngredientEnrichmentResult,
  RecipeEnrichmentResult,
  AIIngredientEstimate,
} from '@/lib/types/nutrition.types'
import { USDA_NUTRIENT_IDS } from '@/lib/types/nutrition.types'
import type { RecipeWithIngredients, RecipeIngredient } from '@/lib/types/cooking.types'
import { sanitizeIngredientName } from '@/lib/utils/ingredient-sanitizer'
import { normalizeUnit } from '@/lib/utils/shopping-utils'
import { convertToGrams, VOLUME_UNITS, WEIGHT_UNITS, COUNTABLE_UNITS } from '@/lib/utils/nutrition-units'
import { categorizeRecipe } from '@/lib/utils/nutrition-categories'

// ============================================
// CONSTANTS
// ============================================

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'
const USDA_SEARCH_PAGE_SIZE = 5

// Simple rate limiter: track call timestamps
const callTimestamps: number[] = []
const MAX_CALLS_PER_HOUR = 950 // leave buffer below 1000

// ============================================
// AI MODEL SETUP
// ============================================

function getModel() {
  if (!config.aiCoach.anthropicApiKey) {
    throw new Error('Anthropic API key not configured')
  }
  const anthropic = createAnthropic({ apiKey: config.aiCoach.anthropicApiKey })
  return wrapLanguageModel({
    model: anthropic(config.aiCoach.defaultModel),
    middleware: [defaultSettingsMiddleware({ settings: { maxOutputTokens: 4096 } })],
  })
}

// ============================================
// RATE LIMITING
// ============================================

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const oneHourAgo = now - 3600_000

  // Purge old timestamps
  while (callTimestamps.length > 0 && (callTimestamps[0] ?? 0) < oneHourAgo) {
    callTimestamps.shift()
  }

  if (callTimestamps.length >= MAX_CALLS_PER_HOUR) {
    const oldestInWindow = callTimestamps[0] ?? now
    const waitMs = oldestInWindow + 3600_000 - now + 100
    console.log(`[Nutrition] Rate limit: waiting ${Math.round(waitMs / 1000)}s`)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  callTimestamps.push(Date.now())
}

// ============================================
// USDA API
// ============================================

async function usdaFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = config.nutrition.usdaApiKey
  if (!apiKey) throw new Error('USDA FDC API key not configured')

  await waitForRateLimit()

  const separator = path.includes('?') ? '&' : '?'
  const url = `${USDA_BASE_URL}${path}${separator}api_key=${apiKey}`
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`USDA API error ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

/**
 * Search USDA FoodData Central for foods matching a query.
 * Prefer Foundation and SR Legacy data types for accuracy.
 */
async function searchUSDA(
  query: string,
  dataTypes?: USDADataType[]
): Promise<USDASearchFood[]> {
  const body: Record<string, unknown> = {
    query,
    pageSize: USDA_SEARCH_PAGE_SIZE,
  }
  if (dataTypes?.length) {
    body.dataType = dataTypes
  }

  const result = await usdaFetch<USDASearchResponse>('/foods/search', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return result.foods || []
}

/**
 * Get detailed nutrient and portion data for a specific food by FDC ID.
 */
async function getFoodDetails(fdcId: number): Promise<USDAFoodDetail> {
  return usdaFetch<USDAFoodDetail>(`/food/${fdcId}`)
}

// ============================================
// NUTRIENT EXTRACTION
// ============================================

function extractNutrientValue(
  nutrients: USDAFoodDetail['foodNutrients'],
  nutrientId: number
): number | null {
  const found = nutrients.find((n) => n.nutrient.id === nutrientId)
  return found?.amount ?? null
}

function extractNutrientsFromDetail(detail: USDAFoodDetail): Omit<
  CreateIngredientNutritionInput,
  'canonical_name' | 'data_source' | 'confidence' | 'density_g_per_cup' | 'portion_weight_g' | 'portion_description'
> {
  const n = detail.foodNutrients
  return {
    fdc_id: detail.fdcId,
    fdc_data_type: detail.dataType as USDADataType,
    calories_per_100g: extractNutrientValue(n, USDA_NUTRIENT_IDS.ENERGY),
    protein_per_100g: extractNutrientValue(n, USDA_NUTRIENT_IDS.PROTEIN),
    fat_per_100g: extractNutrientValue(n, USDA_NUTRIENT_IDS.TOTAL_FAT),
    carbs_per_100g: extractNutrientValue(n, USDA_NUTRIENT_IDS.CARBOHYDRATE),
    fiber_per_100g: extractNutrientValue(n, USDA_NUTRIENT_IDS.FIBER),
    sugar_per_100g: extractNutrientValue(n, USDA_NUTRIENT_IDS.TOTAL_SUGARS),
    sodium_mg_per_100g: extractNutrientValue(n, USDA_NUTRIENT_IDS.SODIUM),
    saturated_fat_per_100g: extractNutrientValue(n, USDA_NUTRIENT_IDS.SATURATED_FAT),
    trans_fat_per_100g: extractNutrientValue(n, USDA_NUTRIENT_IDS.TRANS_FAT),
    cholesterol_mg_per_100g: extractNutrientValue(n, USDA_NUTRIENT_IDS.CHOLESTEROL),
  }
}

/**
 * Extract density (g per cup) and portion weight from USDA food portions.
 */
function extractPortionData(portions: USDAFoodDetail['foodPortions']): {
  density_g_per_cup: number | null
  portion_weight_g: number | null
  portion_description: string | null
} {
  if (!portions?.length) {
    return { density_g_per_cup: null, portion_weight_g: null, portion_description: null }
  }

  let density_g_per_cup: number | null = null
  let portion_weight_g: number | null = null
  let portion_description: string | null = null

  for (const p of portions) {
    const desc = (p.portionDescription || p.modifier || '').toLowerCase()
    const unitName = p.measureUnit?.name?.toLowerCase() || ''

    // Look for cup-based portions for density
    if (
      (unitName === 'cup' || desc.includes('cup')) &&
      p.gramWeight > 0 &&
      p.amount > 0
    ) {
      density_g_per_cup = p.gramWeight / p.amount
    }

    // Look for single-item portions (for countable ingredients)
    if (
      p.amount === 1 &&
      p.gramWeight > 0 &&
      !desc.includes('cup') &&
      !desc.includes('tbsp') &&
      !desc.includes('tsp')
    ) {
      if (!portion_weight_g) {
        portion_weight_g = p.gramWeight
        portion_description = p.portionDescription || p.modifier || null
      }
    }
  }

  return { density_g_per_cup, portion_weight_g, portion_description }
}

// ============================================
// INGREDIENT NAME NORMALIZATION
// ============================================

/**
 * Normalize an ingredient name for lookup in the nutrition cache.
 * Strips branding, prep notes, and lowercases.
 */
export function normalizeForLookup(name: string): string {
  const sanitized = sanitizeIngredientName(name)
  return sanitized.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function findNutritionByName(
  canonicalName: string
): Promise<IngredientNutrition | null> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return null

  const { data } = await supabase
    .from('ingredient_nutrition')
    .select('*')
    .eq('canonical_name', canonicalName)
    .single()

  return (data as IngredientNutrition) ?? null
}

async function upsertNutrition(
  input: CreateIngredientNutritionInput
): Promise<IngredientNutrition | null> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return null

  const { data } = await supabase
    .from('ingredient_nutrition')
    .upsert(input, { onConflict: 'canonical_name' })
    .select()
    .single()

  return (data as IngredientNutrition) ?? null
}

async function linkIngredientNutrition(
  ingredientId: string,
  nutritionId: string,
  weightGrams: number | null
): Promise<void> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return

  await supabase
    .from('recipe_ingredients')
    .update({ nutrition_id: nutritionId, weight_grams: weightGrams })
    .eq('id', ingredientId)
}

async function writeRecipeNutrition(
  recipeId: string,
  fields: RecipeNutritionFields
): Promise<void> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return

  await supabase
    .from('recipes')
    .update({
      ...fields,
      nutrition_updated_at: new Date().toISOString(),
    })
    .eq('id', recipeId)
}

// ============================================
// USDA RESOLUTION
// ============================================

/**
 * Resolve an ingredient name to a USDA food entry.
 * Searches Foundation and SR Legacy first, then Branded as fallback.
 * Returns null if no match found.
 */
async function resolveViaUSDA(
  canonicalName: string
): Promise<CreateIngredientNutritionInput | null> {
  // Tier 1: Foundation + SR Legacy
  let foods = await searchUSDA(canonicalName, ['Foundation', 'SR Legacy'])

  // Tier 2: Branded fallback
  if (!foods.length) {
    foods = await searchUSDA(canonicalName, ['Branded'])
  }

  // Tier 3: Broad search (all types)
  if (!foods.length) {
    foods = await searchUSDA(canonicalName)
  }

  if (!foods.length) return null

  // Pick the best match — first result from USDA is usually highest relevance
  const best = foods[0]!
  const detail = await getFoodDetails(best.fdcId)
  const nutrients = extractNutrientsFromDetail(detail)
  const portions = extractPortionData(detail.foodPortions)

  return {
    canonical_name: canonicalName,
    ...nutrients,
    ...portions,
    data_source: 'usda',
    confidence: best.score ? Math.min(best.score / 100, 0.95) : 0.85,
  }
}

// ============================================
// AI ESTIMATION (SINGLE + BATCH)
// ============================================

const AIEstimateSchema = z.object({
  estimates: z.array(z.object({
    canonical_name: z.string(),
    calories_per_100g: z.number(),
    protein_per_100g: z.number(),
    fat_per_100g: z.number(),
    carbs_per_100g: z.number(),
    fiber_per_100g: z.number(),
    sugar_per_100g: z.number(),
    sodium_mg_per_100g: z.number(),
    saturated_fat_per_100g: z.number(),
    density_g_per_cup: z.number().nullable().optional(),
    portion_weight_g: z.number().nullable().optional(),
    confidence: z.number().min(0).max(1),
  })),
})

/**
 * Use Claude to estimate nutrition for ingredients that couldn't be found in USDA.
 * Batches multiple ingredients per call for efficiency.
 */
export async function estimateWithAI(
  ingredientNames: string[]
): Promise<AIIngredientEstimate[]> {
  if (!ingredientNames.length) return []
  if (!config.aiCoach.isConfigured) {
    console.warn('[Nutrition] AI not configured, skipping estimation')
    return []
  }

  const model = getModel()
  const ingredientList = ingredientNames
    .map((name, i) => `${i + 1}. "${name}"`)
    .join('\n')

  const { experimental_output } = await generateText({
    model,
    output: Output.object({ schema: AIEstimateSchema }),
    system: `You are a nutrition data expert. Estimate nutritional content per 100g for food ingredients. Base estimates on similar common foods and standard nutritional databases. Be conservative with estimates. For branded products (like Trader Joe's items), estimate based on the closest common food equivalent.`,
    prompt: `Estimate the nutritional content per 100g for these ingredients that couldn't be found in the USDA FoodData Central database:

${ingredientList}

For each ingredient, provide:
- Macronutrient values per 100g (calories, protein, fat, carbs, fiber, sugar, sodium, saturated fat)
- density_g_per_cup: grams per 1 cup (if the ingredient can be measured by volume, otherwise null)
- portion_weight_g: weight of 1 individual unit in grams (if it's a countable item like "1 egg" or "1 clove garlic", otherwise null)
- confidence: 0-1 (how confident you are in the estimate, typically 0.4-0.7)

Return the canonical_name exactly as provided.`,
  })

  return experimental_output?.estimates ?? []
}

// ============================================
// INGREDIENT RESOLUTION (FULL PIPELINE)
// ============================================

/**
 * Resolve a single ingredient to nutrition data.
 * Cache-first, then USDA, then AI estimation.
 */
export async function resolveIngredient(
  ingredientName: string
): Promise<IngredientNutrition | null> {
  const canonicalName = normalizeForLookup(ingredientName)
  if (!canonicalName) return null

  // 1. Check cache
  const cached = await findNutritionByName(canonicalName)
  if (cached) return cached

  // 2. Try USDA
  if (config.nutrition.isConfigured) {
    try {
      const usdaResult = await resolveViaUSDA(canonicalName)
      if (usdaResult) {
        return await upsertNutrition(usdaResult)
      }
    } catch (err) {
      console.error(`[Nutrition] USDA lookup failed for "${canonicalName}":`, err)
    }
  }

  // 3. AI fallback (single ingredient)
  if (config.aiCoach.isConfigured) {
    try {
      const estimates = await estimateWithAI([canonicalName])
      if (estimates.length > 0) {
        const est = estimates[0]!
        return await upsertNutrition({
          canonical_name: canonicalName,
          fdc_id: null,
          fdc_data_type: null,
          calories_per_100g: est.calories_per_100g,
          protein_per_100g: est.protein_per_100g,
          fat_per_100g: est.fat_per_100g,
          carbs_per_100g: est.carbs_per_100g,
          fiber_per_100g: est.fiber_per_100g,
          sugar_per_100g: est.sugar_per_100g,
          sodium_mg_per_100g: est.sodium_mg_per_100g,
          saturated_fat_per_100g: est.saturated_fat_per_100g,
          trans_fat_per_100g: null,
          cholesterol_mg_per_100g: null,
          density_g_per_cup: est.density_g_per_cup ?? null,
          portion_weight_g: est.portion_weight_g ?? null,
          portion_description: null,
          data_source: 'ai_estimate',
          confidence: est.confidence,
        })
      }
    } catch (err) {
      console.error(`[Nutrition] AI estimation failed for "${canonicalName}":`, err)
    }
  }

  return null
}

/**
 * Resolve a batch of ingredient names. Checks cache first, then resolves
 * missing ones via USDA and AI in bulk.
 */
export async function resolveIngredientsBatch(
  ingredientNames: string[]
): Promise<Map<string, IngredientNutrition>> {
  const results = new Map<string, IngredientNutrition>()
  const toResolve: string[] = []

  // 1. Check cache for all
  for (const name of ingredientNames) {
    const canonical = normalizeForLookup(name)
    if (!canonical) continue

    const cached = await findNutritionByName(canonical)
    if (cached) {
      results.set(canonical, cached)
    } else {
      toResolve.push(canonical)
    }
  }

  if (!toResolve.length) return results

  // 2. Try USDA for uncached
  const usdaFailed: string[] = []
  if (config.nutrition.isConfigured) {
    for (const name of toResolve) {
      try {
        const usdaResult = await resolveViaUSDA(name)
        if (usdaResult) {
          const saved = await upsertNutrition(usdaResult)
          if (saved) results.set(name, saved)
          continue
        }
      } catch (err) {
        console.error(`[Nutrition] USDA lookup failed for "${name}":`, err)
      }
      usdaFailed.push(name)
    }
  } else {
    usdaFailed.push(...toResolve)
  }

  // 3. Batch AI estimation for remaining
  if (usdaFailed.length > 0 && config.aiCoach.isConfigured) {
    const BATCH_SIZE = 15
    for (let i = 0; i < usdaFailed.length; i += BATCH_SIZE) {
      const batch = usdaFailed.slice(i, i + BATCH_SIZE)
      try {
        const estimates = await estimateWithAI(batch)
        for (const est of estimates) {
          const canonical = normalizeForLookup(est.canonical_name)
          const saved = await upsertNutrition({
            canonical_name: canonical || est.canonical_name,
            fdc_id: null,
            fdc_data_type: null,
            calories_per_100g: est.calories_per_100g,
            protein_per_100g: est.protein_per_100g,
            fat_per_100g: est.fat_per_100g,
            carbs_per_100g: est.carbs_per_100g,
            fiber_per_100g: est.fiber_per_100g,
            sugar_per_100g: est.sugar_per_100g,
            sodium_mg_per_100g: est.sodium_mg_per_100g,
            saturated_fat_per_100g: est.saturated_fat_per_100g,
            trans_fat_per_100g: null,
            cholesterol_mg_per_100g: null,
            density_g_per_cup: est.density_g_per_cup ?? null,
            portion_weight_g: est.portion_weight_g ?? null,
            portion_description: null,
            data_source: 'ai_estimate',
            confidence: est.confidence,
          })
          if (saved) results.set(canonical || est.canonical_name, saved)
        }
      } catch (err) {
        console.error(`[Nutrition] AI batch estimation failed:`, err)
      }
    }
  }

  return results
}

// ============================================
// SINGLE RECIPE ENRICHMENT
// ============================================

/**
 * Enrich a single recipe with nutritional data.
 * Resolves each ingredient, computes per-serving macros, and categorizes.
 */
export async function enrichRecipe(
  recipe: RecipeWithIngredients,
  force = false
): Promise<RecipeEnrichmentResult> {
  const ingredientResults: IngredientEnrichmentResult[] = []
  const servings = recipe.servings || 4

  let totalCal = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0
  let totalFiber = 0, totalSugar = 0, totalSodium = 0, totalSatFat = 0
  let resolvedCount = 0

  for (const ing of recipe.ingredients) {
    // Skip if already resolved and not forcing
    if (!force && ing.nutrition_id && ing.weight_grams) {
      const cached = await findNutritionByName(normalizeForLookup(ing.name))
      if (cached) {
        const grams = ing.weight_grams
        totalCal += ((cached.calories_per_100g ?? 0) * grams) / 100
        totalProtein += ((cached.protein_per_100g ?? 0) * grams) / 100
        totalFat += ((cached.fat_per_100g ?? 0) * grams) / 100
        totalCarbs += ((cached.carbs_per_100g ?? 0) * grams) / 100
        totalFiber += ((cached.fiber_per_100g ?? 0) * grams) / 100
        totalSugar += ((cached.sugar_per_100g ?? 0) * grams) / 100
        totalSodium += ((cached.sodium_mg_per_100g ?? 0) * grams) / 100
        totalSatFat += ((cached.saturated_fat_per_100g ?? 0) * grams) / 100
        resolvedCount++
        ingredientResults.push({
          ingredient_id: ing.id,
          ingredient_name: ing.name,
          nutrition_id: cached.id,
          weight_grams: grams,
          resolved: true,
          data_source: cached.data_source as 'usda' | 'ai_estimate' | 'manual',
          confidence: cached.confidence ?? undefined,
        })
        continue
      }
    }

    // Resolve ingredient nutrition
    const nutrition = await resolveIngredient(ing.name)
    if (!nutrition) {
      ingredientResults.push({
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        resolved: false,
        error: 'Could not resolve nutrition data',
      })
      continue
    }

    // Convert to grams
    const unit = normalizeUnit(ing.unit)
    const grams = convertToGrams(ing.amount ?? 1, unit, nutrition)

    if (grams === null) {
      ingredientResults.push({
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        nutrition_id: nutrition.id,
        resolved: false,
        data_source: nutrition.data_source as 'usda' | 'ai_estimate' | 'manual',
        confidence: nutrition.confidence ?? undefined,
        error: `Cannot convert ${ing.amount} ${unit || 'unit'} to grams`,
      })
      // Still link the nutrition even if we can't convert
      await linkIngredientNutrition(ing.id, nutrition.id, null)
      continue
    }

    // Accumulate macros
    totalCal += ((nutrition.calories_per_100g ?? 0) * grams) / 100
    totalProtein += ((nutrition.protein_per_100g ?? 0) * grams) / 100
    totalFat += ((nutrition.fat_per_100g ?? 0) * grams) / 100
    totalCarbs += ((nutrition.carbs_per_100g ?? 0) * grams) / 100
    totalFiber += ((nutrition.fiber_per_100g ?? 0) * grams) / 100
    totalSugar += ((nutrition.sugar_per_100g ?? 0) * grams) / 100
    totalSodium += ((nutrition.sodium_mg_per_100g ?? 0) * grams) / 100
    totalSatFat += ((nutrition.saturated_fat_per_100g ?? 0) * grams) / 100
    resolvedCount++

    // Persist link
    await linkIngredientNutrition(ing.id, nutrition.id, grams)

    ingredientResults.push({
      ingredient_id: ing.id,
      ingredient_name: ing.name,
      nutrition_id: nutrition.id,
      weight_grams: grams,
      resolved: true,
      data_source: nutrition.data_source as 'usda' | 'ai_estimate' | 'manual',
      confidence: nutrition.confidence ?? undefined,
    })
  }

  const totalIngredients = recipe.ingredients.length
  const completeness = totalIngredients > 0 ? resolvedCount / totalIngredients : 0

  const macros: RecipeNutritionFields = {
    calories_per_serving: Math.round(totalCal / servings),
    protein_g: Math.round((totalProtein / servings) * 10) / 10,
    fat_g: Math.round((totalFat / servings) * 10) / 10,
    carbs_g: Math.round((totalCarbs / servings) * 10) / 10,
    fiber_g: Math.round((totalFiber / servings) * 10) / 10,
    sugar_g: Math.round((totalSugar / servings) * 10) / 10,
    sodium_mg: Math.round(totalSodium / servings),
    saturated_fat_g: Math.round((totalSatFat / servings) * 10) / 10,
    nutrition_completeness: Math.round(completeness * 100) / 100,
    nutrition_category: [],
    nutrition_updated_at: new Date().toISOString(),
  }

  // Categorize
  const categories = categorizeRecipe(macros, ingredientResults)
  macros.nutrition_category = categories

  // Write to DB
  await writeRecipeNutrition(recipe.id, macros)

  return {
    recipe_id: recipe.id,
    recipe_name: recipe.name,
    macros,
    categories,
    completeness,
    ingredients: ingredientResults,
    unresolved_ingredients: ingredientResults
      .filter((r) => !r.resolved)
      .map((r) => r.ingredient_name),
  }
}

// ============================================
// BATCH ENRICHMENT
// ============================================

export type ProgressCallback = (progress: {
  total: number
  completed: number
  failed: number
  current_recipe?: string
  phase: string
}) => void

/**
 * Enrich all recipes that are missing nutrition data.
 * Uses dedup-first strategy to minimize USDA API calls.
 */
export async function enrichAllRecipes(
  onProgress?: ProgressCallback,
  force = false
): Promise<{ total: number; enriched: number; failed: number }> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) throw new Error('Supabase not configured')

  // 1. Get all recipes needing enrichment
  let query = supabase
    .from('recipes')
    .select('id, name')
    .order('created_at', { ascending: true })

  if (!force) {
    query = query.is('nutrition_updated_at', null)
  }

  const { data: recipes } = await query
  if (!recipes?.length) return { total: 0, enriched: 0, failed: 0 }

  const total = recipes.length
  let enriched = 0
  let failed = 0

  // 2. Dedup pass: collect all unique ingredient names
  onProgress?.({ total, completed: 0, failed: 0, phase: 'dedup' })

  const allIngredientNames = new Set<string>()
  const recipeIngredientMap = new Map<string, RecipeWithIngredients>()

  for (const r of recipes) {
    const { data: fullRecipe } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', r.id)
      .single()

    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', r.id)
      .order('order_index')

    if (fullRecipe && ingredients) {
      const recipeWithIng: RecipeWithIngredients = {
        ...fullRecipe,
        nutrition_category: fullRecipe.nutrition_category ?? [],
        ingredients: ingredients as RecipeIngredient[],
      }
      recipeIngredientMap.set(r.id, recipeWithIng)

      for (const ing of ingredients) {
        const canonical = normalizeForLookup(ing.name)
        if (canonical) allIngredientNames.add(canonical)
      }
    }
  }

  // 3. Resolve all unique ingredients in batch
  onProgress?.({ total, completed: 0, failed: 0, phase: 'resolve' })
  await resolveIngredientsBatch(Array.from(allIngredientNames))

  // 4. Enrich each recipe
  for (const [recipeId, recipe] of recipeIngredientMap) {
    onProgress?.({
      total,
      completed: enriched + failed,
      failed,
      current_recipe: recipe.name,
      phase: 'enrich',
    })

    try {
      await enrichRecipe(recipe, force)
      enriched++
    } catch (err) {
      console.error(`[Nutrition] Failed to enrich "${recipe.name}":`, err)
      failed++
    }
  }

  onProgress?.({ total, completed: enriched + failed, failed, phase: 'done' })

  return { total, enriched, failed }
}

/**
 * Fire-and-forget nutrition recomputation for a recipe.
 * Called after recipe edits to keep nutrition fresh.
 */
export async function maybeRecomputeNutrition(recipeId: string): Promise<void> {
  try {
    const supabase = getSupabaseClientForOperation('read')
    if (!supabase) return

    const { data: recipe } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single()

    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('order_index')

    if (recipe && ingredients) {
      await enrichRecipe(
        {
          ...recipe,
          nutrition_category: recipe.nutrition_category ?? [],
          ingredients: ingredients as RecipeIngredient[],
        },
        true
      )
    }
  } catch (err) {
    console.error(`[Nutrition] Recomputation failed for recipe ${recipeId}:`, err)
  }
}
