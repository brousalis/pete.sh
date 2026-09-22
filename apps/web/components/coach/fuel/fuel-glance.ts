import type { Tone } from '@/components/coach/ui/tone'

import type { NutritionDayView } from './fuel-types'

export function kcalProgress(logged: number | null | undefined, target: number): number {
  if (logged == null || target <= 0) return 0
  return Math.round((logged / target) * 100)
}

export function kcalDelta(logged: number | null | undefined, target: number): number | null {
  if (logged == null) return null
  return target - logged
}

export function macroProgress(actual: number | null | undefined, target: number): number {
  if (actual == null || target <= 0) return 0
  return Math.round((actual / target) * 100)
}

export function macroBarTone(
  actual: number | null | undefined,
  target: number,
  macro: 'protein' | 'carbs' | 'fat'
): Tone {
  if (actual == null || target <= 0) return 'neutral'
  const ratio = actual / target
  if (macro === 'fat') {
    if (ratio > 1.2) return 'caution'
    if (ratio > 1.05) return 'info'
    return 'good'
  }
  if (macro === 'protein') {
    if (ratio < 0.65) return 'caution'
    if (ratio < 0.85) return 'info'
    return 'good'
  }
  // carbs — periodised; under-fuel on load days matters more
  if (ratio < 0.55) return 'caution'
  if (ratio < 0.75) return 'info'
  return 'good'
}

export function kcalTone(pct: number): Tone {
  if (pct > 115) return 'caution'
  if (pct >= 85) return 'good'
  if (pct >= 50) return 'info'
  return 'neutral'
}

export function fuellingWindowTone(window: NutritionDayView['fuellingWindow']): Tone {
  if (window === 'high') return 'info'
  if (window === 'moderate') return 'good'
  return 'neutral'
}

/** One-line status for the hero chip row. */
export function fuelStatusLine(nutrition: NutritionDayView): { label: string; tone: Tone } {
  const logged = nutrition.logged?.kcal
  const target = nutrition.targets.kcal
  if (logged == null) {
    return { label: 'Not logged', tone: 'neutral' }
  }
  const delta = kcalDelta(logged, target)
  if (delta == null) return { label: 'Not logged', tone: 'neutral' }
  if (Math.abs(delta) <= target * 0.05) return { label: 'On target', tone: 'good' }
  if (delta > 0) return { label: `${delta} kcal left`, tone: 'info' }
  return { label: `${Math.abs(delta)} over`, tone: 'caution' }
}

export function entryTitle(description: string, max = 56): string {
  const oneLine = description.replace(/\s+/g, ' ').trim()
  const first = oneLine.split(/\.\s+|;\s+|,\s+then\s+/i)[0] ?? oneLine
  if (first.length <= max) return first
  const cut = first.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 24 ? cut.slice(0, lastSpace) : cut).trim()}…`
}
