/**
 * AI Chef Service
 * Assembles context from cooking data (recipes, meal plans, preferences, fridge),
 * and orchestrates LLM calls for meal planning chat and suggestions.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import {
  convertToModelMessages,
  defaultSettingsMiddleware,
  generateText,
  Output,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
  wrapLanguageModel,
  type LanguageModelMiddleware,
  type UIMessage,
} from 'ai'
import { z } from 'zod'

import { config } from '@/lib/config'
import { cookingService } from '@/lib/services/cooking.service'
import { mealPlanningService } from '@/lib/services/meal-planning.service'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import {
  CookingPreferencesSchema,
  FitnessGuidelinesSchema,
  FitnessProfileSchema,
  RecipeHintsSchema,
  WeekPlanSuggestionSchema,
  type CarbLevel,
  type ConversationSummary,
  type CookingPreferences,
  type FitnessDayRequirement,
  type FitnessGuidelines,
  type FitnessProfile,
  type RecipeHints,
} from '@/lib/types/ai-chef.types'
import type { DayMeals, DayOfWeek, MealPlan, Recipe, RecipeListItem, WeeklyMeals } from '@/lib/types/cooking.types'
import { deduplicateToolCallIds } from '@/lib/utils/ai-message-utils'

// ============================================
// LANGUAGE MODEL MIDDLEWARE
// ============================================

const loggingMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',
  wrapGenerate: async ({ doGenerate }) => {
    const start = Date.now()
    const result = await doGenerate()
    const elapsed = Date.now() - start
    console.log(
      `[AI Chef] generateText: ${elapsed}ms | input=${result.usage?.inputTokens?.total ?? 0} output=${result.usage?.outputTokens?.total ?? 0}`
    )
    return result
  },
  wrapStream: async ({ doStream }) => {
    const start = Date.now()
    const result = await doStream()
    let totalChars = 0
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        if (chunk.type === 'text-delta') totalChars += chunk.delta.length
        controller.enqueue(chunk)
      },
      flush() {
        console.log(
          `[AI Chef] streamText: ${Date.now() - start}ms | chars=${totalChars}`
        )
      },
    })
    return { ...result, stream: result.stream.pipeThrough(transformStream) }
  },
}

// ============================================
// DATE HELPER (Chicago / Central Time)
// ============================================

function getLocalDateString(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return formatter.format(now)
}

function getDayOfWeek(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
  })
  return formatter.format(now)
}

// ============================================
// MODEL SETUP
// ============================================

function getModel() {
  const anthropic = createAnthropic({
    apiKey: config.aiCoach.anthropicApiKey,
  })
  return wrapLanguageModel({
    model: anthropic(config.aiCoach.defaultModel),
    middleware: [defaultSettingsMiddleware({ settings: { temperature: 0.7, maxOutputTokens: 4096 } }), loggingMiddleware],
  })
}

// ============================================
// PREFERENCES CRUD
// ============================================

export async function getPreferences(): Promise<CookingPreferences> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) {
    return CookingPreferencesSchema.parse({})
  }

  const { data, error } = await supabase
    .from('cooking_preferences')
    .select('*')
    .limit(1)
    .single()

  if (error || !data) {
    return CookingPreferencesSchema.parse({})
  }

  try {
    return CookingPreferencesSchema.parse(data.preferences)
  } catch {
    return CookingPreferencesSchema.parse({})
  }
}

export async function updatePreferences(
  preferences: CookingPreferences
): Promise<CookingPreferences> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const validated = CookingPreferencesSchema.parse(preferences)

  // Check if a row exists
  const { data: existing } = await supabase
    .from('cooking_preferences')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('cooking_preferences')
      .update({
        preferences: validated as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', existing.id)

    if (error) {
      console.error('[AI Chef] Error updating preferences:', error)
      throw new Error(`Failed to update preferences: ${error.message}`)
    }
  } else {
    const { error } = await supabase
      .from('cooking_preferences')
      .insert({
        preferences: validated as unknown as Record<string, unknown>,
      } as never)

    if (error) {
      console.error('[AI Chef] Error creating preferences:', error)
      throw new Error(`Failed to create preferences: ${error.message}`)
    }
  }

  return validated
}

// ============================================
// RECIPE HINTS (Meal Plan Wizard AI Filter)
// ============================================

export interface RecipeHintCandidate {
  id: string
  name: string
  tags?: string[]
  prep_time?: number
  cook_time?: number
  difficulty?: string
  description?: string
}

export async function getRecipeHints(
  prompt: string,
  candidates: RecipeHintCandidate[]
): Promise<RecipeHints | null> {
  if (!config.aiCoach.isConfigured) return null
  if (candidates.length === 0) return null

  try {
    const preferences = await getPreferences()
    const prefsContext = `Dislikes: ${preferences.dislikes.join(', ') || 'none'}. Allergies: ${preferences.allergies.join(', ') || 'none'}. Dietary: ${preferences.dietary.join(', ') || 'no restrictions'}.`

    const candidateList = candidates
      .map(
        (r) =>
          `- [${r.id}] "${r.name}"${r.tags?.length ? ` tags: ${r.tags.join(', ')}` : ''}${r.prep_time || r.cook_time ? ` time: ${(r.prep_time || 0) + (r.cook_time || 0)}min` : ''}${r.difficulty ? ` (${r.difficulty})` : ''}${r.description ? ` — ${r.description.slice(0, 80)}` : ''}`
      )
      .join('\n')

    const model = getModel()
    const { experimental_output } = await generateText({
      model,
      output: Output.object({ schema: RecipeHintsSchema }),
      system: `You are an AI Chef helping filter recipes for a weekly meal plan. The user has typed a free-form request. Your job is to return recipe IDs to PRIORITIZE (boost in selection) and optionally to EXCLUDE. Only use IDs from the candidate list — never invent IDs. Respect dislikes, allergies, and dietary restrictions. If the user asks for "light meals", prioritize lower-calorie recipes. If they say "use chicken", prioritize chicken recipes. If they say "avoid dairy", exclude recipes with dairy. Return empty arrays if no strong signals.`,
      prompt: `User preferences: ${prefsContext}

Candidate recipes:
${candidateList}

User's request: "${prompt}"

Return prioritizedIds (recipes that match well) and optionally excludedIds (recipes to avoid). Only use IDs from the list above.`,
    })

    return experimental_output ?? null
  } catch (error) {
    console.error('[AI Chef] getRecipeHints failed:', error)
    return null
  }
}

// ============================================
// CONTEXT ASSEMBLY
// ============================================

async function getRecipeCatalogSummary(): Promise<string> {
  try {
    const recipes = await cookingService.getRecipes()
    if (recipes.length === 0) return 'No recipes yet.'

    // Dense format: id|name|source|time|tags|cal|protein|nutrition_category
    function formatRecipe(r: RecipeListItem): string {
      const src = r.source === 'trader_joes' ? 'TJ' : 'C'
      const time = (r.prep_time || 0) + (r.cook_time || 0)
      const parts = [r.id, r.name, src]
      parts.push(time ? `${time}m` : '-')
      parts.push(r.tags?.length ? r.tags.join(',') : '-')
      if (r.calories_per_serving || r.protein_g) {
        parts.push(r.calories_per_serving ? `${r.calories_per_serving}cal` : '-')
        parts.push(r.protein_g ? `${r.protein_g}gP` : '-')
      }
      if (r.nutrition_category?.length) parts.push(r.nutrition_category.join(','))
      if (r.is_favorite) parts.push('★')
      return parts.join('|')
    }

    const custom = recipes.filter((r) => r.source === 'custom')
    const tj = recipes.filter((r) => r.source === 'trader_joes')
    const lines: string[] = [`${recipes.length} recipes (${custom.length} custom, ${tj.length} TJ). Format: id|name|source|time|tags|cal|protein`]

    if (custom.length > 0) {
      lines.push('Custom:', ...custom.map(formatRecipe))
    }
    if (tj.length > 0) {
      lines.push('TJ:', ...tj.map(formatRecipe))
    }

    return lines.join('\n')
  } catch {
    return 'Recipe catalog unavailable.'
  }
}

async function getCurrentMealPlanContext(): Promise<string> {
  try {
    const plan = await mealPlanningService.getMealPlan()
    if (!plan) return 'No meal plan for the current week yet.'

    const recipes = await cookingService.getRecipes()
    const recipeMap = new Map(recipes.map((r) => [r.id, r]))

    const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const lines: string[] = [`Week of ${plan.week_start_date}:`]

    for (const day of days) {
      const meals = plan.meals[day]
      if (!meals) {
        lines.push(`  ${day}: (empty)`)
        continue
      }
      if (meals.skipped) {
        lines.push(`  ${day}: SKIPPED${meals.skip_note ? ` — ${meals.skip_note}` : ''}`)
        continue
      }

      const parts: string[] = []
      for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
        const recipeId = meals[mealType]
        if (recipeId) {
          const recipe = recipeMap.get(recipeId)
          parts.push(`${mealType}: ${recipe?.name || recipeId}`)
        }
      }
      lines.push(`  ${day}: ${parts.length > 0 ? parts.join(', ') : '(empty)'}`)
    }

    return lines.join('\n')
  } catch {
    return 'Could not load current meal plan.'
  }
}

async function getRecentMealPlansContext(weeks: number = 2): Promise<string> {
  try {
    const plans = await mealPlanningService.getRecentMealPlans(weeks)
    if (plans.length === 0) return 'No recent meal plan history.'

    const recipes = await cookingService.getRecipes()
    const recipeMap = new Map(recipes.map((r) => [r.id, r]))

    return plans
      .map((plan: MealPlan) => {
        const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        const dinners = days
          .map((d) => {
            const meals = plan.meals[d]
            if (!meals?.dinner) return null
            const recipe = recipeMap.get(meals.dinner)
            return `${d}: ${recipe?.name || 'unknown'}`
          })
          .filter(Boolean)
          .join(', ')
        return `Week of ${plan.week_start_date}: ${dinners || '(no dinners planned)'}`
      })
      .join('\n')
  } catch {
    return 'Recent meal plans unavailable.'
  }
}

async function getFridgeContext(): Promise<string> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return 'No fridge data.'

  try {
    const { data } = await supabase
      .from('fridge_scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!data) return 'No fridge scan on record.'

    const items = (data.confirmed_items as string[]) || (data.identified_items as string[]) || []
    if (items.length === 0) return 'Fridge scan found but no items identified.'

    return `Fridge contents (from ${data.scan_type} scan on ${data.created_at?.split('T')[0] || '?'}):\n${items.join(', ')}`
  } catch {
    return 'Could not load fridge data.'
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

export async function assembleContext(): Promise<string> {
  const [
    preferences,
    recipeCatalog,
    currentPlan,
    recentPlans,
    fridge,
  ] = await Promise.all([
    getPreferences(),
    getRecipeCatalogSummary(),
    getCurrentMealPlanContext(),
    getRecentMealPlansContext(2),
    getFridgeContext(),
  ])

  const prefsLine = [
    preferences.dislikes.length > 0 ? `Dislikes: ${preferences.dislikes.join(', ')}` : null,
    preferences.allergies.length > 0 ? `Allergies: ${preferences.allergies.join(', ')}` : null,
    preferences.dietary.length > 0 ? `Dietary: ${preferences.dietary.join(', ')}` : null,
    preferences.cuisinePreferences.length > 0 ? `Cuisines: ${preferences.cuisinePreferences.join(', ')}` : null,
    `Household: ${preferences.householdSize}`,
    `Max cook: ${preferences.cookingTimePreference}`,
    preferences.notes ? `Notes: ${preferences.notes}` : null,
  ].filter(Boolean).join(' | ')

  const context = [
    `[Prefs] ${prefsLine}`,
    `[This Week] ${currentPlan}`,
    `[Recent] ${recentPlans}`,
    `[Recipes]\n${recipeCatalog}`,
    `[Fridge] ${fridge}`,
  ].join('\n\n')

  console.log(
    `[AI Chef] Context assembled: ~${estimateTokens(context)} tokens | ` +
    `recipes=${recipeCatalog.length}ch plan=${currentPlan.length}ch recent=${recentPlans.length}ch fridge=${fridge.length}ch`
  )

  return context
}

// ============================================
// RECIPE-FOCUSED CONTEXT
// ============================================

export async function assembleRecipeContext(recipeId: string): Promise<string> {
  const [recipe, versions, preferences] = await Promise.all([
    cookingService.getRecipe(recipeId),
    cookingService.getRecipeVersions(recipeId),
    getPreferences(),
  ])

  if (!recipe) throw new Error(`Recipe ${recipeId} not found`)

  const sections: string[] = []

  const ingredientsList = recipe.ingredients
    .map((ing, i) => {
      const parts = [`${i + 1}. ${ing.name}`]
      if (ing.amount) parts.push(`— ${ing.amount}`)
      if (ing.unit) parts.push(ing.unit)
      if (ing.notes) parts.push(`(${ing.notes})`)
      return parts.join(' ')
    })
    .join('\n')

  const instructionsList = recipe.instructions
    .map((step) => `${step.step_number}. ${step.instruction}${step.duration ? ` (${step.duration} min)` : ''}`)
    .join('\n')

  const metaLines = [
    `ID: ${recipe.id}`,
    recipe.description && `Description: ${recipe.description}`,
    recipe.prep_time != null && `Prep Time: ${recipe.prep_time} min`,
    recipe.cook_time != null && `Cook Time: ${recipe.cook_time} min`,
    recipe.servings != null && `Servings: ${recipe.servings}`,
    recipe.difficulty && `Difficulty: ${recipe.difficulty}`,
    recipe.tags?.length && `Tags: ${recipe.tags.join(', ')}`,
    recipe.notes && `Notes: ${recipe.notes}`,
    recipe.calories_per_serving && `Calories/serving: ${recipe.calories_per_serving}`,
    recipe.protein_g && `Protein: ${recipe.protein_g}g`,
    recipe.fat_g && `Fat: ${recipe.fat_g}g`,
    recipe.carbs_g && `Carbs: ${recipe.carbs_g}g`,
  ].filter(Boolean).join('\n')

  sections.push(`## Recipe: ${recipe.name}\n${metaLines}\n\n### Ingredients\n${ingredientsList || 'No ingredients listed'}\n\n### Instructions\n${instructionsList || 'No instructions listed'}`)

  if (versions.length > 0) {
    const versionSummary = versions.slice(0, 5)
      .map((v) => `- v${v.version_number}: "${v.commit_message}" (${v.created_at.split('T')[0]})`)
      .join('\n')
    sections.push(`## Version History (${versions.length} total)\n${versionSummary}`)
  }

  sections.push(`## User Preferences\nDislikes: ${preferences.dislikes.length > 0 ? preferences.dislikes.join(', ') : 'none'}\nAllergies: ${preferences.allergies.length > 0 ? preferences.allergies.join(', ') : 'none'}\nDietary: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'no restrictions'}`)

  return sections.join('\n\n---\n\n')
}

// ============================================
// RECIPE-FOCUSED CHAT STREAM
// ============================================

export async function createRecipeChatStream(
  uiMessages: UIMessage[],
  recipeContext: string,
  recipeId: string
) {
  const model = getModel()
  const modelMessages = deduplicateToolCallIds(
    await convertToModelMessages(trimMessages(uiMessages)),
    'AI Chef Recipe'
  )

  return streamText({
    model,
    system: `You are an expert AI Chef helping the user refine a specific recipe. The full recipe details, including ingredients, instructions, and version history, are provided below.

Your personality is warm, knowledgeable, and creative. When discussing changes, be specific about what you'd modify and why.

## Key Behaviors
- When the user asks to improve, simplify, or modify the recipe, discuss the changes first, then use the **proposeRecipeVersion** tool to create a formal proposal they can review and apply.
- ALWAYS use proposeRecipeVersion when suggesting concrete changes — never just describe them in text. The tool renders a beautiful preview card with "Apply" / "Dismiss" buttons.
- When proposing changes, include ALL ingredients and ALL instructions in the proposal (not just the changed ones) — the proposal replaces the entire recipe.
- Respect food dislikes and allergies listed in the user's preferences.
- Be creative but practical — suggest changes that enhance flavor, nutrition, or simplicity.
- If the user asks about substitutions, explain the trade-offs (flavor, texture, nutrition).

Today's date: ${getLocalDateString()}

${recipeContext}`,
    messages: modelMessages,
    stopWhen: stepCountIs(6),
    experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
    tools: {
      proposeRecipeVersion: tool({
        description: 'Propose an updated version of the current recipe. This shows the user a preview card with the changes for them to review and apply. Include ALL ingredients and ALL instructions in the proposal, not just changed ones — the proposal replaces the entire recipe.',
        inputSchema: z.object({
          commitMessage: z.string().describe('Brief description of what changed, e.g. "Replaced red peppers with roasted zucchini"'),
          name: z.string().optional().describe('New recipe name (omit to keep current)'),
          description: z.string().optional().describe('New description (omit to keep current)'),
          prepTime: z.number().optional().describe('New prep time in minutes'),
          cookTime: z.number().optional().describe('New cook time in minutes'),
          servings: z.number().optional().describe('New number of servings'),
          ingredients: z.array(z.object({
            name: z.string(),
            amount: z.number().optional(),
            unit: z.string().optional(),
            notes: z.string().optional(),
          })).describe('Complete list of ingredients for the updated recipe'),
          instructions: z.array(z.object({
            stepNumber: z.number(),
            instruction: z.string(),
            duration: z.number().optional().describe('Step duration in minutes'),
          })).describe('Complete list of instructions for the updated recipe'),
          notes: z.string().optional(),
          tags: z.array(z.string()).optional(),
        }),
        execute: async (proposed) => {
          try {
            const currentRecipe = await cookingService.getRecipe(recipeId)
            if (!currentRecipe) return { status: 'error', message: 'Recipe not found' }

            const merged = {
              name: proposed.name ?? currentRecipe.name,
              description: proposed.description ?? currentRecipe.description,
              prep_time: proposed.prepTime ?? currentRecipe.prep_time,
              cook_time: proposed.cookTime ?? currentRecipe.cook_time,
              servings: proposed.servings ?? currentRecipe.servings,
              notes: proposed.notes ?? currentRecipe.notes,
              tags: proposed.tags ?? currentRecipe.tags,
              ingredients: proposed.ingredients.map((ing, i) => ({
                name: ing.name,
                amount: ing.amount,
                unit: ing.unit,
                notes: ing.notes,
                order_index: i,
              })),
              instructions: proposed.instructions.map((step) => ({
                step_number: step.stepNumber,
                instruction: step.instruction,
                duration: step.duration,
              })),
            }

            return {
              status: 'pending_confirmation',
              commitMessage: proposed.commitMessage,
              recipeId,
              proposed: merged,
              current: {
                name: currentRecipe.name,
                description: currentRecipe.description,
                prep_time: currentRecipe.prep_time,
                cook_time: currentRecipe.cook_time,
                servings: currentRecipe.servings,
                notes: currentRecipe.notes,
                tags: currentRecipe.tags,
                ingredients: currentRecipe.ingredients.map((ing) => ({
                  name: ing.name,
                  amount: ing.amount,
                  unit: ing.unit,
                  notes: ing.notes,
                })),
                instructions: currentRecipe.instructions,
              },
            }
          } catch (error) {
            return {
              status: 'error',
              message: error instanceof Error ? error.message : 'Failed to prepare version preview',
            }
          }
        },
      }),
    },
    onStepFinish({ finishReason, usage, toolCalls }) {
      if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls) {
          console.log(
            `[AI Chef Recipe] Tool ${tc.toolName}: reason=${finishReason} | tokens=${usage?.totalTokens || 0}`
          )
        }
      }
    },
  })
}

// ============================================
// MEAL PLANNING CHAT STREAM
// ============================================

const MAX_CONTEXT_MESSAGES = 20

function trimMessages(messages: UIMessage[]): UIMessage[] {
  if (messages.length <= MAX_CONTEXT_MESSAGES) return messages
  const trimmed = messages.slice(-MAX_CONTEXT_MESSAGES)
  console.log(`[AI Chef] Trimmed messages: ${messages.length} → ${trimmed.length}`)
  return trimmed
}

export async function createChatStream(
  uiMessages: UIMessage[],
  systemContext: string
) {
  const model = getModel()
  const modelMessages = deduplicateToolCallIds(
    await convertToModelMessages(trimMessages(uiMessages)),
    'AI Chef'
  )

  return streamText({
    model,
    system: `You are an AI Chef meal-planning assistant. Be warm, specific, practical. Reference actual recipe names/IDs from context.

## Tools
- suggestWeekPlan: REQUIRED when planning multiple days. Renders UI card with "Apply All". ALWAYS call this.
- setMealSlot: Change a single day's meal.
- searchRecipes: Get full recipe details. Catalog IDs are in context; use this for ingredient/description search.

## Rules
- Respect dislikes/allergies strictly. Avoid recent-week repeats. Use fridge items first.
- Mix TJ and custom (C) recipes for variety. Weeknights: respect max cook time.
- Always finish with suggestWeekPlan or setMealSlot when asked to plan/set meals.

Today: ${getLocalDateString()} (${getDayOfWeek()})

${systemContext}`,
    messages: modelMessages,
    stopWhen: stepCountIs(4),
    experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
    tools: {
      searchRecipes: tool({
        description: 'Search recipes by name, tags, ingredients, or cuisine. Returns details not in the catalog summary.',
        inputSchema: z.object({
          query: z.string().optional().describe('Search term'),
          source: z.enum(['all', 'custom', 'trader_joes']).default('all'),
        }),
        execute: async ({ query, source }) => {
          const filters: { search?: string; source?: 'custom' | 'trader_joes' } = {}
          if (query) filters.search = query
          if (source !== 'all') filters.source = source

          const recipes = await cookingService.getRecipes(filters)
          if (recipes.length === 0) return ['No recipes found']

          return recipes.slice(0, 20).map((r) => {
            const src = r.source === 'trader_joes' ? 'TJ' : 'C'
            const time = (r.prep_time || 0) + (r.cook_time || 0)
            return `${src}|${r.id}|${r.name}|${time ? time + 'm' : '-'}|${r.tags?.join(',') || '-'}${r.description ? '|' + r.description.slice(0, 100) : ''}`
          })
        },
      }),

      suggestWeekPlan: tool({
        description: 'REQUIRED for multi-day meal plans. Renders UI card with "Apply All".',
        inputSchema: z.object({
          plan: WeekPlanSuggestionSchema.describe('The suggested week plan'),
        }),
        execute: async ({ plan }) => {
          return plan
        },
      }),

      setMealSlot: tool({
        description: 'Set one meal slot in the current week plan.',
        inputSchema: z.object({
          day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).describe('Day of the week'),
          mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).describe('Meal type'),
          recipeId: z.string().describe('Recipe UUID to set'),
          recipeName: z.string().describe('Recipe name (for confirmation display)'),
        }),
        execute: async ({ day, mealType, recipeId, recipeName }) => {
          try {
            const currentPlan = await mealPlanningService.getMealPlan()

            const meals: WeeklyMeals = currentPlan?.meals || {}
            const dayMeals: DayMeals = meals[day as DayOfWeek] || {}
            dayMeals[mealType as keyof Pick<DayMeals, 'breakfast' | 'lunch' | 'dinner' | 'snack'>] = recipeId

            const weekStart = getWeekStartDate()
            await mealPlanningService.saveMealPlan({
              week_start_date: weekStart,
              meals: { ...meals, [day]: dayMeals },
            })

            return { success: true, message: `Set ${day} ${mealType} to "${recipeName}"` }
          } catch (error) {
            return {
              success: false,
              message: `Failed to set meal: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
          }
        },
      }),
    },
    onStepFinish({ finishReason, usage, toolCalls }) {
      if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls) {
          console.log(
            `[AI Chef] Tool ${tc.toolName}: reason=${finishReason} | tokens=${usage?.totalTokens || 0}`
          )
        }
      }
    },
  })
}

// ============================================
// HELPER: Get current week start date (Monday)
// ============================================

function getWeekStartDate(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0] ?? ''
}

// ============================================
// FITNESS MEAL PLAN PIPELINE
// ============================================

function getHaikuModel() {
  const anthropic = createAnthropic({ apiKey: config.aiCoach.anthropicApiKey })
  return anthropic('claude-haiku-4-5-20251001')
}

/**
 * Parse a fitness prompt into structured per-day requirements using Haiku.
 * Haiku has a separate rate limit bucket from Sonnet (~200k/min vs 30k/min).
 */
