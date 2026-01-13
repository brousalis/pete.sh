/**
 * TypeScript types for Coffee Brewing Assistant feature
 * Based on coffee.md - comprehensive coffee routine system
 */

export type CoffeeRoutineType = "morning" | "afternoon" | "sunday"

export type GrinderType = "ode" | "s3"

export interface CoffeeRoutine {
  id: string
  type: CoffeeRoutineType
  name: string
  description: string
  batchSize: string
  water: number // in grams
  coffee: number // in grams
  grinder: GrinderType
  grinderSetting: string
  filter: string
  waterTemp?: number // in Fahrenheit
  steps: BrewStep[]
  totalTime?: number // in seconds
  tips?: string[]
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
