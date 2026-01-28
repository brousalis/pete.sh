'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPost, apiPut } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import type { MealPlan, Recipe, DayOfWeek } from '@/lib/types/cooking.types'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export function MealPlanCalendar() {
  const { toast } = useToast()
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMealPlan()
    fetchRecipes()
  }, [currentWeek])

  const fetchMealPlan = async () => {
    setLoading(true)
    try {
      const response = await apiGet<MealPlan>(
        `/api/cooking/meal-plans?week_start=${currentWeek.toISOString()}`
      )

      if (response.success && response.data) {
        setMealPlan(response.data)
      } else {
        setMealPlan(null)
      }
    } catch (error) {
      console.error('Failed to fetch meal plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecipes = async () => {
    try {
      const response = await apiGet<Recipe[]>('/api/cooking/recipes')
      if (response.success && response.data) {
        setRecipes(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
    }
  }

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1))
  }

  const handleMealChange = async (day: DayOfWeek, mealType: string, recipeId: string | null) => {
    if (!mealPlan) {
      // Create new meal plan
      const newMeals = {
        [day]: {
          [mealType]: recipeId || undefined,
        },
      }

      try {
        const response = await apiPost<MealPlan>('/api/cooking/meal-plans', {
          week_start_date: currentWeek.toISOString(),
          meals: newMeals,
        })

        if (response.success && response.data) {
          setMealPlan(response.data)
          toast({
            title: 'Success',
            description: 'Meal plan created',
          })
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save meal plan',
          variant: 'destructive',
        })
      }
    } else {
      // Update existing meal plan
      const updatedMeals = {
        ...mealPlan.meals,
        [day]: {
          ...mealPlan.meals[day],
          [mealType]: recipeId || undefined,
        },
      }

      try {
        const response = await apiPut<MealPlan>(`/api/cooking/meal-plans/${mealPlan.id}`, {
          meals: updatedMeals,
        })

        if (response.success && response.data) {
          setMealPlan(response.data)
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to update meal plan',
          variant: 'destructive',
        })
      }
    }
  }

  const getRecipeName = (recipeId: string | undefined): string => {
    if (!recipeId) return ''
    const recipe = recipes.find((r) => r.id === recipeId)
    return recipe?.name || ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">Loading meal plan...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className="font-medium">
              {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
        >
          This Week
        </Button>
      </div>

      {/* Meal plan grid */}
      <div className="grid gap-4">
        {DAYS.map((day) => {
          const dayDate = addDays(currentWeek, DAYS.indexOf(day))
          const dayMeals = mealPlan?.meals[day]

          return (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-base">
                  {format(dayDate, 'EEEE, MMM d')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {MEAL_TYPES.map((mealType) => (
                    <div key={mealType} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground capitalize">
                        {mealType}
                      </label>
                      <Select
                        value={dayMeals?.[mealType] || ''}
                        onValueChange={(value) =>
                          handleMealChange(day, mealType, value || null)
                        }
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select recipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {recipes.map((recipe) => (
                            <SelectItem key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {dayMeals?.[mealType] && (
                        <Badge variant="secondary" className="text-[10px]">
                          {getRecipeName(dayMeals[mealType])}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
