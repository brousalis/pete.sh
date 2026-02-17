// ============================================
// INGREDIENT NAME NORMALIZATION
// ============================================

const COOKING_QUALIFIERS = [
  'fresh', 'frozen', 'dried', 'chopped', 'diced', 'sliced', 'minced',
  'ground', 'grated', 'shredded', 'crushed', 'peeled', 'deveined',
  'boneless', 'skinless', 'cooked', 'uncooked', 'raw', 'roasted',
  'toasted', 'melted', 'softened', 'cold', 'warm', 'hot',
  'large', 'medium', 'small', 'extra-virgin', 'extra virgin',
  'light', 'dark', 'whole', 'halved', 'quartered',
  'thinly', 'finely', 'roughly', 'coarsely', 'packed',
  'room temperature', 'to taste', 'optional', 'divided',
  'trimmed', 'rinsed', 'drained', 'thawed', 'pitted',
  'seeded', 'cored', 'stemmed', 'julienned', 'cubed',
  'all-purpose', 'all purpose', 'low-sodium', 'low sodium',
  'reduced-fat', 'reduced fat', 'fat-free', 'fat free',
  'unsalted', 'salted', 'unsweetened', 'sweetened',
]

const SYNONYM_MAP: Record<string, string> = {
  'scallion': 'green onion',
  'scallions': 'green onion',
  'green onions': 'green onion',
  'capsicum': 'bell pepper',
  'capsicums': 'bell pepper',
  'coriander': 'cilantro',
  'aubergine': 'eggplant',
  'courgette': 'zucchini',
  'rocket': 'arugula',
  'spring onion': 'green onion',
  'spring onions': 'green onion',
  'bicarbonate of soda': 'baking soda',
  'icing sugar': 'powdered sugar',
  'confectioners sugar': 'powdered sugar',
  'double cream': 'heavy cream',
  'single cream': 'light cream',
  'rapeseed oil': 'canola oil',
  'prawns': 'shrimp',
  'caster sugar': 'superfine sugar',
  'natural yoghurt': 'plain yogurt',
  'plain yoghurt': 'plain yogurt',
  'greek yoghurt': 'greek yogurt',
}

const DEPLURAL_RULES: Array<[RegExp, string]> = [
  [/berries$/i, 'berry'],
  [/ies$/i, 'y'],
  [/ves$/i, 'f'],
  [/oes$/i, 'o'],
  [/sses$/i, 'ss'],
  [/shes$/i, 'sh'],
  [/ches$/i, 'ch'],
  [/xes$/i, 'x'],
  [/zes$/i, 'z'],
  [/s$/i, ''],
]

const DEPLURAL_EXCEPTIONS = new Set([
  'hummus', 'couscous', 'asparagus', 'molasses', 'swiss', 'grass',
  'bass', 'dress', 'press', 'lemongrass', 'watercress',
])

function depluralize(word: string): string {
  if (word.length <= 3) return word
  if (DEPLURAL_EXCEPTIONS.has(word)) return word
  for (const [pattern, replacement] of DEPLURAL_RULES) {
    if (pattern.test(word)) {
      return word.replace(pattern, replacement)
    }
  }
  return word
}

/**
 * Strips leading quantities and units that leaked into ingredient names.
 * e.g., "2 cups all-purpose flour" -> "all-purpose flour"
 */
function stripLeadingQuantity(name: string): string {
  return name
    .replace(/^[\d\s½¼¾⅓⅔⅛/.,-]+/, '')
    .replace(/^(cup|cups|tbsp|tsp|oz|lb|lbs|g|ml|kg|l|tablespoon|tablespoons|teaspoon|teaspoons|ounce|ounces|pound|pounds|can|cans|package|packages|bag|bags|box|boxes|bunch|bunches|head|heads|clove|cloves|piece|pieces|slice|slices|pinch|pinches|dash|dashes|sprig|sprigs|stalk|stalks|strip|strips|handful|handfuls)\b\s*/i, '')
    .trim()
}

/**
 * Normalize an ingredient name for deduplication.
 * Strips qualifiers, deplurals, maps synonyms, and lowercases.
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim()

  // Strip leading amounts/units that leaked into the name field
  normalized = stripLeadingQuantity(normalized)

  // Remove parenthetical notes like "(optional)" or "(about 2 cups)"
  normalized = normalized.replace(/\([^)]*\)/g, '')

  // Remove trailing commas and qualifier phrases after commas
  normalized = normalized.replace(/,.*$/, '')

  // Strip cooking qualifiers
  for (const q of COOKING_QUALIFIERS) {
    normalized = normalized.replace(new RegExp(`\\b${q.replace(/-/g, '[-\\s]')}\\b`, 'gi'), '')
  }

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim()

  // Map synonyms (check full string first, then individual words)
  const synonym = SYNONYM_MAP[normalized]
  if (synonym) {
    normalized = synonym
  }

  // Depluralize each word
  normalized = normalized
    .split(' ')
    .map((w) => depluralize(w))
    .join(' ')

  return normalized.trim()
}

// ============================================
// UNIT NORMALIZATION & CONVERSION
// ============================================

const UNIT_ALIASES: Record<string, string> = {
  'tablespoon': 'tbsp', 'tablespoons': 'tbsp', 'tbsp': 'tbsp', 'tbs': 'tbsp', 'tb': 'tbsp',
  'teaspoon': 'tsp', 'teaspoons': 'tsp', 'tsp': 'tsp', 'ts': 'tsp',
  'cup': 'cup', 'cups': 'cup', 'c': 'cup',
  'ounce': 'oz', 'ounces': 'oz', 'oz': 'oz',
  'pound': 'lb', 'pounds': 'lb', 'lb': 'lb', 'lbs': 'lb',
  'gram': 'g', 'grams': 'g', 'g': 'g',
  'kilogram': 'kg', 'kilograms': 'kg', 'kg': 'kg',
  'milliliter': 'ml', 'milliliters': 'ml', 'ml': 'ml',
  'liter': 'l', 'liters': 'l', 'l': 'l', 'litre': 'l', 'litres': 'l',
  'pinch': 'pinch', 'pinches': 'pinch',
  'dash': 'dash', 'dashes': 'dash',
  'clove': 'clove', 'cloves': 'clove',
  'can': 'can', 'cans': 'can',
  'package': 'package', 'packages': 'package', 'pkg': 'package',
  'bunch': 'bunch', 'bunches': 'bunch',
  'head': 'head', 'heads': 'head',
  'piece': 'piece', 'pieces': 'piece', 'pc': 'piece', 'pcs': 'piece',
  'slice': 'slice', 'slices': 'slice',
  'sprig': 'sprig', 'sprigs': 'sprig',
  'stalk': 'stalk', 'stalks': 'stalk',
}

/**
 * Canonicalize a unit string.
 */
