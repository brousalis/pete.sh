/**
 * TypeScript types for Coffee Brewing Assistant feature
 * Based on coffee.md - The Chicago Studio Coffee Manual (2026 House p)
 */

export type CoffeeRoutineType = "morning" | "afternoon" | "sunday"

export type GrinderType = "ode" | "s3"

export interface CoffeeRoutine {
  id: string
  type: CoffeeRoutineType
  name: string
  description: string
  batchSize: string
  ratio: string // e.g. "1:17" or "1:16"
  ratioNote?: string // e.g. "Smooth & Sweet" or "High Clarity"
  water: number // in grams
  coffee: number // in grams
  grinder: GrinderType
  grinderSetting: string
  filter: string
  waterTemp?: number // in Fahrenheit
  waterNote?: string // e.g. "Default Machine Temp" or "Cooler = Sweeter"
  steps: BrewStep[]
  totalTime?: number // in seconds
  tips?: string[]
  beanRecommendation?: BeanRecommendation
}

export interface BeanRecommendation {
  source: string // e.g. "Metric Coffee"
  location?: string // e.g. "West Fulton Market"
  type: string // e.g. "Single Origin Washed Process"
  origins?: string[] // e.g. ["Peru", "Colombia", "Honduras"]
  flavor: string // e.g. "Clean, chocolate, citrus, structured"
}

export interface BrewStep {
  id: string
  order: number
  title: string
  description: string
  action?: string
  tips?: string[]
  timing?: {
    start: number // seconds from brew start
    duration?: number // seconds
    alert?: boolean // whether to show alert at this timing
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
