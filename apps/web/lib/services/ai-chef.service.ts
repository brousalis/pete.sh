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
  RecipeHintsSchema,
  WeekPlanSuggestionSchema,
  type ConversationSummary,
  type CookingPreferences,
  type RecipeHints,
} from '@/lib/types/ai-chef.types'
import type { DayMeals, DayOfWeek, MealPlan, Recipe, WeeklyMeals } from '@/lib/types/cooking.types'

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
    if (recipes.length === 0) return 'No recipes in the catalog yet.'

    const custom = recipes.filter((r: Recipe) => r.source === 'custom')
    const tj = recipes.filter((r: Recipe) => r.source === 'trader_joes')

    function formatRecipe(r: Recipe): string {
      const parts = [`- "${r.name}"`]
      parts.push(`[id: ${r.id}]`)
      if (r.source === 'trader_joes') parts.push('[TJ]')
      if (r.difficulty) parts.push(`(${r.difficulty})`)
      if (r.prep_time || r.cook_time) {
        const total = (r.prep_time || 0) + (r.cook_time || 0)
        parts.push(`${total}min`)
      }
      if (r.tags?.length) parts.push(`tags: ${r.tags.join(', ')}`)
      if (r.is_favorite) parts.push('★ favorite')
      if (r.calories_per_serving) parts.push(`${r.calories_per_serving}cal`)
      if (r.protein_g) parts.push(`${r.protein_g}g protein`)
      if (r.nutrition_category?.length) parts.push(`[${r.nutrition_category.join(', ')}]`)
      return parts.join(' ')
    }

    const lines: string[] = [`${recipes.length} total recipes (${custom.length} custom, ${tj.length} Trader Joe's).\n`]

    if (custom.length > 0) {
      lines.push('### Custom Recipes')
      lines.push(...custom.map(formatRecipe))
      lines.push('')
    }

    if (tj.length > 0) {
      lines.push(`### Trader Joe's Recipes (${tj.length})`)
      lines.push(...tj.map(formatRecipe))
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
    const recipeMap = new Map(recipes.map((r: Recipe) => [r.id, r]))

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

async function getRecentMealPlansContext(weeks: number = 4): Promise<string> {
  try {
    const plans = await mealPlanningService.getRecentMealPlans(weeks)
    if (plans.length === 0) return 'No recent meal plan history.'

    const recipes = await cookingService.getRecipes()
    const recipeMap = new Map(recipes.map((r: Recipe) => [r.id, r]))

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
    getRecentMealPlansContext(4),
    getFridgeContext(),
  ])

  const sections: string[] = []

  sections.push(`## Food Preferences
Dislikes: ${preferences.dislikes.length > 0 ? preferences.dislikes.join(', ') : 'none specified'}
Allergies: ${preferences.allergies.length > 0 ? preferences.allergies.join(', ') : 'none'}
Dietary: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'no restrictions'}
Preferred Cuisines: ${preferences.cuisinePreferences.length > 0 ? preferences.cuisinePreferences.join(', ') : 'open to anything'}
Household Size: ${preferences.householdSize} people
Weeknight Cooking Time: ${preferences.cookingTimePreference}
Notes: ${preferences.notes || 'none'}`)

  sections.push(`## Current Week's Meal Plan\n${currentPlan}`)

  sections.push(`## Recent Meal Plans (for variety — avoid repeats)\n${recentPlans}`)

  sections.push(`## Recipe Catalog (custom + Trader Joe's)\n${recipeCatalog}`)

  sections.push(`## Current Fridge Contents\n${fridge}`)

  return sections.join('\n\n---\n\n')
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
  const modelMessages = await convertToModelMessages(uiMessages)

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

export async function createChatStream(
  uiMessages: UIMessage[],
  systemContext: string
) {
  const model = getModel()
  const modelMessages = await convertToModelMessages(uiMessages)

  return streamText({
    model,
    system: `You are an expert AI Chef and meal planning assistant embedded in the user's cooking dashboard. You have full access to their recipe catalog (both custom recipes and Trader Joe's recipes), meal plan history, food preferences, and fridge contents.

Your personality is warm, helpful, and practical — like a knowledgeable friend who loves cooking. Be specific: reference actual recipe names, prep times, and ingredients from the data.

## IMPORTANT: Tool Usage Workflow

The user's food preferences, current meal plan, recent meal plans, and the full recipe catalog (names + IDs, grouped by source) are ALREADY provided below in the context data. You do NOT need to call tools to read data that is already here.

When the user asks you to **plan a week or suggest meals**:
1. Review the context data already provided (preferences, recent plans, recipe catalog)
2. Pick recipes from the catalog — recipes marked [TJ] are from Trader Joe's (quick, accessible options). Mix in TJ recipes alongside custom recipes for variety.
3. If you want more details about a recipe before suggesting it, use searchRecipes with the recipe name as the query.
4. Call the **suggestWeekPlan** tool with your complete plan — this is REQUIRED. Do NOT just describe meals in text. The suggestWeekPlan tool renders a beautiful card in the UI with an "Apply All" button.

When the user asks **questions about recipes** (e.g. "what greek recipes do we have", "suggest something with chicken"):
1. Check the catalog in the context data first
2. Use searchRecipes to find matching recipes by ingredient, cuisine, or keyword
3. Provide helpful details: describe the recipes, compare options, and suggest how to use them

When the user asks to **change a specific day**:
1. Use setMealSlot directly with the recipe ID and day

CRITICAL: Always finish with an ACTION tool (suggestWeekPlan or setMealSlot) when the user asks to plan or set meals. Never stop after only calling read-only tools.

## Core Principles
- ALWAYS respect food dislikes and allergies — never suggest recipes with disliked or allergenic ingredients
- Ensure weekly variety — check the "Recent Meal Plans" section and avoid repeating those recipes
- Balance the week: quick weeknight meals (Mon-Thu) with more involved weekend cooking (Fri-Sun)
- Consider prep time preferences: on weeknights, favor meals within the user's time preference
- Factor in nutrition when possible (calories, protein, etc.)
- If the fridge has items, try to suggest meals that use them before they expire
- Actively use Trader Joe's recipes — they are quick, accessible options from a nearby store

Today's date: ${getLocalDateString()}
Day of week: ${getDayOfWeek()}

${systemContext}`,
    messages: modelMessages,
    stopWhen: stepCountIs(8),
    experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
    tools: {
      searchRecipes: tool({
        description:
          'Search recipes by name, tags, ingredients, or cuisine. Returns full details including description and ingredients. Recipe names and IDs are already in the context for quick reference, but use this tool to get full details or to search by ingredient/description.',
        inputSchema: z.object({
          query: z.string().optional().describe('Search query (matches name, description, tags)'),
          source: z.enum(['all', 'custom', 'trader_joes']).default('all').describe('Filter by source: custom (user recipes), trader_joes (TJ recipes), or all'),
        }),
        execute: async ({ query, source }) => {
          const filters: { search?: string; source?: 'custom' | 'trader_joes' } = {}
          if (query) filters.search = query
          if (source !== 'all') filters.source = source

          const recipes = await cookingService.getRecipes(filters)
          const results: string[] = []

          for (const r of recipes.slice(0, 30)) {
            const totalTime = (r.prep_time || 0) + (r.cook_time || 0)
            const tag = r.source === 'trader_joes' ? '[TJ]' : '[USER]'
            results.push(
              `${tag} "${r.name}" [id:${r.id}]` +
              (totalTime ? ` | ${totalTime}min` : '') +
              (r.servings ? ` | serves ${r.servings}` : '') +
              (r.tags?.length ? ` | tags: ${r.tags.join(', ')}` : '') +
              (r.description ? `\n  ${r.description.slice(0, 150)}` : '')
            )
          }

          return results.length > 0
            ? results
            : ['No recipes found matching the query']
        },
      }),

      getCurrentMealPlan: tool({
        description: 'Get the current week\'s meal plan. NOTE: This data is already in the context — only call if you need a refresh after making changes.',
        inputSchema: z.object({}),
        execute: async () => {
          return await getCurrentMealPlanContext()
        },
      }),

      getRecentMealPlans: tool({
        description:
          'Get recent weeks\' meal plans. NOTE: This data is already in the context — only call if you specifically need more weeks than the default 4.',
        inputSchema: z.object({
          weeks: z.number().default(4).describe('Number of weeks to look back'),
        }),
        execute: async ({ weeks }) => {
          return await getRecentMealPlansContext(weeks)
        },
      }),

      getFoodPreferences: tool({
        description: 'Get food preferences. NOTE: Preferences are already in the context — only call if you suspect they changed mid-conversation.',
        inputSchema: z.object({}),
        execute: async () => {
          const prefs = await getPreferences()
          return prefs
        },
      }),

      getFridgeContents: tool({
        description: 'Get current fridge contents from the latest scan. NOTE: Fridge data is already in the context.',
        inputSchema: z.object({}),
        execute: async () => {
          return await getFridgeContext()
        },
      }),

      suggestWeekPlan: tool({
        description:
          'REQUIRED when suggesting meals for multiple days. Returns a structured plan that the UI renders as a visual card with recipe details and an "Apply All" button. You MUST call this tool when the user asks to plan a week — do not just describe meals in text.',
        inputSchema: z.object({
          plan: WeekPlanSuggestionSchema.describe('The suggested week plan'),
        }),
        execute: async ({ plan }) => {
          return plan
        },
      }),

      setMealSlot: tool({
        description:
          'Set a specific recipe for a specific day and meal type in the current week\'s meal plan. Use for individual adjustments.',
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