export function normalizeUnit(unit: string | undefined | null): string {
  if (!unit) return ''
  const lower = unit.toLowerCase().trim()
  return UNIT_ALIASES[lower] || lower
}

// Conversion factors to a base unit within each measurement group
// Volume: base = tsp
// Weight: base = oz
// Metric volume: base = ml
// Metric weight: base = g
const VOLUME_TO_TSP: Record<string, number> = {
  'tsp': 1,
  'tbsp': 3,
  'cup': 48,
}

const WEIGHT_TO_OZ: Record<string, number> = {
  'oz': 1,
  'lb': 16,
}

const METRIC_VOL_TO_ML: Record<string, number> = {
  'ml': 1,
  'l': 1000,
}

const METRIC_WEIGHT_TO_G: Record<string, number> = {
  'g': 1,
  'kg': 1000,
}

/**
 * Try to convert an amount from one unit to another.
 * Returns the converted amount, or null if units are not convertible.
 */
export function tryConvertUnits(
  amount: number,
  fromUnit: string,
  toUnit: string
): number | null {
  if (fromUnit === toUnit) return amount
  if (!fromUnit || !toUnit) return null

  // Try each conversion group
  for (const table of [VOLUME_TO_TSP, WEIGHT_TO_OZ, METRIC_VOL_TO_ML, METRIC_WEIGHT_TO_G]) {
    const fromFactor = table[fromUnit]
    const toFactor = table[toUnit]
    if (fromFactor !== undefined && toFactor !== undefined) {
      return (amount * fromFactor) / toFactor
    }
  }

  return null
}

/**
 * Pick the "preferred" (largest) unit in a conversion group.
 * e.g., between "tsp" and "cup", prefer "cup" for large quantities.
 */
export function preferredUnit(unitA: string, unitB: string): string {
  for (const table of [VOLUME_TO_TSP, WEIGHT_TO_OZ, METRIC_VOL_TO_ML, METRIC_WEIGHT_TO_G]) {
    const factorA = table[unitA]
    const factorB = table[unitB]
    if (factorA !== undefined && factorB !== undefined) {
      return factorA >= factorB ? unitA : unitB
    }
  }
  return unitA
}

// ============================================
// INGREDIENT CATEGORIZATION
// ============================================

export const categorizeIngredient = (name: string): string => {
  const lower = name.toLowerCase()
  if (/milk|cheese|yogurt|cream|butter|sour cream|half.and.half|crème/.test(lower))
    return 'Dairy'
  if (/egg/.test(lower)) return 'Dairy'
  if (/chicken|beef|pork|turkey|sausage|bacon|meat|steak|lamb|ground/.test(lower))
    return 'Meat & Poultry'
  if (/salmon|tuna|shrimp|fish|cod|crab|lobster|scallop/.test(lower))
    return 'Seafood'
  if (
    /lettuce|tomato|onion|garlic|pepper|carrot|celery|spinach|kale|broccoli|potato|mushroom|avocado|cucumber|zucchini|squash|cabbage|corn|pea|bean sprout|jalapeño|cilantro|parsley|basil|mint|ginger|scallion|shallot|leek/.test(
      lower
    )
  )
    return 'Produce'
  if (/apple|banana|lemon|lime|orange|berry|berries|fruit|grape|mango|pear|peach/.test(lower))
    return 'Fruits'
  if (/bread|tortilla|bun|roll|pita|naan|bagel|croissant/.test(lower))
    return 'Bakery'
  if (/rice|pasta|noodle|flour|sugar|honey|maple|oil|vinegar|sauce|broth|stock|soy|sriracha/.test(lower))
    return 'Pantry'
  if (/salt|pepper|cumin|paprika|oregano|thyme|rosemary|cinnamon|nutmeg|chili|cayenne|turmeric/.test(lower))
    return 'Spices'
  if (/can |canned|beans|lentil|chickpea|diced tomato/.test(lower))
    return 'Canned Goods'
  if (/frozen/.test(lower)) return 'Frozen'
  return 'Other'
}

export const CATEGORY_ORDER = [
  'Produce',
  'Fruits',
  'Meat & Poultry',
  'Seafood',
  'Dairy',
  'Bakery',
  'Pantry',
  'Spices',
  'Canned Goods',
  'Frozen',
  'Other',
]
