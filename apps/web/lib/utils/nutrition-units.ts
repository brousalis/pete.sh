/**
 * Nutrition Unit Conversion
 * Converts ingredient amounts from cooking units (cups, tbsp, oz, etc.) to grams
 * using ingredient-specific density and portion weight data.
 *
 * Three conversion strategies:
 * 1. Weight units → direct conversion to grams
 * 2. Volume units → ingredient density (g/cup) from USDA or AI
 * 3. Countable units → portion weight (g/unit) from USDA or AI
 */

import type { IngredientNutrition } from '@/lib/types/nutrition.types'

// ── Unit classification ──────────────────────────────────────────────

export const WEIGHT_UNITS = new Set(['g', 'kg', 'oz', 'lb'])
export const VOLUME_UNITS = new Set(['cup', 'tbsp', 'tsp', 'ml', 'l'])
export const COUNTABLE_UNITS = new Set([
  'piece', 'slice', 'clove', 'head', 'bunch', 'stalk', 'sprig',
  'can', 'package', 'bag', 'box', 'jar', 'bottle', 'log', 'strip',
])

// Negligible-quantity units where nutrition contribution is minimal
const NEGLIGIBLE_UNITS = new Set(['pinch', 'dash'])

// ── Weight to grams ──────────────────────────────────────────────────

const WEIGHT_TO_GRAMS: Record<string, number> = {
  'g': 1,
  'kg': 1000,
  'oz': 28.3495,
  'lb': 453.592,
}

// ── Volume to cups (for density multiplication) ──────────────────────

const VOLUME_TO_CUPS: Record<string, number> = {
  'tsp': 1 / 48,
  'tbsp': 1 / 16,
  'cup': 1,
  'ml': 1 / 236.588,
  'l': 1000 / 236.588,
}

// ── Default densities (g per cup) for common ingredients ─────────────
// Used when USDA/AI density is unavailable.

const DEFAULT_DENSITIES: Record<string, number> = {
  'water': 236.6,
  'milk': 244,
  'oil': 218,
  'olive oil': 216,
  'vegetable oil': 218,
  'butter': 227,
  'flour': 120,
  'all purpose flour': 120,
  'sugar': 200,
  'brown sugar': 220,
  'powdered sugar': 120,
  'salt': 292,
  'rice': 185,
  'oats': 80,
  'honey': 340,
  'maple syrup': 315,
  'sour cream': 230,
  'yogurt': 245,
  'cream cheese': 232,
  'heavy cream': 238,
  'chicken broth': 240,
  'broth': 240,
  'tomato sauce': 245,
  'soy sauce': 255,
}

// ── Default portion weights (g per unit) ─────────────────────────────
// Used when USDA/AI portion weight is unavailable.

const DEFAULT_PORTIONS: Record<string, number> = {
  'egg': 50,
  'eggs': 50,
  'garlic': 3,        // 1 clove
  'onion': 150,       // 1 medium
  'lemon': 58,
  'lime': 44,
  'banana': 118,
  'apple': 182,
  'avocado': 150,
  'tomato': 123,
  'potato': 213,
  'carrot': 61,
  'celery': 40,       // 1 stalk
  'bell pepper': 119,
  'chicken breast': 174,
  'tortilla': 49,
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Convert an ingredient amount + unit to grams, using the ingredient's
 * nutrition data for density/portion weights.
 *
 * Returns null if conversion is impossible (unknown unit, no density data).
 */
export function convertToGrams(
  amount: number,
  unit: string,
  nutrition: IngredientNutrition
): number | null {
  if (!amount || amount <= 0) return null
  const normalizedUnit = unit?.toLowerCase().trim() || ''

  // No unit: treat as countable (e.g. "2 eggs")
  if (!normalizedUnit) {
    return convertCountable(amount, nutrition)
  }

  // Negligible: pinch, dash → ~0.5g each
  if (NEGLIGIBLE_UNITS.has(normalizedUnit)) {
    return amount * 0.5
  }

  // Weight units: direct conversion
  if (WEIGHT_UNITS.has(normalizedUnit)) {
    const factor = WEIGHT_TO_GRAMS[normalizedUnit]
    return factor ? amount * factor : null
  }

  // Volume units: need density
  if (VOLUME_UNITS.has(normalizedUnit)) {
    return convertVolume(amount, normalizedUnit, nutrition)
  }

  // Countable units: need portion weight
  if (COUNTABLE_UNITS.has(normalizedUnit)) {
    return convertCountable(amount, nutrition)
  }

  // Unknown unit: try portion weight as last resort
  return convertCountable(amount, nutrition)
}

function convertVolume(
  amount: number,
  unit: string,
  nutrition: IngredientNutrition
): number | null {
  const cupsMultiplier = VOLUME_TO_CUPS[unit]
  if (cupsMultiplier === undefined) return null

  const cups = amount * cupsMultiplier

  // Use ingredient-specific density from USDA/AI
  if (nutrition.density_g_per_cup) {
    return cups * nutrition.density_g_per_cup
  }

  // Fallback: check default densities by ingredient name
  const name = nutrition.canonical_name.toLowerCase()
  for (const [key, density] of Object.entries(DEFAULT_DENSITIES)) {
    if (name.includes(key)) {
      return cups * density
    }
  }

  // Last resort: use water density (236.6 g/cup)
  return cups * 236.6
}

function convertCountable(
  amount: number,
  nutrition: IngredientNutrition
): number | null {
  // Use USDA/AI portion weight
  if (nutrition.portion_weight_g) {
    return amount * nutrition.portion_weight_g
  }

  // Fallback: check default portions by ingredient name
  const name = nutrition.canonical_name.toLowerCase()
  for (const [key, weight] of Object.entries(DEFAULT_PORTIONS)) {
    if (name.includes(key)) {
      return amount * weight
    }
  }

  return null
}
