/**
 * AI Chef Types
 * Zod schemas for structured LLM output and service types
 */

import { z } from 'zod'

// ============================================
// ZOD SCHEMAS
// ============================================

export const DayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])

export const MealTypeSchema = z.enum([
  'breakfast',
  'lunch',
  'dinner',
  'snack',
])

export const CookingTimePreferenceSchema = z.enum([
  '15-min',
  '30-min',
  '45-min',
  'no-limit',
])

export const CookingPreferencesSchema = z.object({
  dislikes: z.array(z.string()).default([]).describe('Disliked ingredients'),
  allergies: z.array(z.string()).default([]).describe('Food allergies'),
  dietary: z.array(z.string()).default([]).describe('Dietary restrictions (e.g. vegetarian, low-carb, gluten-free)'),
  cuisinePreferences: z.array(z.string()).default([]).describe('Preferred cuisines (e.g. Italian, Mexican, Asian)'),
  householdSize: z.number().min(1).max(12).default(2).describe('Number of people in household'),
  cookingTimePreference: CookingTimePreferenceSchema.default('30-min').describe('Preferred max cooking time on weeknights'),
  notes: z.string().default('').describe('Freeform notes about food preferences'),
})

export const WeekPlanDaySuggestionSchema = z.object({
  day: DayOfWeekSchema.describe('Day of the week'),
  mealType: MealTypeSchema.describe('Meal type'),
  recipeId: z.string().describe('Recipe UUID'),
  recipeName: z.string().describe('Recipe name for display'),
  prepTime: z.number().optional().describe('Prep + cook time in minutes'),
  reasoning: z.string().describe('Why this recipe was chosen for this day'),
})

export const WeekPlanSuggestionSchema = z.object({
  days: z.array(WeekPlanDaySuggestionSchema).describe('Suggested meals for each day'),
  weekTheme: z.string().optional().describe('Optional theme for the week'),
  estimatedPrepTime: z.string().describe('Total estimated prep time for the week'),
})

// ============================================
// FITNESS MEAL PLANNING SCHEMAS
// ============================================

export const CarbLevelSchema = z.enum(['zero', 'low', 'moderate', 'high'])

export const FitnessDayRequirementSchema = z.object({
  day: DayOfWeekSchema,
  carbLevel: CarbLevelSchema,
  proteinKeywords: z.array(z.string()).describe('Main protein ingredients, e.g. ["chicken","breast"]'),
  mealType: MealTypeSchema.default('dinner'),
})

export const FitnessGuidelinesSchema = z.object({
  days: z.array(FitnessDayRequirementSchema),
  overallNotes: z.string().optional(),
})

export const FitnessProfileSchema = z.object({
  name: z.string().default('Default'),
  guidelines: FitnessGuidelinesSchema,
  savedAt: z.string(),
})

// ============================================
// RECIPE HINTS SCHEMAS
// ============================================

export const RecipeHintsSchema = z.object({
  prioritizedIds: z.array(z.string()).describe('Recipe IDs to boost/prioritize (must be from candidates)'),
  excludedIds: z.array(z.string()).optional().describe('Recipe IDs to exclude (must be from candidates)'),
  reasoning: z.string().optional().describe('Brief reasoning for the suggestions'),
})

// ============================================
// TYPESCRIPT TYPES (inferred from Zod)
// ============================================

export type CookingPreferences = z.infer<typeof CookingPreferencesSchema>
export type CookingTimePreference = z.infer<typeof CookingTimePreferenceSchema>
export type WeekPlanSuggestion = z.infer<typeof WeekPlanSuggestionSchema>
export type WeekPlanDaySuggestion = z.infer<typeof WeekPlanDaySuggestionSchema>
export type RecipeHints = z.infer<typeof RecipeHintsSchema>
export type CarbLevel = z.infer<typeof CarbLevelSchema>
export type FitnessDayRequirement = z.infer<typeof FitnessDayRequirementSchema>
export type FitnessGuidelines = z.infer<typeof FitnessGuidelinesSchema>
export type FitnessProfile = z.infer<typeof FitnessProfileSchema>

// ============================================
// SERVICE TYPES
// ============================================

export interface AiChefConversation {
  id: string
  title?: string
  messages: unknown[]
  contextSnapshot?: string
  createdAt: string
  updatedAt: string
}

export interface ConversationSummary {
  id: string
  title: string
  messageCount: number
  updatedAt: string
  createdAt: string
}
