/**
 * Coffee Config Service
 * Handles database operations for coffee configuration management
 */

import {
  getSupabaseClient,
  getSupabaseServiceClient,
} from '@/lib/supabase/client'
import type {
  BrewMethod,
  CoffeeConfig,
  CoffeeRecipe,
  CoffeeRecommendation,
  CupSize,
  DbCoffeeRecipe,
  DbCoffeeRecommendation,
  DbGoldenRule,
  DbQuickDose,
  DbRoastStrategy,
  GoldenRule,
  QuickDose,
  RoastLevel,
  RoastStrategy,
} from '@/lib/types/coffee.types'

// Transform database row to app type
function dbRecipeToApp(row: DbCoffeeRecipe): CoffeeRecipe {
  return {
    id: row.id,
    method: row.method as BrewMethod,
    cupSize: row.cup_size as CupSize,
    cupSizeLabel: row.cup_size_label,
    waterMl: row.water_ml,
    roast: row.roast as RoastLevel,
    ratio: row.ratio,
    coffee: row.coffee,
    temp: row.temp,
    technique: row.technique,
    switchSetting: row.switch_setting as
      | 'open'
      | 'closed'
      | 'hybrid'
      | undefined,
    moccaSetting: row.mocca_setting as 'half' | 'full' | undefined,
    timingCues: row.timing_cues || [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function dbRoastStrategyToApp(row: DbRoastStrategy): RoastStrategy {
  return {
    id: row.id,
    roast: row.roast as RoastLevel,
    goal: row.goal,
    temp: row.temp,
    technique: row.technique,
    ratio: row.ratio,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function dbQuickDoseToApp(row: DbQuickDose): QuickDose {
  return {
    id: row.id,
    method: row.method as BrewMethod,
    label: row.label,
    grams: row.grams,
    note: row.note || undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function dbGoldenRuleToApp(row: DbGoldenRule): GoldenRule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function dbRecommendationToApp(
  row: DbCoffeeRecommendation
): CoffeeRecommendation {
  return {
    id: row.id,
    name: row.name,
    dayOfWeek: row.day_of_week,
    hourStart: row.hour_start,
    hourEnd: row.hour_end,
    method: row.method as BrewMethod,
    cupSize: row.cup_size as CupSize,
    roast: row.roast as RoastLevel,
    priority: row.priority,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

class CoffeeConfigService {
  /**
   * Get the best client for reads: service role when available, otherwise anon.
   * This matches the pattern used by other working services.
   */
  private getReadClient() {
    return getSupabaseServiceClient() ?? getSupabaseClient()
  }

  /**
   * Get the client for writes: requires service role
   */
  private getWriteClient() {
    return getSupabaseServiceClient() ?? getSupabaseClient()
  }

  // ============================================
  // GET ALL CONFIG
  // ============================================
  async getConfig(): Promise<CoffeeConfig> {
    const [roastStrategies, recipes, quickDoses, goldenRules, recommendations] =
      await Promise.all([
        this.getRoastStrategies(),
        this.getRecipes(),
        this.getQuickDoses(),
        this.getGoldenRules(),
        this.getRecommendations(),
      ])

    return {
      roastStrategies,
      recipes,
      quickDoses,
      goldenRules,
      recommendations,
    }
  }

  // ============================================
  // ROAST STRATEGIES
  // ============================================
  async getRoastStrategies(): Promise<RoastStrategy[]> {
    const supabase = this.getReadClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('coffee_roast_strategies')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching roast strategies:', error)
      throw new Error(`Failed to fetch roast strategies: ${error.message}`)
    }

    return (data as DbRoastStrategy[]).map(dbRoastStrategyToApp)
  }

  async updateRoastStrategy(
    id: string,
    data: Partial<RoastStrategy>
  ): Promise<RoastStrategy | null> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data: updated, error } = await supabase
      .from('coffee_roast_strategies')
      .update({
        goal: data.goal,
        temp: data.temp,
        technique: data.technique,
        ratio: data.ratio,
        sort_order: data.sortOrder,
      } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating roast strategy:', error)
      throw new Error(`Failed to update roast strategy: ${error.message}`)
    }

    return dbRoastStrategyToApp(updated as DbRoastStrategy)
  }

  // ============================================
  // RECIPES
  // ============================================
  async getRecipes(method?: BrewMethod): Promise<CoffeeRecipe[]> {
    const supabase = this.getReadClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    let query = supabase
      .from('coffee_recipes')
      .select('*')
      .order('method', { ascending: true })
      .order('cup_size', { ascending: true })
      .order('roast', { ascending: true })

    if (method) {
      query = query.eq('method', method)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching recipes:', error)
      throw new Error(`Failed to fetch recipes: ${error.message}`)
    }

    return (data as DbCoffeeRecipe[]).map(dbRecipeToApp)
  }

  async getRecipe(id: string): Promise<CoffeeRecipe | null> {
    const supabase = this.getReadClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('coffee_recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching recipe:', error)
      throw new Error(`Failed to fetch recipe: ${error.message}`)
    }

    return dbRecipeToApp(data as DbCoffeeRecipe)
  }

  async createRecipe(
    recipe: Omit<CoffeeRecipe, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CoffeeRecipe> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('coffee_recipes')
      .insert({
        method: recipe.method,
        cup_size: recipe.cupSize,
        cup_size_label: recipe.cupSizeLabel,
        water_ml: recipe.waterMl,
        roast: recipe.roast,
        ratio: recipe.ratio,
        coffee: recipe.coffee,
        temp: recipe.temp,
        technique: recipe.technique,
        switch_setting: recipe.switchSetting || null,
        mocca_setting: recipe.moccaSetting || null,
        timing_cues: recipe.timingCues || [],
        is_active: recipe.isActive ?? true,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Error creating recipe:', error)
      throw new Error(`Failed to create recipe: ${error.message}`)
    }

    return dbRecipeToApp(data as DbCoffeeRecipe)
  }

  async updateRecipe(
    id: string,
    recipe: Partial<CoffeeRecipe>
  ): Promise<CoffeeRecipe> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const updateData: Record<string, unknown> = {}

    if (recipe.method !== undefined) updateData.method = recipe.method
    if (recipe.cupSize !== undefined) updateData.cup_size = recipe.cupSize
    if (recipe.cupSizeLabel !== undefined)
      updateData.cup_size_label = recipe.cupSizeLabel
    if (recipe.waterMl !== undefined) updateData.water_ml = recipe.waterMl
    if (recipe.roast !== undefined) updateData.roast = recipe.roast
    if (recipe.ratio !== undefined) updateData.ratio = recipe.ratio
    if (recipe.coffee !== undefined) updateData.coffee = recipe.coffee
    if (recipe.temp !== undefined) updateData.temp = recipe.temp
    if (recipe.technique !== undefined) updateData.technique = recipe.technique
    if (recipe.switchSetting !== undefined)
      updateData.switch_setting = recipe.switchSetting
    if (recipe.moccaSetting !== undefined)
      updateData.mocca_setting = recipe.moccaSetting
    if (recipe.timingCues !== undefined)
      updateData.timing_cues = recipe.timingCues
    if (recipe.isActive !== undefined) updateData.is_active = recipe.isActive

    const { data, error } = await supabase
      .from('coffee_recipes')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating recipe:', error)
      throw new Error(`Failed to update recipe: ${error.message}`)
    }

    return dbRecipeToApp(data as DbCoffeeRecipe)
  }

  async deleteRecipe(id: string): Promise<void> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { error } = await supabase
      .from('coffee_recipes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting recipe:', error)
      throw new Error(`Failed to delete recipe: ${error.message}`)
    }
  }

  // ============================================
  // QUICK DOSES
  // ============================================
  async getQuickDoses(method?: BrewMethod): Promise<QuickDose[]> {
    const supabase = this.getReadClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    let query = supabase
      .from('coffee_quick_doses')
      .select('*')
      .order('method', { ascending: true })
      .order('sort_order', { ascending: true })

    if (method) {
      query = query.eq('method', method)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching quick doses:', error)
      throw new Error(`Failed to fetch quick doses: ${error.message}`)
    }

    return (data as DbQuickDose[]).map(dbQuickDoseToApp)
  }

  async createQuickDose(
    dose: Omit<QuickDose, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<QuickDose> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('coffee_quick_doses')
      .insert({
        method: dose.method,
        label: dose.label,
        grams: dose.grams,
        note: dose.note || null,
        sort_order: dose.sortOrder ?? 0,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Error creating quick dose:', error)
      throw new Error(`Failed to create quick dose: ${error.message}`)
    }

    return dbQuickDoseToApp(data as DbQuickDose)
  }

  async updateQuickDose(
    id: string,
    dose: Partial<QuickDose>
  ): Promise<QuickDose> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const updateData: Record<string, unknown> = {}

    if (dose.method !== undefined) updateData.method = dose.method
    if (dose.label !== undefined) updateData.label = dose.label
    if (dose.grams !== undefined) updateData.grams = dose.grams
    if (dose.note !== undefined) updateData.note = dose.note
    if (dose.sortOrder !== undefined) updateData.sort_order = dose.sortOrder

    const { data, error } = await supabase
      .from('coffee_quick_doses')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating quick dose:', error)
      throw new Error(`Failed to update quick dose: ${error.message}`)
    }

    return dbQuickDoseToApp(data as DbQuickDose)
  }

  async deleteQuickDose(id: string): Promise<void> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { error } = await supabase
      .from('coffee_quick_doses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting quick dose:', error)
      throw new Error(`Failed to delete quick dose: ${error.message}`)
    }
  }

  // ============================================
  // GOLDEN RULES
  // ============================================
  async getGoldenRules(): Promise<GoldenRule[]> {
    const supabase = this.getReadClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('coffee_golden_rules')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching golden rules:', error)
      throw new Error(`Failed to fetch golden rules: ${error.message}`)
    }

    return (data as DbGoldenRule[]).map(dbGoldenRuleToApp)
  }

  async createGoldenRule(
    rule: Omit<GoldenRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<GoldenRule> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('coffee_golden_rules')
      .insert({
        title: rule.title,
        description: rule.description,
        sort_order: rule.sortOrder ?? 0,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Error creating golden rule:', error)
      throw new Error(`Failed to create golden rule: ${error.message}`)
    }

    return dbGoldenRuleToApp(data as DbGoldenRule)
  }

  async updateGoldenRule(
    id: string,
    rule: Partial<GoldenRule>
  ): Promise<GoldenRule> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const updateData: Record<string, unknown> = {}

    if (rule.title !== undefined) updateData.title = rule.title
    if (rule.description !== undefined)
      updateData.description = rule.description
    if (rule.sortOrder !== undefined) updateData.sort_order = rule.sortOrder

    const { data, error } = await supabase
      .from('coffee_golden_rules')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating golden rule:', error)
      throw new Error(`Failed to update golden rule: ${error.message}`)
    }

    return dbGoldenRuleToApp(data as DbGoldenRule)
  }

  async deleteGoldenRule(id: string): Promise<void> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { error } = await supabase
      .from('coffee_golden_rules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting golden rule:', error)
      throw new Error(`Failed to delete golden rule: ${error.message}`)
    }
  }

  // ============================================
  // RECOMMENDATIONS
  // ============================================
  async getRecommendations(): Promise<CoffeeRecommendation[]> {
    const supabase = this.getReadClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('coffee_recommendations')
      .select('*')
      .order('priority', { ascending: false })

    if (error) {
      console.error('Error fetching recommendations:', error)
      throw new Error(`Failed to fetch recommendations: ${error.message}`)
    }

    return (data as DbCoffeeRecommendation[]).map(dbRecommendationToApp)
  }

  async createRecommendation(
    rec: Omit<CoffeeRecommendation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CoffeeRecommendation> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data, error } = await supabase
      .from('coffee_recommendations')
      .insert({
        name: rec.name,
        day_of_week: rec.dayOfWeek,
        hour_start: rec.hourStart,
        hour_end: rec.hourEnd,
        method: rec.method,
        cup_size: rec.cupSize,
        roast: rec.roast,
        priority: rec.priority,
        is_active: rec.isActive ?? true,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Error creating recommendation:', error)
      throw new Error(`Failed to create recommendation: ${error.message}`)
    }

    return dbRecommendationToApp(data as DbCoffeeRecommendation)
  }

  async updateRecommendation(
    id: string,
    rec: Partial<CoffeeRecommendation>
  ): Promise<CoffeeRecommendation> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const updateData: Record<string, unknown> = {}

    if (rec.name !== undefined) updateData.name = rec.name
    if (rec.dayOfWeek !== undefined) updateData.day_of_week = rec.dayOfWeek
    if (rec.hourStart !== undefined) updateData.hour_start = rec.hourStart
    if (rec.hourEnd !== undefined) updateData.hour_end = rec.hourEnd
    if (rec.method !== undefined) updateData.method = rec.method
    if (rec.cupSize !== undefined) updateData.cup_size = rec.cupSize
    if (rec.roast !== undefined) updateData.roast = rec.roast
    if (rec.priority !== undefined) updateData.priority = rec.priority
    if (rec.isActive !== undefined) updateData.is_active = rec.isActive

    const { data, error } = await supabase
      .from('coffee_recommendations')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating recommendation:', error)
      throw new Error(`Failed to update recommendation: ${error.message}`)
    }

    return dbRecommendationToApp(data as DbCoffeeRecommendation)
  }

  async deleteRecommendation(id: string): Promise<void> {
    const supabase = this.getWriteClient()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { error } = await supabase
      .from('coffee_recommendations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting recommendation:', error)
      throw new Error(`Failed to delete recommendation: ${error.message}`)
    }
  }

  // ============================================
  // RECOMMENDED RECIPE (Time-based)
  // ============================================
  async getRecommendedRecipe(): Promise<{
    method: BrewMethod
    cupSize: CupSize
    roast: RoastLevel
  } | null> {
    const supabase = this.getReadClient()
    if (!supabase) {
      return null
    }

    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay()

    // First try to find a day-specific recommendation
    const { data: specific } = await supabase
      .from('coffee_recommendations')
      .select('*')
      .eq('is_active', true)
      .eq('day_of_week', dayOfWeek)
      .lte('hour_start', hour)
      .gt('hour_end', hour)
      .order('priority', { ascending: false })
      .limit(1)

    if (specific && specific.length > 0) {
      const rec = specific[0] as unknown as DbCoffeeRecommendation
      return {
        method: rec.method as BrewMethod,
        cupSize: rec.cup_size as CupSize,
        roast: rec.roast as RoastLevel,
      }
    }

    // Fall back to any-day recommendations
    const { data: general } = await supabase
      .from('coffee_recommendations')
      .select('*')
      .eq('is_active', true)
      .is('day_of_week', null)
      .lte('hour_start', hour)
      .gt('hour_end', hour)
      .order('priority', { ascending: false })
      .limit(1)

    if (general && general.length > 0) {
      const rec = general[0] as unknown as DbCoffeeRecommendation
      return {
        method: rec.method as BrewMethod,
        cupSize: rec.cup_size as CupSize,
        roast: rec.roast as RoastLevel,
      }
    }

    // Default fallback
    return { method: 'moccamaster', cupSize: '8-cup', roast: 'medium' }
  }
}

export const coffeeConfigService = new CoffeeConfigService()