export async function parseFitnessGuidelines(prompt: string): Promise<FitnessGuidelines> {
  const { experimental_output } = await generateText({
    model: getHaikuModel(),
    output: Output.object({ schema: FitnessGuidelinesSchema }),
    system: 'Extract per-day nutrition requirements from the fitness meal plan. For each day mentioned, return the day name (lowercase), carbLevel (zero/low/moderate/high), proteinKeywords (the main protein ingredients mentioned, as individual words like ["chicken","breast"]), and mealType (breakfast/lunch/dinner/snack). Only include days explicitly mentioned.',
    prompt,
  })
  if (!experimental_output) {
    throw new Error('Failed to parse fitness guidelines')
  }
  console.log(`[AI Chef Fitness] Parsed ${experimental_output.days.length} days from guidelines`)
  return experimental_output
}

const CARB_LEVEL_CATEGORIES: Record<CarbLevel, string[]> = {
  zero: ['low-carb', 'rest-day', 'recomp-friendly'],
  low: ['low-carb', 'rest-day', 'recomp-friendly'],
  moderate: ['moderate-carb', 'balanced', 'post-workout'],
  high: ['high-carb', 'post-workout'],
}

interface DayCandidates {
  day: DayOfWeek
  carbLevel: CarbLevel
  mealType: string
  proteinKeywords: string[]
  recipes: Recipe[]
}

