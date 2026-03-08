/**
 * Filters for dinner-appropriate recipes in meal plan suggestions.
 * Excludes desserts, snacks, baking-only items, and appetizers.
 */

/** TJ/recipe categories that indicate non-dinner items (case-insensitive match) */
const NON_DINNER_CATEGORIES = new Set([
  'desserts',
  'dessert',
  'baking',
  'quick bites',
  'snacks',
  'snack',
  'appetizers',
  'appetizer',
  'breakfast',
  'drinks',
  'beverages',
])

/** Name substrings that indicate dessert/snack (case-insensitive) */
const NON_DINNER_NAME_PATTERNS = [
  'cookie',
  'cookies',
  'brownie',
  'brownies',
  'cupcake',
  'cupcakes',
  'cheesecake',
  'ice cream',
  'fudge',
  'muffin',
  'muffins',
  'candy',
  'candies',
  'frosting',
  'icing',
]

/**
 * Returns true if the recipe is appropriate for a dinner slot.
 * Excludes desserts, snacks, baking-only, appetizers, and breakfast.
 */
export function isDinnerAppropriate(recipe: {
  name: string
  tags?: string[]
}): boolean {
  const nameLower = recipe.name.toLowerCase()
  const tagsLower = (recipe.tags ?? []).map((t) => t.toLowerCase())

  // Check category tags (TJ categories are merged into tags)
  for (const tag of tagsLower) {
    if (NON_DINNER_CATEGORIES.has(tag)) return false
  }

  // Check recipe name for dessert/snack indicators
  for (const pattern of NON_DINNER_NAME_PATTERNS) {
    if (nameLower.includes(pattern)) {
      return false
    }
  }

  return true
}
