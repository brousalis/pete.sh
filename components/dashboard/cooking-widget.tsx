'use client'

import { DashboardCardHeader } from '@/components/dashboard/dashboard-card-header'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api/client'
import type { MealPlan, Recipe } from '@/lib/types/cooking.types'
import { format } from 'date-fns'
import { ChefHat, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function CookingWidget() {
  const [todayMeals, setTodayMeals] = useState<{
    breakfast?: string
    lunch?: string
    dinner?: string
  }>({})
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
        apiGet<MealPlan>(
          `/api/cooking/meal-plans?week_start=${weekStart.toISOString()}`
        ),
        apiGet<Recipe[]>('/api/cooking/recipes?is_favorite=true'),
      ])

      if (mealPlanRes.success && mealPlanRes.data) {
        setMealPlan(mealPlanRes.data)
        const dayName = format(
          today,
          'EEEE'
        ).toLowerCase() as keyof typeof mealPlanRes.data.meals
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
    const recipe = recipes.find(r => r.id === recipeId)
    return recipe?.name || 'No recipe'
  }

  const hasMeals = todayMeals.breakfast || todayMeals.lunch || todayMeals.dinner

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-4 flex items-center gap-2">
          <div className="bg-muted size-5 rounded" />
          <div className="bg-muted h-5 w-20 rounded" />
        </div>
        <div className="space-y-2">
          <div className="bg-muted h-12 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <DashboardCardHeader
        icon={<ChefHat className="size-5 text-orange-500" />}
        iconContainerClassName="bg-orange-500/10"
        title="Cooking"
        viewHref="/cooking"
        viewLabel="View"
      />

      {/* Today's Meals */}
      {hasMeals ? (
        <div className="space-y-2">
          {todayMeals.breakfast && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
              <UtensilsCrossed className="size-4 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <div className="text-muted-foreground mb-0.5 text-xs">
                  Breakfast
                </div>
                <div className="truncate text-sm font-medium">
                  {getRecipeName(todayMeals.breakfast)}
                </div>
              </div>
            </div>
          )}
          {todayMeals.lunch && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5">
              <UtensilsCrossed className="size-4 shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1">
                <div className="text-muted-foreground mb-0.5 text-xs">
                  Lunch
                </div>
                <div className="truncate text-sm font-medium">
                  {getRecipeName(todayMeals.lunch)}
                </div>
              </div>
            </div>
          )}
          {todayMeals.dinner && (
            <div className="flex items-center gap-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-2.5">
              <UtensilsCrossed className="size-4 shrink-0 text-purple-500" />
              <div className="min-w-0 flex-1">
                <div className="text-muted-foreground mb-0.5 text-xs">
                  Dinner
                </div>
                <div className="truncate text-sm font-medium">
                  {getRecipeName(todayMeals.dinner)}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-muted-foreground mb-2 text-sm">
            No meals planned for today
          </p>
          <Link href="/cooking">
            <Button variant="outline" size="sm">
              Plan Meals
            </Button>
          </Link>
        </div>
      )}

      {/* Quick stats */}
      <div className="text-muted-foreground mt-4 flex items-center justify-between border-t pt-3 text-xs">
        <span>Favorites: {recipes.length}</span>
        <Link
          href="/cooking"
          className="hover:text-foreground transition-colors"
        >
          Meal Plan →
        </Link>
      </div>
    </div>
  )
}
