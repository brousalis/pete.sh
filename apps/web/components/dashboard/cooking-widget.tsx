'use client'

import { DashboardCardHeader } from '@/components/dashboard/dashboard-card-header'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGet } from '@/lib/api/client'
import type { MealPlan, Recipe, ShoppingList } from '@/lib/types/cooking.types'
import { format } from 'date-fns'
import { ChefHat, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function CookingWidget() {
  const [todayMeals, setTodayMeals] = useState<{
    breakfast?: string
    lunch?: string
    dinner?: string
  }>({})
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [shoppingProgress, setShoppingProgress] = useState<{
    total: number
    checked: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay() + 1)

      const [mealPlanRes, recipesRes] = await Promise.all([
        apiGet<MealPlan>(
          `/api/cooking/meal-plans?week_start=${weekStart.toISOString()}`
        ),
        apiGet<Recipe[]>('/api/cooking/recipes'),
      ])

      if (recipesRes.success && recipesRes.data) {
        setRecipes(recipesRes.data)
      }

      if (mealPlanRes.success && mealPlanRes.data) {
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

        // Fetch shopping list progress
        try {
          const shopRes = await apiGet<ShoppingList>(
            `/api/cooking/meal-plans/${mealPlanRes.data.id}/shopping-list`
          )
          if (shopRes.success && shopRes.data) {
            const hiddenCount = (shopRes.data.hidden_items || []).length
            const checkedCount = (shopRes.data.checked_items || []).length
            setShoppingProgress({
              total: Math.max(0, shopRes.data.items.length - hiddenCount),
              checked: checkedCount,
            })
          }
        } catch {
          // Shopping list may not exist
        }
      }
    } catch (error) {
      console.error('Failed to fetch cooking data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRecipeName = (recipeId: string | undefined): string => {
    if (!recipeId) return ''
    return recipes.find((r) => r.id === recipeId)?.name || ''
  }

  const hasMeals =
    todayMeals.breakfast || todayMeals.lunch || todayMeals.dinner

  if (loading) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
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
            <MealRow
              label="Breakfast"
              name={getRecipeName(todayMeals.breakfast)}
              colorClass="border-amber-500/20 bg-amber-500/5"
              iconColor="text-amber-500"
            />
          )}
          {todayMeals.lunch && (
            <MealRow
              label="Lunch"
              name={getRecipeName(todayMeals.lunch)}
              colorClass="border-blue-500/20 bg-blue-500/5"
              iconColor="text-blue-500"
            />
          )}
          {todayMeals.dinner && (
            <MealRow
              label="Dinner"
              name={getRecipeName(todayMeals.dinner)}
              colorClass="border-purple-500/20 bg-purple-500/5"
              iconColor="text-purple-500"
            />
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

      {/* Shopping list progress */}
      {shoppingProgress && shoppingProgress.total > 0 && (
        <Link href="/cooking" className="block">
          <div className="mt-3 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Shopping List</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {shoppingProgress.checked}/{shoppingProgress.total}
              </span>
            </div>
            <Progress
              value={
                (shoppingProgress.checked / shoppingProgress.total) * 100
              }
              className="h-1.5"
            />
          </div>
        </Link>
      )}

      {/* Footer */}
      <div className="text-muted-foreground mt-3 flex items-center justify-between border-t pt-3 text-xs">
        <span>{recipes.filter((r) => r.is_favorite).length} favorites</span>
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

function MealRow({
  label,
  name,
  colorClass,
  iconColor,
}: {
  label: string
  name: string
  colorClass: string
  iconColor: string
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-2.5 ${colorClass}`}
    >
      <UtensilsCrossed className={`size-4 shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground mb-0.5 text-xs">{label}</div>
        <div className="truncate text-sm font-medium">{name}</div>
      </div>
    </div>
  )
}
