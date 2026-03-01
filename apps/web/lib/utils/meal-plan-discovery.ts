/**
 * Shared recipe discovery logic for meal plan wizard and swipe-to-plan.
 * Returns eligible dinner-appropriate recipes with optional filters.
 */

import type { DayOfWeek, Recipe } from '@/lib/types/cooking.types'
import { isDinnerAppropriate } from './recipe-meal-filter'

export interface MealPlanDiscoveryFilters {
  tags?: Set<string>
  difficulty?: string
  maxPrepTime?: number | null
  /** Max total prep + cook time in minutes */
}

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

/**
 * Returns eligible dinner-appropriate recipes, optionally filtered and shuffled.
 * Used by meal plan wizard and swipe-to-plan.
 * @param shuffle - when false, returns filtered list without shuffling (for wizard scoring)
 */
export function getEligibleDinnerRecipes(
  recipes: Recipe[],
  filters: MealPlanDiscoveryFilters = {},
  shuffleOutput = true
): Recipe[] {
  let eligible = [...recipes]

  // Filter by tags
  if (filters.tags && filters.tags.size > 0) {
    eligible = eligible.filter((r) => {
      const recipeTags = r.tags?.map((t) => t.toLowerCase()) || []
      return Array.from(filters.tags!).every((st) => recipeTags.includes(st.toLowerCase()))
    })
  }

  // Filter by difficulty
  if (filters.difficulty && filters.difficulty !== 'all') {
    eligible = eligible.filter((r) => r.difficulty === filters.difficulty)
  }

  // Filter by max prep+cook time
  const maxTime = filters.maxPrepTime
  if (maxTime != null && maxTime > 0) {
    eligible = eligible.filter((r) => {
      const total = (r.prep_time || 0) + (r.cook_time || 0)
      return total <= maxTime
    })
  }

  // Filter to dinner-appropriate only
  eligible = eligible.filter((r) => isDinnerAppropriate({ name: r.name, tags: r.tags }))

  // Fallback: if too strict, relax filters but keep dinner-appropriate
  if (eligible.length === 0) {
    eligible = recipes.filter((r) => isDinnerAppropriate({ name: r.name, tags: r.tags }))
  }

  return shuffleOutput ? shuffle(eligible) : eligible
}

/**
 * Returns target days for "next empty" mode: non-skipped days without a dinner.
 */
export function getEmptyDinnerDays(
  meals: Record<DayOfWeek, { dinner?: string; skipped?: boolean } | undefined>
): DayOfWeek[] {
  return DAYS.filter((day) => {
    const dm = meals[day]
    if (dm?.skipped) return false
    if (dm?.dinner) return false
    return true
  })
}