/**
 * Find candidate recipes for each day using tiered SQL filtering.
 * Tier 1: nutrition_category + ingredient keyword match
 * Tier 2: nutrition_category only
 * Tier 3: ingredient keyword match only
 * Tier 4: all recipes (last resort)
 */
export async function findCandidateRecipes(
  days: FitnessDayRequirement[],
  recentRecipeIds: Set<string>,
  maxPerDay: number = 8
): Promise<DayCandidates[]> {
  const results: DayCandidates[] = []

  for (const day of days) {
    const categories = CARB_LEVEL_CATEGORIES[day.carbLevel]
    const primaryKeyword = day.proteinKeywords[0]
    let candidates: Recipe[] = []

    // Tier 1: nutrition_category + ingredient keyword
    if (primaryKeyword && categories.length > 0) {
      try {
        candidates = await cookingService.getRecipes({
          nutritionCategory: [...categories, 'high-protein'],
          ingredientSearch: primaryKeyword,
          fullShape: true,
        })
      } catch {
        candidates = []
      }
    }

    // Tier 2: nutrition_category only
    if (candidates.length < 3 && categories.length > 0) {
      try {
        const tier2 = await cookingService.getRecipes({
          nutritionCategory: [...categories, 'high-protein'],
          fullShape: true,
        })
        const existingIds = new Set(candidates.map((r) => r.id))
        for (const r of tier2) {
          if (!existingIds.has(r.id)) candidates.push(r)
        }
      } catch { /* continue */ }
    }

    // Tier 3: ingredient keyword only
    if (candidates.length < 3 && primaryKeyword) {
      try {
        const tier3 = await cookingService.getRecipes({
          ingredientSearch: primaryKeyword,
          fullShape: true,
        })
        const existingIds = new Set(candidates.map((r) => r.id))
        for (const r of tier3) {
          if (!existingIds.has(r.id)) candidates.push(r)
        }
      } catch { /* continue */ }
    }

    // Tier 4: all recipes as last resort
    if (candidates.length < 3) {
      try {
        const tier4 = await cookingService.getRecipes({ fullShape: true })
        const existingIds = new Set(candidates.map((r) => r.id))
        for (const r of tier4) {
          if (!existingIds.has(r.id)) candidates.push(r)
        }
      } catch { /* continue */ }
    }

    // Filter out recently used, then cap
    const filtered = candidates
      .filter((r) => !recentRecipeIds.has(r.id))
      .slice(0, maxPerDay)

    // If filtering removed too many, add some recent ones back
    const final = filtered.length >= 3
      ? filtered
      : candidates.slice(0, maxPerDay)

    results.push({
      day: day.day,
      carbLevel: day.carbLevel,
      mealType: day.mealType,
      proteinKeywords: day.proteinKeywords,
      recipes: final,
    })
  }

  const totalCandidates = results.reduce((sum, d) => sum + d.recipes.length, 0)
  console.log(
    `[AI Chef Fitness] Found candidates: ${results.map((d) => `${d.day}=${d.recipes.length}`).join(', ')} (${totalCandidates} total)`
  )

  return results
}

