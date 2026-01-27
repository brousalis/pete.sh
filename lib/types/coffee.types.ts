/**
 * TypeScript types for Coffee Guide feature
 * Based on coffee-v2.md - The Chicago Studio Coffee Guide (2026)
 */

export type BrewMethod = 'switch' | 'moccamaster'
export type RoastLevel = 'light' | 'medium' | 'dark'
export type CupSize = '1-cup' | '2-cup' | '3-4-cup' | '8-cup' | '10-cup'

export interface CoffeeRecipe {
  id: string
  method: BrewMethod
  cupSize: CupSize
  cupSizeLabel: string
  waterMl: number
  roast: RoastLevel
  ratio: string
  coffee: number // grams
  temp: string // temperature description
  technique: string // agitation/stirring notes
  switchSetting?: 'open' | 'closed' | 'hybrid' // for Hario Switch
  moccaSetting?: 'half' | 'full' // for Moccamaster (Half Jug / Full Jug)
  timingCues?: TimingCue[]
}

export interface TimingCue {
  time: number // seconds
  label: string
  action: string
}

export interface RoastStrategy {
  roast: RoastLevel
  goal: string
  temp: string
  technique: string
  ratio: string
}

export interface QuickDose {
  label: string
  grams: number
  note?: string
}

export interface CoffeeGuideData {
  roastStrategies: RoastStrategy[]
  switchRecipes: CoffeeRecipe[]
  moccamasterRecipes: CoffeeRecipe[]
  switchDoses: QuickDose[]
  moccamasterDoses: QuickDose[]
}

export interface GoldenRule {
  title: string
  description: string
}

// Legacy types for backward compatibility (can be removed later)
export type CoffeeRoutineType = 'morning' | 'afternoon' | 'sunday'
export type GrinderType = 'ode' | 's3'

export interface CoffeeRoutine {
  id: string
  type: CoffeeRoutineType
  name: string
  description: string
  batchSize: string
  ratio: string
  ratioNote?: string
  water: number
  coffee: number
  grinder: GrinderType
  grinderSetting: string
  filter: string
  waterTemp?: number
  waterNote?: string
  steps: BrewStep[]
  totalTime?: number
  tips?: string[]
  beanRecommendation?: BeanRecommendation
}

export interface BeanRecommendation {
  source: string
  location?: string
  type: string
  origins?: string[]
  flavor: string
}

export interface BrewStep {
  id: string
  order: number
  title: string
  description: string
  action?: string
  tips?: string[]
  timing?: {
    start: number
    duration?: number
    alert?: boolean
  }
  completed?: boolean
}

export interface CoffeeSession {
  routineId: string
  startedAt: string
  completedAt?: string
  currentStep?: number
  elapsedTime?: number
}

export interface CoffeeCompletion {
  routineId: string
  completed: boolean
  completedAt?: string
  notes?: string
}
