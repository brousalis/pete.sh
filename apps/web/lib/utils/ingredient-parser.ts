/**
 * Ingredient Parser
 * Shared utilities for parsing ingredient strings into structured parts.
 * Handles fractions (½, ¼, 1/2), ranges (1-2), unicode, and mixed numbers (1½).
 *
 * Extracted from meal-planning.service.ts for reuse across
 * TJ import, shopping list generation, and nutrition enrichment.
 */

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75,
  '⅓': 0.333, '⅔': 0.667,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}

const UNIT_PATTERN =
  'cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|l|liter|liters|can|cans|package|packages|pkg|bunch|bunches|head|heads|clove|cloves|piece|pieces|slice|slices|sprig|sprigs|stalk|stalks|pinch|pinches|dash|dashes|bag|bags|box|boxes|jar|jars|bottle|bottles|log|logs|handful|handfuls|strip|strips'

const AMOUNT_CHARS = '[\\d½¼¾⅓⅔⅛⅜⅝⅞./]'

const INGREDIENT_REGEX = new RegExp(
  `^(${AMOUNT_CHARS}+(?:\\s*[-–]\\s*${AMOUNT_CHARS}+)?)\\s+(${UNIT_PATTERN})\\s+(.+)$`,
  'i'
)

const AMOUNT_ONLY_REGEX = new RegExp(
  `^(${AMOUNT_CHARS}+(?:\\s*[-–]\\s*${AMOUNT_CHARS}+)?)\\s+(.+)$`
)

/** Parse a fractional amount like "1½", "1/2", "½", "1-2" into a number. Returns 0 on failure. */
export function parseFractionAmount(str: string): number {
  if (/[-–]/.test(str) && !str.includes('/')) {
    const parts = str.split(/[-–]/).map((p) => parseFractionAmount(p.trim()))
    return parts.reduce((a, b) => a + b, 0) / parts.length
  }

  for (const [frac, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (str.includes(frac)) {
      const whole = str.replace(frac, '').trim()
      return (whole ? parseFloat(whole) : 0) + val
    }
  }

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

export interface ParsedIngredient {
  name: string
  amount?: number
  unit?: string
}

/**
 * Parse a raw ingredient string like "2 cups all-purpose flour" or "1/2 tsp salt"
 * into structured parts. Handles fractions, unicode, ranges, and unit-less amounts.
 */
export function parseIngredientString(raw: string): ParsedIngredient {
  const trimmed = raw.trim()
  if (!trimmed) return { name: raw }

  const match = trimmed.match(INGREDIENT_REGEX)
  if (match && match[1] && match[2] && match[3]) {
    return {
      amount: parseFractionAmount(match[1]),
      unit: match[2],
      name: match[3],
    }
  }

  const amountMatch = trimmed.match(AMOUNT_ONLY_REGEX)
  if (amountMatch && amountMatch[1] && amountMatch[2]) {
    return {
      amount: parseFractionAmount(amountMatch[1]),
      name: amountMatch[2],
    }
  }

  return { name: trimmed }
}
