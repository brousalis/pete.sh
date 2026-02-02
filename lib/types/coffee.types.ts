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
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface TimingCue {
  time: number // seconds
  label: string
  action: string
}

export interface RoastStrategy {
  id?: string
  roast: RoastLevel
  goal: string
  temp: string
  technique: string
  ratio: string
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface QuickDose {
  id?: string
  method?: BrewMethod
  label: string
  grams: number
  note?: string
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface CoffeeGuideData {
  roastStrategies: RoastStrategy[]
  switchRecipes: CoffeeRecipe[]
  moccamasterRecipes: CoffeeRecipe[]
  switchDoses: QuickDose[]
  moccamasterDoses: QuickDose[]
}

export interface GoldenRule {
  id?: string
  title: string
  description: string
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface CoffeeRecommendation {
  id?: string
  name: string
  dayOfWeek: number | null // 0-6 (Sunday-Saturday), null = any day
  hourStart: number
  hourEnd: number
  method: BrewMethod
  cupSize: CupSize
  roast: RoastLevel
  priority: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

// Config management types
export interface CoffeeConfig {
  roastStrategies: RoastStrategy[]
  recipes: CoffeeRecipe[]
  quickDoses: QuickDose[]
  goldenRules: GoldenRule[]
  recommendations: CoffeeRecommendation[]
}

export interface CoffeeConfigUpdatePayload {
  type:
    | 'roastStrategy'
    | 'recipe'
    | 'quickDose'
    | 'goldenRule'
    | 'recommendation'
  action: 'create' | 'update' | 'delete'
  data:
    | RoastStrategy
    | CoffeeRecipe
    | QuickDose
    | GoldenRule
    | CoffeeRecommendation
}

// Database row types (snake_case)
export interface DbCoffeeRecipe {
  id: string
  method: string
  cup_size: string
  cup_size_label: string
  water_ml: number
  roast: string
  ratio: string
  coffee: number
  temp: string
  technique: string
  switch_setting: string | null
  mocca_setting: string | null
  timing_cues: TimingCue[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbRoastStrategy {
  id: string
  roast: string
  goal: string
  temp: string
  technique: string
  ratio: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DbQuickDose {
  id: string
  method: string
  label: string
  grams: number
  note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DbGoldenRule {
  id: string
  title: string
  description: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DbCoffeeRecommendation {
  id: string
  name: string
  day_of_week: number | null
  hour_start: number
  hour_end: number
  method: string
  cup_size: string
  roast: string
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
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
