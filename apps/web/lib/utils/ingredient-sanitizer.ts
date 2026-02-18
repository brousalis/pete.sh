/**
 * Ingredient Sanitizer
 * Strips TJ's / Trader Joe's branding, extracts preparation notes,
 * and standardizes ingredient names for the cooking module.
 *
 * All functions are pure — no database dependencies.
 */

import { normalizeUnit } from './shopping-utils'

// ── Brand patterns ──────────────────────────────────────────────────

export const BRAND_PATTERNS: RegExp[] = [
  /\bTrader\s+Joe['\u2019\u2018]s\s*/gi,
  /\bTJ['\u2019\u2018]s\s+/gi,
  /\bTJs\s+/gi,
  /\bTJ['\u2019\u2018]?\s+(?=[A-Z])/g,
]

function stripBrand(text: string): string {
  let result = text
  for (const pattern of BRAND_PATTERNS) {
    pattern.lastIndex = 0
    result = result.replace(new RegExp(pattern.source, pattern.flags), '')
  }
  return result.replace(/\s{2,}/g, ' ').trim()
}

// ── Note extraction patterns (after last comma) ─────────────────────

const SINGLE_WORD_PREPS =
  /^(chopped|diced|sliced|minced|grated|shredded|melted|softened|halved|quartered|peeled|trimmed|divided|julienned|cubed|thawed|drained|rinsed|cored|pitted|seeded|stemmed|crumbled|torn|crushed|beaten|whisked|zested|juiced|destemmed|toasted|cooked|heated|warmed|chilled|defrosted|shelled|sifted|hulled|frozen|smashed|stirred|shredded)$/i

const ADVERB_VERB =
  /^(thinly|roughly|finely|coarsely|very thinly|lightly|medium) (sliced|chopped|diced|minced|crushed|shredded|sifted|beaten|grated|crumbled|saut[eé]ed)$/i

const SERVING_QUALIFIERS =
  /^(to taste|or to taste|more to taste|to serve|to garnish|for garnish|for garnish \(optional\)|for serving|for serving \(optional\)|for dipping|for drizzling|for sprinkling|for dusting|for topping|as needed|optional|to top|for ganish)$/i

const PREP_INSTRUCTIONS =
  /^(cooked|heated|prepared|thawed|microwaved|baked|warmed|left to sit|defrosted|steamed) according to/i

const PLUS_MORE = /^plus (more |a few )?(for |to |if )/i

const MULTI_WORD_STATES =
  /^(at room temperature|softened to room temperature|room temperature|casings? removed|casing removed and crumbled|seeds? removed|stems? removed|rinsed and (drained|dried|trimmed)|drained and (rinsed|halved|chopped|sliced|pat dry)|sliced in half|cut into |broken into |for (work surface|greasing|rolling|brushing))/i

const NOTE_CATEGORIES = [
  SINGLE_WORD_PREPS,
  ADVERB_VERB,
  SERVING_QUALIFIERS,
  PREP_INSTRUCTIONS,
  PLUS_MORE,
  MULTI_WORD_STATES,
]

function isKnownPrepNote(tail: string): boolean {
  const trimmed = tail.trim()
  if (!trimmed) return false
  return NOTE_CATEGORIES.some((rx) => rx.test(trimmed))
}

// ── Parenthetical extraction ────────────────────────────────────────

const EXTRACTABLE_PARENS =
  /\((optional|seasonal|seasonally available|for garnish|optional garnish|garnish|your favorite varietal|for optional garnish|for optional step|packed|room temperature|to taste|limited|any kind|plus [^)]*for garnish|use gloves!?)\)/gi

// ── Title-case helper ───────────────────────────────────────────────

const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'for', 'to', 'with', 'in', 'on', 'at', 'by',
])

function toTitleCase(text: string): string {
  return text
    .split(' ')
    .map((word, i) => {
      if (!word) return word
      const lower = word.toLowerCase()
      if (i > 0 && SMALL_WORDS.has(lower)) return lower
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

// ── Public API ──────────────────────────────────────────────────────

export interface SanitizedIngredient {
  name: string
  extractedNotes: string[]
}

/**
 * Sanitize a structured ingredient name (the `name` column from recipe_ingredients).
 * Strips branding, extracts preparation notes, and title-cases the result.
 */
export function sanitizeIngredientName(name: string): SanitizedIngredient {
  if (!name) return { name: '', extractedNotes: [] }

  const extractedNotes: string[] = []
  let working = name

  // 1. Strip brand
  working = stripBrand(working)

  // 2. Extract parenthetical qualifiers
  working = working.replace(EXTRACTABLE_PARENS, (match, inner) => {
    extractedNotes.push(inner.trim())
    return ''
  })

  // 3. Extract after-last-comma prep notes
  //    Walk backwards through commas; extract each trailing segment
  //    that matches a known pattern.
  let changed = true
  while (changed) {
    changed = false
    const lastComma = working.lastIndexOf(',')
    if (lastComma > 0) {
      const tail = working.substring(lastComma + 1).trim()
      if (tail && isKnownPrepNote(tail)) {
        extractedNotes.push(tail)
        working = working.substring(0, lastComma)
        changed = true
      }
    }
  }

  // 4. Clean up
  working = working
    .replace(/[,;]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // 5. Title-case
  working = toTitleCase(working)

  return { name: working, extractedNotes }
}

/**
 * Sanitize a raw ingredient string from the cache (includes amounts, e.g.
 * "2 tablespoons TJ's Salted Butter, chopped"). Only strips branding —
 * does NOT restructure amounts or extract notes, because the string still
 * needs to be parsed by the import pipeline.
 */
export function sanitizeRawIngredientString(raw: string): string {
  if (!raw) return raw
  return stripBrand(raw)
}

/**
 * Merge extracted notes into an existing notes string, avoiding duplicates.
 * Returns `null` if the merged result would be empty.
 */
export function mergeNotes(
  existing: string | null | undefined,
  extracted: string[]
): string | null {
  if (!extracted.length && !existing) return null

  const current = existing?.trim() || ''
  const currentLower = current.toLowerCase()

  const newParts = extracted.filter(
    (note) => note && !currentLower.includes(note.toLowerCase())
  )

  if (!newParts.length) return current || null

  const merged = current ? `${current}; ${newParts.join('; ')}` : newParts.join('; ')
  return merged || null
}

/**
 * Normalize a unit string using the canonical aliases from shopping-utils.
 */
export function sanitizeIngredientUnit(unit: string | null | undefined): string {
  return normalizeUnit(unit)
}
