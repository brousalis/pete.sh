'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useCooking } from '@/hooks/use-cooking-data'
import { useToast } from '@/hooks/use-toast'
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations'
import type { DayOfWeek } from '@/lib/types/cooking.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import {
    addDays,
    addWeeks,
    format,
    isToday,
    startOfWeek,
    subWeeks
} from 'date-fns'
import { motion } from 'framer-motion'
import {
    Calendar as CalendarIcon,
    ChefHat,
    ChevronLeft,
    ChevronRight,
    Flame,
    Plus,
    ShoppingCart,
    X
} from 'lucide-react'
import { useState } from 'react'
import { RecipePicker } from './recipe-picker'

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const MEAL_COLORS = {
  breakfast: 'border-amber-500/30 bg-amber-500/5',
  lunch: 'border-blue-500/30 bg-blue-500/5',
  dinner: 'border-purple-500/30 bg-purple-500/5',
  snack: 'border-green-500/30 bg-green-500/5',
} as const

interface MealPlanCalendarProps {
  onRecipeClick?: (recipeId: string) => void
  onGenerateShoppingList?: () => void
}

export function MealPlanCalendar({
  onRecipeClick,
  onGenerateShoppingList,
}: MealPlanCalendarProps) {
  const {
    currentWeek,
    setCurrentWeek,
    mealPlan,
    mealPlanLoading,
    updateMealSlot,
    getRecipeById,
    getRecipeName,
  } = useCooking()
  const { toast } = useToast()

  const [pickerSlot, setPickerSlot] = useState<{
    day: DayOfWeek
    meal: string
  } | null>(null)

  const handlePreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const handleThisWeek = () =>
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const handleMealSelect = async (recipeId: string) => {
    if (!pickerSlot) return
    await updateMealSlot(
      pickerSlot.day,
      pickerSlot.meal,
      recipeId || null
    )
    setPickerSlot(null)
  }

  const handleRemoveMeal = async (day: DayOfWeek, mealType: string) => {
    await updateMealSlot(day, mealType, null)
  }

  // Count planned meals for the week
  const plannedMealsCount = DAYS.reduce((count, day) => {
    const dayMeals = mealPlan?.meals[day]
    if (!dayMeals) return count
    return (
      count +
      MEAL_TYPES.filter(
        (mt) => dayMeals[mt as keyof typeof dayMeals]
      ).length
    )
  }, 0)

  // Calculate daily calories if nutrition data is available
  const getDayCalories = (day: DayOfWeek): number | null => {
    const dayMeals = mealPlan?.meals[day]
    if (!dayMeals) return null
    let total = 0
    let hasData = false
    MEAL_TYPES.forEach((mt) => {
      const recipeId = dayMeals[mt as keyof typeof dayMeals]
      if (recipeId) {
        const recipe = getRecipeById(recipeId)
        if (recipe?.calories_per_serving) {
          total += recipe.calories_per_serving
          hasData = true
        }
      }
    })
    return hasData ? total : null
  }

  if (mealPlanLoading) {
    return <MealPlanSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={handlePreviousWeek}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {format(currentWeek, 'MMM d')} –{' '}
              {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
            </span>
          </div>
          <Button variant="outline" size="icon" className="size-8" onClick={handleNextWeek}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={handleThisWeek}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {plannedMealsCount} meals planned
          </Badge>
          {onGenerateShoppingList && plannedMealsCount > 0 && (
            <Button size="sm" className="h-8" onClick={onGenerateShoppingList}>
              <ShoppingCart className="size-3.5 mr-1.5" />
              Shopping List
            </Button>
          )}
        </div>
      </div>

      {/* Week grid */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7"
      >
        {DAYS.map((day, dayIndex) => {
          const dayDate = addDays(currentWeek, dayIndex)
          const dayMeals = mealPlan?.meals[day]
          const isDayToday = isToday(dayDate)
          const dayCalories = getDayCalories(day)

          return (
            <motion.div key={day} variants={staggerItemVariants}>
              <Card
                className={cn(
                  'transition-shadow hover:shadow-md',
                  isDayToday && 'ring-2 ring-primary/30'
                )}
              >
                <CardContent className="p-3">
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isDayToday
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        )}
                      >
                        {format(dayDate, 'EEE')}
                      </span>
                      <span
                        className={cn(
                          'text-lg font-bold block leading-tight',
                          isDayToday && 'text-primary'
                        )}
                      >
                        {format(dayDate, 'd')}
                      </span>
                    </div>
                    {dayCalories && (
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-0.5 h-5"
                      >
                        <Flame className="size-2.5 text-orange-500" />
                        {dayCalories}
                      </Badge>
                    )}
                  </div>

                  {/* Meal slots */}
                  <div className="space-y-1.5">
                    {MEAL_TYPES.map((mealType) => {
                      const recipeId =
                        dayMeals?.[mealType as keyof typeof dayMeals]
                      const recipe = recipeId
                        ? getRecipeById(recipeId)
                        : null

                      if (recipe) {
                        return (
                          <div
                            key={mealType}
                            className={cn(
                              'group relative flex items-center gap-2 rounded-lg border p-1.5 cursor-pointer transition-colors',
                              MEAL_COLORS[mealType]
                            )}
                            onClick={() => onRecipeClick?.(recipe.id)}
                          >
                            {resolveRecipeImageUrl(recipe.image_url) ? (
                              <img
                                src={resolveRecipeImageUrl(recipe.image_url)}
                                alt=""
                                className="size-7 rounded object-cover shrink-0"
                              />
                            ) : (
                              <div className="size-7 rounded bg-muted flex items-center justify-center shrink-0">
                                <ChefHat className="size-3 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-muted-foreground capitalize block">
                                {mealType}
                              </span>
                              <span className="text-[11px] font-medium leading-tight line-clamp-1 block">
                                {recipe.name}
                              </span>
                            </div>
                            <button
                              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-0.5 hover:bg-background/80"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveMeal(day, mealType)
                              }}
                            >
                              <X className="size-3 text-muted-foreground" />
                            </button>
                          </div>
                        )
                      }

                      return (
                        <Popover
                          key={mealType}
                          open={
                            pickerSlot?.day === day &&
                            pickerSlot?.meal === mealType
                          }
                          onOpenChange={(open) => {
                            if (!open) setPickerSlot(null)
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              className="flex w-full items-center gap-2 rounded-lg border border-dashed p-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/50"
                              onClick={() =>
                                setPickerSlot({ day, meal: mealType })
                              }
                            >
                              <Plus className="size-3" />
                              <span className="capitalize">{mealType}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-72 p-0"
                            align="start"
                          >
                            <RecipePicker
                              onSelect={handleMealSelect}
                              onClose={() => setPickerSlot(null)}
                              selectedId={recipeId || undefined}
                            />
                          </PopoverContent>
                        </Popover>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

function MealPlanSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-10 w-12" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