/**
 * Get recipe IDs used in recent meal plans (for variety avoidance).
 */
export async function getRecentRecipeIds(weeks: number = 2): Promise<Set<string>> {
  const ids = new Set<string>()
  try {
    const plans = await mealPlanningService.getRecentMealPlans(weeks)
    const allDays: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    for (const plan of plans) {
      for (const day of allDays) {
        const meals = plan.meals[day]
        if (!meals) continue
        for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
          const recipeId = meals[mealType]
          if (recipeId) ids.add(recipeId)
        }
      }
    }
  } catch { /* non-critical */ }
  return ids
}

function formatCandidatesContext(candidates: DayCandidates[]): string {
  return candidates.map((day) => {
    const header = `[${day.day}|${day.carbLevel}-carb|${day.mealType}]`
    if (day.recipes.length === 0) return `${header} No matching recipes found`
    const recipes = day.recipes.map((r) => {
      const time = (r.prep_time || 0) + (r.cook_time || 0)
      const parts = [r.id, r.name]
      if (time) parts.push(`${time}m`)
      if (r.calories_per_serving) parts.push(`${r.calories_per_serving}cal`)
      if (r.protein_g) parts.push(`${r.protein_g}gP`)
      if (r.carbs_g) parts.push(`${r.carbs_g}gC`)
      if (r.source === 'trader_joes') parts.push('TJ')
      return parts.join('|')
    }).join('\n  ')
    return `${header}\n  ${recipes}`
  }).join('\n')
}

