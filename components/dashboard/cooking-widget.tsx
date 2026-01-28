'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChefHat, UtensilsCrossed, Calendar, ShoppingCart, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiGet } from '@/lib/api/client'
import type { MealPlan, Recipe } from '@/lib/types/cooking.types'
import { format } from 'date-fns'

export function CookingWidget() {
  const [todayMeals, setTodayMeals] = useState<{ breakfast?: string; lunch?: string; dinner?: string }>({})
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodayMeals()
  }, [])

  const fetchTodayMeals = async () => {
    setLoading(true)
    try {
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay() + 1) // Monday

      const [mealPlanRes, recipesRes] = await Promise.all([
        apiGet<MealPlan>(`/api/cooking/meal-plans?week_start=${weekStart.toISOString()}`),
        apiGet<Recipe[]>('/api/cooking/recipes?is_favorite=true'),
      ])

      if (mealPlanRes.success && mealPlanRes.data) {
        setMealPlan(mealPlanRes.data)
        const dayName = format(today, 'EEEE').toLowerCase() as keyof typeof mealPlanRes.data.meals
        const dayMeals = mealPlanRes.data.meals[dayName]
        if (dayMeals) {
          setTodayMeals({
            breakfast: dayMeals.breakfast,
            lunch: dayMeals.lunch,
            dinner: dayMeals.dinner,
          })
        }
      }

      if (recipesRes.success && recipesRes.data) {
        setRecipes(recipesRes.data)
      }
    } catch (error) {
      console.error('Failed to fetch cooking data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRecipeName = (recipeId: string | undefined): string => {
    if (!recipeId) return ''
    const recipe = recipes.find((r) => r.id === recipeId)
    return recipe?.name || 'No recipe'
  }

  const hasMeals = todayMeals.breakfast || todayMeals.lunch || todayMeals.dinner

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-5 rounded bg-muted" />
          <div className="h-5 w-20 rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-12 rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChefHat className="size-5 text-orange-500" />
          <h2 className="font-semibold">Cooking</h2>
        </div>
        <Link href="/cooking">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
            View
            <ChevronRight className="size-3" />
          </Button>
        </Link>
      </div>

      {/* Today's Meals */}
      {hasMeals ? (
        <div className="space-y-2">
          {todayMeals.breakfast && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <UtensilsCrossed className="size-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-0.5">Breakfast</div>
                <div className="text-sm font-medium truncate">{getRecipeName(todayMeals.breakfast)}</div>
              </div>
            </div>
          )}
          {todayMeals.lunch && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-blue-500/5 border-blue-500/20">
              <UtensilsCrossed className="size-4 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-0.5">Lunch</div>
                <div className="text-sm font-medium truncate">{getRecipeName(todayMeals.lunch)}</div>
              </div>
            </div>
          )}
          {todayMeals.dinner && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-purple-500/5 border-purple-500/20">
              <UtensilsCrossed className="size-4 text-purple-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-0.5">Dinner</div>
                <div className="text-sm font-medium truncate">{getRecipeName(todayMeals.dinner)}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">No meals planned for today</p>
          <Link href="/cooking">
            <Button variant="outline" size="sm">
              Plan Meals
            </Button>
          </Link>
        </div>
      )}

      {/* Quick stats */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
        <span>Favorites: {recipes.length}</span>
        <Link href="/cooking" className="hover:text-foreground transition-colors">
          Meal Plan →
        </Link>
      </div>
    </div>
  )
}
