export type FuelKind = 'food' | 'drink' | 'other'
export type FuelSource = 'llm' | 'manual' | 'reuse'

export interface FuelItemView {
  name: string
  portion?: string
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export interface FuelEntryView {
  id: string
  logDate: string
  loggedAt: string
  kind: FuelKind
  descriptionRaw: string
  items: FuelItemView[]
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  assumptions: string | null
  confidence: number | null
  source: FuelSource
}

export interface NutritionDayView {
  date: string
  plannedTss: number
  fuellingWindow: 'high' | 'moderate' | 'low'
  bodyWeightLbs: number
  targets: { kcal: number; proteinG: number; carbsG: number; fatG: number }
  logged: {
    kcal: number | null
    proteinG: number | null
    carbsG: number | null
    fatG: number | null
    hydrationMl: number | null
    adherence: number | null
    entryCount: number
  } | null
  guidance: string[]
  flags: string[]
}

export interface FuelDraft {
  kind: FuelKind
  descriptionRaw: string
  items: FuelItemView[]
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  assumptions: string
  confidence: number | null
  source: FuelSource
}

export { chicagoToday, shiftChicagoDate } from '@/lib/coach-dates'