/**
 * Create a fitness-optimized planning stream.
 * Uses a minimal system prompt with only pre-filtered candidates.
 */
export async function createFitnessPlanStream(
  candidates: DayCandidates[],
  guidelines: FitnessGuidelines,
  uiMessages: UIMessage[]
) {
  const model = getModel()
  const modelMessages = deduplicateToolCallIds(
    await convertToModelMessages(trimMessages(uiMessages)),
    'AI Chef Fitness'
  )
  const candidateContext = formatCandidatesContext(candidates)
  const preferences = await getPreferences()

  const prefsLine = [
    preferences.dislikes.length > 0 ? `Dislikes: ${preferences.dislikes.join(', ')}` : null,
    preferences.allergies.length > 0 ? `Allergies: ${preferences.allergies.join(', ')}` : null,
  ].filter(Boolean).join(' | ')

  const contextEstimate = estimateTokens(candidateContext)
  console.log(`[AI Chef Fitness] Planning stream context: ~${contextEstimate} tokens`)

  return streamText({
    model,
    system: `You are an AI Chef. Select the best recipe for each day from the pre-filtered candidates below. Call suggestWeekPlan with your selections.

${prefsLine ? `Restrictions: ${prefsLine}\n` : ''}Each day lists candidate recipes matching that day's nutrition profile (carb level + high protein). Pick the best fit considering variety and taste.

${candidateContext}`,
    messages: modelMessages,
    stopWhen: stepCountIs(2),
    experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
    tools: {
      suggestWeekPlan: tool({
        description: 'Submit the meal plan. Renders UI card with "Apply All".',
        inputSchema: z.object({
          plan: WeekPlanSuggestionSchema.describe('The suggested week plan'),
        }),
        execute: async ({ plan }) => plan,
      }),
      setMealSlot: tool({
        description: 'Set one meal slot in the current week plan.',
        inputSchema: z.object({
          day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
          mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
          recipeId: z.string(),
          recipeName: z.string(),
        }),
        execute: async ({ day, mealType, recipeId, recipeName }) => {
          try {
            const currentPlan = await mealPlanningService.getMealPlan()
            const meals: WeeklyMeals = currentPlan?.meals || {}
            const dayMeals: DayMeals = meals[day as DayOfWeek] || {}
            dayMeals[mealType as keyof Pick<DayMeals, 'breakfast' | 'lunch' | 'dinner' | 'snack'>] = recipeId
            const weekStart = getWeekStartDate()
            await mealPlanningService.saveMealPlan({
              week_start_date: weekStart,
              meals: { ...meals, [day]: dayMeals },
            })
            return { success: true, message: `Set ${day} ${mealType} to "${recipeName}"` }
          } catch (error) {
            return {
              success: false,
              message: `Failed to set meal: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
          }
        },
      }),
    },
    onStepFinish({ finishReason, usage, toolCalls }) {
      if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls) {
          console.log(
            `[AI Chef Fitness] Tool ${tc.toolName}: reason=${finishReason} | tokens=${usage?.totalTokens || 0}`
          )
        }
      }
    },
  })
}

// ============================================
// FITNESS PROFILE PERSISTENCE
// ============================================

export async function saveFitnessProfile(guidelines: FitnessGuidelines): Promise<void> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return

  const profile: FitnessProfile = FitnessProfileSchema.parse({
    name: 'Default',
    guidelines,
    savedAt: new Date().toISOString(),
  })

  const { data: existing } = await supabase
    .from('cooking_preferences')
    .select('id, preferences')
    .limit(1)
    .single()

  if (existing) {
    const prefs = (existing.preferences as Record<string, unknown>) || {}
    await supabase
      .from('cooking_preferences')
      .update({
        preferences: { ...prefs, fitnessProfile: profile } as never,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', existing.id)
  } else {
    await supabase
      .from('cooking_preferences')
      .insert({
        preferences: { fitnessProfile: profile } as never,
      } as never)
  }
  console.log(`[AI Chef Fitness] Saved fitness profile (${guidelines.days.length} days)`)
}

export async function loadFitnessProfile(): Promise<FitnessProfile | null> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return null

  const { data } = await supabase
    .from('cooking_preferences')
    .select('preferences')
    .limit(1)
    .single()

  if (!data) return null

  try {
    const prefs = data.preferences as Record<string, unknown>
    if (!prefs?.fitnessProfile) return null
    return FitnessProfileSchema.parse(prefs.fitnessProfile)
  } catch {
    return null
  }
}

// ============================================
// FITNESS PROMPT DETECTION
// ============================================

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const FITNESS_KEYWORDS = ['carb', 'protein', 'workout', 'fitness', 'macro', 'calories', 'lifting', 'cardio', 'zone 2', 'interval', 'recovery']
const MEAL_PLAN_KEYWORDS = ['meal', 'dinner', 'lunch', 'breakfast', 'recipe', 'cook', 'food', 'snack', 'nutrition plan']
const MEAL_PLAN_WORD_BOUNDARY = ['eat', 'eating']
const WORKOUT_ONLY_KEYWORDS = ['routine', 'sets', 'reps', 'exercise', 'stretches', 'planks', 'curls', 'press', 'run/walk', 'sprint', 'decompression']
const WORKOUT_INTENT_PHRASES = [
  'workout routine', 'training routine', 'exercise routine',
  'update the routine', 'updates to the routine', 'updates to our routine',
  'update my routine', 'modify the routine', 'change the routine',
  'weekly routine', 'workout plan', 'training plan', 'exercise plan',
  'workout schedule', 'training schedule',
]

export function isFitnessMealPlanRequest(msg: string): boolean {
  if (msg.length < 200) return false
  const lower = msg.toLowerCase()

  // Explicit workout intent in the opening text trumps everything
  const opening = lower.slice(0, 300)
  if (WORKOUT_INTENT_PHRASES.some((p) => opening.includes(p))) {
    return false
  }

  const dayCount = DAY_NAMES.filter((d) => lower.includes(d)).length
  if (dayCount < 3) return false
  const keywordCount = FITNESS_KEYWORDS.filter((k) => lower.includes(k)).length
  if (keywordCount < 2) return false

  // Use word-boundary regex for short keywords that cause substring false positives
  const substringCount = MEAL_PLAN_KEYWORDS.filter((k) => lower.includes(k)).length
  const wordBoundaryCount = MEAL_PLAN_WORD_BOUNDARY.filter((k) =>
    new RegExp(`\\b${k}\\b`).test(lower)
  ).length
  const mealKeywordCount = substringCount + wordBoundaryCount

  const workoutOnlyCount = WORKOUT_ONLY_KEYWORDS.filter((k) => lower.includes(k)).length
  if (mealKeywordCount === 0 && workoutOnlyCount >= 3) {
    return false
  }

  return true
}

export function isFitnessProfileTrigger(msg: string): boolean {
  if (msg.length > 150) return false
  const lower = msg.toLowerCase()
  const triggers = [
    'plan this week',
    'plan my meals',
    'fitness plan',
    'fitness profile',
    'use my profile',
    'meal plan',
    'weekly plan',
    'plan dinners',
    "plan this week's",
  ]
  return triggers.some((t) => lower.includes(t))
}

// ============================================
// CHAT PERSISTENCE
// ============================================

export async function saveChatMessages(
  chatId: string,
  messages: UIMessage[]
): Promise<void> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return

  const firstUserMsg = messages.find((m) => m.role === 'user')
  const firstText = firstUserMsg?.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join(' ')
  const title = firstText
    ? firstText.length > 60
      ? firstText.slice(0, 57) + '...'
      : firstText
    : null

  // Check if conversation already has a title
  const { data: existing } = await supabase
    .from('ai_chef_conversations')
    .select('title')
    .eq('id', chatId)
    .single()

  const upsertData: Record<string, unknown> = {
    id: chatId,
    messages: JSON.parse(JSON.stringify(messages)),
    updated_at: new Date().toISOString(),
  }

  if (!existing?.title && title) {
    upsertData.title = title
  }

  const { error } = await supabase
    .from('ai_chef_conversations')
    .upsert(upsertData as never, { onConflict: 'id' })

  if (error) {
    console.error('[AI Chef] Error saving chat:', error)
  }
}

export async function loadChatMessages(
  chatId: string
): Promise<UIMessage[]> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return []

  const { data, error } = await supabase
    .from('ai_chef_conversations')
    .select('messages')
    .eq('id', chatId)
    .single()

  if (error || !data) return []
  return (data.messages as UIMessage[]) || []
}

export async function getLatestChatId(): Promise<string | null> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return null

  const { data } = await supabase
    .from('ai_chef_conversations')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return data?.id || null
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return []

  const { data, error } = await supabase
    .from('ai_chef_conversations')
    .select('id, title, messages, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error || !data) return []

  return (data as { id: string; title: string | null; messages: UIMessage[]; created_at: string; updated_at: string }[]).map((row) => {
    const msgs = row.messages || []
    const firstUserMsg = msgs.find((m) => m.role === 'user')
    const firstText = firstUserMsg?.parts
      ?.filter((p: { type: string }) => p.type === 'text')
      .map((p: { type: string; text?: string }) => p.text || '')
      .join(' ')

    let title = row.title
    if (!title && firstText) {
      title = firstText.length > 60 ? firstText.slice(0, 57) + '...' : firstText
    }

    return {
      id: row.id,
      title: title || 'Untitled conversation',
      messageCount: msgs.length,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    }
  })
}

export async function deleteConversation(chatId: string): Promise<boolean> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) return false

  const { error } = await supabase
    .from('ai_chef_conversations')
    .delete()
    .eq('id', chatId)

  if (error) {
    console.error('[AI Chef] Error deleting conversation:', error)
    return false
  }
  return true
}
