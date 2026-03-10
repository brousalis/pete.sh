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

function getHaikuModel() {
  if (!config.aiCoach.anthropicApiKey) {
    throw new Error('Anthropic API key not configured')
  }
  const anthropic = createAnthropic({ apiKey: config.aiCoach.anthropicApiKey })
  return anthropic('claude-haiku-4-5-20251001')
}

// ============================================
// RATE LIMITING + CONCURRENCY
// ============================================

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const oneHourAgo = now - 3600_000

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

function createConcurrencyPool(limit: number) {
  let active = 0
  const queue: (() => void)[] = []

  return async function <T>(fn: () => Promise<T>): Promise<T> {
    while (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve))
    }
    active++
    try {
      return await fn()
    } finally {
      active--
      queue.shift()?.()
    }
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  baseDelayMs: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === retries) throw err
      const isRetryable = err instanceof Error && (
        err.message.includes('429') || err.message.includes('500') ||
        err.message.includes('502') || err.message.includes('503')
      )
      if (!isRetryable) throw err
      const delay = baseDelayMs * Math.pow(2, attempt)
      console.log(`[Nutrition] Retry ${attempt + 1}/${retries} after ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error('Unreachable')
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

// ── Compound ingredients that should NOT be split ────────────────────

const COMPOUND_INGREDIENTS = new Set([
  'sweet potato', 'sweet potatoes', 'green onion', 'green onions',
  'black bean', 'black beans', 'sour cream', 'cream cheese',
  'bell pepper', 'bell peppers', 'brown sugar', 'brown rice',
  'red onion', 'red onions', 'white wine', 'red wine',
  'green bean', 'green beans', 'white bean', 'white beans',
  'black pepper', 'white pepper', 'red pepper', 'green pepper',
  'coconut milk', 'coconut oil', 'olive oil', 'sesame oil',
  'peanut butter', 'almond butter', 'baking soda', 'baking powder',
  'vanilla extract', 'maple syrup', 'soy sauce', 'fish sauce',
  'hot sauce', 'tomato paste', 'tomato sauce', 'heavy cream',
  'whipping cream', 'ice cream', 'greek yogurt', 'plain yogurt',
  'lemon juice', 'lime juice', 'orange juice', 'apple cider',
  'rice vinegar', 'white vinegar', 'dark chocolate', 'milk chocolate',
  'bay leaf', 'bay leaves', 'flat leaf', 'curry powder',
  'chili powder', 'garlic powder', 'onion powder',
  'ground beef', 'ground turkey', 'ground pork', 'ground chicken',
  'chicken breast', 'chicken thigh', 'chicken thighs',
  'pork tenderloin', 'pork chop', 'pork chops',
  'flank steak', 'sirloin steak',
  'cauliflower rice', 'jasmine rice', 'basmati rice',
  'egg white', 'egg whites', 'egg yolk', 'egg yolks',
])

// ── Adjectives to strip (only if not part of a compound) ────────────

const STRIP_ADJECTIVES = /\b(large|small|medium|fresh|ripe|organic|raw|whole|dried|dry|extra|thin|thick|boneless|skinless|lite|light|plain|regular|standard|frozen|canned|jarred|packed|loosely|firmly|level|heaping|good|quality|favorite|your|our|about|approximately|roughly)\b/gi

// ── Prep/method phrases embedded in ingredient names ────────────────

const EMBEDDED_PREP_PHRASES = /\b(peeled|sliced|diced|chopped|minced|grated|shredded|julienned|cubed|trimmed|halved|quartered|crushed|beaten|whisked|melted|softened|cooked|toasted|roasted|grilled|sauteed|sautéed|blanched|steamed|boiled|mashed|deveined|deboned|pitted|seeded|cored|stemmed|destemmed|shelled|hulled|crumbled|torn)\b/gi

const TRAILING_PREP = /\b(and |into |in |on |over |with |for ).*$/i

// ── Depluralization ────────────────────────────────────────────────

const PLURAL_EXCEPTIONS = new Set([
  'hummus', 'couscous', 'asparagus', 'citrus', 'molasses',
  'swiss', 'bass', 'grass', 'lass', 'class', 'floss',
])

function depluralize(word: string): string {
  if (PLURAL_EXCEPTIONS.has(word)) return word
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y'
  if (word.endsWith('ves') && word.length > 4) return word.slice(0, -3) + 'f'
  if (word.endsWith('oes') && word.length > 4) return word.slice(0, -2)
  if (word.endsWith('ses') || word.endsWith('ches') || word.endsWith('shes') || word.endsWith('xes') || word.endsWith('zes')) {
    return word.slice(0, -2)
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1)
  return word
}

// ── Synonym overrides for product names ─────────────────────────────

const SYNONYM_OVERRIDES: Record<string, string> = {
  'unexpected cheddar': 'cheddar cheese',
  'triangoletti pasta': 'pasta',
  'spaghetti triangoletti pasta': 'pasta',
  'everything bagel seasoning': 'seasoning blend',
  'everything but the bagel seasoning': 'seasoning blend',
  'elote seasoning': 'seasoning blend',
  'umami seasoning': 'seasoning blend',
  'chile lime seasoning': 'seasoning blend',
  'mushroom umami seasoning': 'seasoning blend',
  'green goddess seasoning': 'seasoning blend',
  'cauliflower gnocchi': 'potato gnocchi',
  'zhoug sauce': 'herb sauce',
  'bomba sauce': 'chili paste',
  'ajika sauce': 'chili paste',
}

/**
 * Normalize an ingredient name for nutrition cache lookup.
 * Strips branding, prep notes, adjectives, depluralization, and synonym overrides.
 */
export function normalizeForLookup(name: string): string {
  // 1. Sanitize (strip brands, extract comma-separated prep notes)
  const sanitized = sanitizeIngredientName(name)
  let result = sanitized.name.toLowerCase()

  // 2. Strip non-alpha characters
  result = result.replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()

  // 3. Check synonym overrides first (before any further processing)
  if (SYNONYM_OVERRIDES[result]) return SYNONYM_OVERRIDES[result]!

  // 4. Strip embedded prep phrases ("peeled and sliced into coins")
  result = result.replace(EMBEDDED_PREP_PHRASES, '').replace(TRAILING_PREP, '').replace(/\s+/g, ' ').trim()

  // 5. Strip adjectives (but protect compound ingredients)
  const isCompound = COMPOUND_INGREDIENTS.has(result)
  if (!isCompound) {
    result = result.replace(STRIP_ADJECTIVES, '').replace(/\s+/g, ' ').trim()
  }

  // 6. Check synonym overrides again after stripping
  if (SYNONYM_OVERRIDES[result]) return SYNONYM_OVERRIDES[result]!

  // 7. Depluralize each word
  result = result.split(' ').map(depluralize).join(' ')

  // 8. Final cleanup
  result = result.replace(/\s+/g, ' ').trim()

  return result
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

async function findNutritionByNames(
  canonicalNames: string[]
): Promise<Map<string, IngredientNutrition>> {
  const results = new Map<string, IngredientNutrition>()
  if (!canonicalNames.length) return results

  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return results

  for (let i = 0; i < canonicalNames.length; i += 100) {
    const chunk = canonicalNames.slice(i, i + 100)
    const { data } = await supabase
      .from('ingredient_nutrition')
      .select('*')
      .in('canonical_name', chunk)

    if (data) {
      for (const row of data as IngredientNutrition[]) {
        results.set(row.canonical_name, row)
      }
    }
  }

  return results
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
    confidence: z.number().describe('Confidence 0-1'),
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

  const model = getHaikuModel()
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

  // 1. Normalize all names
  const canonicalNames: string[] = []
  for (const name of ingredientNames) {
    const canonical = normalizeForLookup(name)
    if (canonical) canonicalNames.push(canonical)
  }

  // 2. Batch cache lookup (single query instead of N)
  const cached = await findNutritionByNames(canonicalNames)
  for (const [name, nutrition] of cached) {
    results.set(name, nutrition)
  }

  const toResolve = canonicalNames.filter((n) => !results.has(n))

  if (!toResolve.length) {
    console.log(`[Nutrition] All ${canonicalNames.length} ingredients found in cache`)
    return results
  }

  console.log(`[Nutrition] ${results.size} cached, ${toResolve.length} need resolution`)

  // 2. Try USDA for uncached (parallel with concurrency pool)
  const usdaFailed: string[] = []
  if (config.nutrition.isConfigured) {
    const pool = createConcurrencyPool(5)
    let resolvedCount = 0
    const failedSet = new Set<string>()

    await Promise.allSettled(
      toResolve.map((name) =>
        pool(async () => {
          try {
            const usdaResult = await withRetry(() => resolveViaUSDA(name))
            if (usdaResult) {
              const saved = await upsertNutrition(usdaResult)
              if (saved) results.set(name, saved)
              resolvedCount++
              if (resolvedCount % 20 === 0) {
                console.log(`[Nutrition] USDA: ${resolvedCount}/${toResolve.length} resolved`)
              }
              return
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            if (!msg.includes('404')) {
              console.error(`[Nutrition] USDA lookup failed for "${name}": ${msg}`)
            }
          }
          failedSet.add(name)
        })
      )
    )

    usdaFailed.push(...failedSet)
    console.log(`[Nutrition] USDA resolved ${resolvedCount}/${toResolve.length}, ${usdaFailed.length} need AI`)
  } else {
    console.log(`[Nutrition] USDA not configured, falling back to AI for ${toResolve.length} ingredients`)
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

  // Reset in-memory rate limiter for fresh run
  callTimestamps.length = 0

  const total = recipes.length
  let enriched = 0
  let failed = 0

  // 2. Batch-load all recipes and ingredients (2 queries instead of 2*N)
  console.log(`[Nutrition] Loading ${total} recipes + ingredients in batch...`)
  onProgress?.({ total, completed: 0, failed: 0, phase: 'dedup' })

  const recipeIds = recipes.map((r) => r.id)

  // Batch load full recipes (chunk if >500 to avoid PostgREST limits)
  const allFullRecipes: Record<string, unknown>[] = []
  for (let i = 0; i < recipeIds.length; i += 100) {
    const chunk = recipeIds.slice(i, i + 100)
    const { data } = await supabase.from('recipes').select('*').in('id', chunk)
    if (data) allFullRecipes.push(...data)
  }
  const recipeById = new Map(allFullRecipes.map((r: Record<string, unknown>) => [r.id as string, r]))

  // Batch load all ingredients
  const allIngredients: RecipeIngredient[] = []
  for (let i = 0; i < recipeIds.length; i += 100) {
    const chunk = recipeIds.slice(i, i + 100)
    const { data } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .in('recipe_id', chunk)
      .order('order_index', { ascending: true })
    if (data) allIngredients.push(...(data as RecipeIngredient[]))
  }

  // Group ingredients by recipe_id
  const ingredientsByRecipe = new Map<string, RecipeIngredient[]>()
  for (const ing of allIngredients) {
    const list = ingredientsByRecipe.get(ing.recipe_id) || []
    list.push(ing)
    ingredientsByRecipe.set(ing.recipe_id, list)
  }

  console.log(`[Nutrition] Loaded ${allFullRecipes.length} recipes, ${allIngredients.length} ingredients`)

  const allIngredientNames = new Set<string>()
  const recipeIngredientMap = new Map<string, RecipeWithIngredients>()

  for (const r of recipes) {
    const fullRecipe = recipeById.get(r.id)
    const ingredients = ingredientsByRecipe.get(r.id) || []

    if (fullRecipe) {
      const recipeWithIng: RecipeWithIngredients = {
        ...(fullRecipe as Record<string, unknown>) as unknown as RecipeWithIngredients,
        nutrition_category: (fullRecipe as Record<string, unknown>).nutrition_category as string[] ?? [],
        ingredients,
      }
      recipeIngredientMap.set(r.id, recipeWithIng)

      for (const ing of ingredients) {
        const canonical = normalizeForLookup(ing.name)
        if (canonical) allIngredientNames.add(canonical)
      }
    }
  }

  console.log(`[Nutrition] Dedup complete: ${recipeIngredientMap.size} recipes, ${allIngredientNames.size} unique ingredients`)
  onProgress?.({ total, completed: total, failed: 0, phase: 'dedup' })

  // 3. Resolve all unique ingredients in batch
  const uniqueNames = Array.from(allIngredientNames)
  console.log(`[Nutrition] Resolving ${uniqueNames.length} unique ingredients...`)
  onProgress?.({ total, completed: 0, failed: 0, phase: 'resolve' })
  await resolveIngredientsBatch(uniqueNames)
  console.log(`[Nutrition] Ingredient resolution complete`)

  // 4. Enrich each recipe
  console.log(`[Nutrition] Enriching ${recipeIngredientMap.size} recipes...`)
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
  console.log(`[Nutrition] Enrichment complete: ${enriched} enriched, ${failed} failed out of ${total}`)

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
