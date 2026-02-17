'use client'

import { Button } from '@/components/ui/button'
import type { DayOfWeek, MealPlan, Recipe } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { format, isSameDay } from 'date-fns'
import {
  Ban,
  ChevronRight,
  Coffee,
  CookingPot,
  Sandwich,
  UtensilsCrossed,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

interface CalendarMealPlanSidebarProps {
  mealPlan: MealPlan | null
  recipes: Recipe[]
  selectedDate: Date | null
  loading?: boolean
}

const MEAL_SLOTS = [
  { key: 'breakfast' as const, label: 'Breakfast', icon: Coffee },
  { key: 'lunch' as const, label: 'Lunch', icon: Sandwich },
  { key: 'dinner' as const, label: 'Dinner', icon: CookingPot },
  { key: 'snack' as const, label: 'Snack', icon: Coffee },
]

function getDayOfWeekFromDate(date: Date): DayOfWeek {
  const dayMap: Record<number, DayOfWeek> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  }
  return dayMap[date.getDay()] as DayOfWeek
}

export function CalendarMealPlanSidebar({
  mealPlan,
  recipes,
  selectedDate,
  loading = false,
}: CalendarMealPlanSidebarProps) {
  const viewDate = selectedDate || new Date()
  const isToday = isSameDay(viewDate, new Date())
  const dayOfWeek = getDayOfWeekFromDate(viewDate)

  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>()
    recipes.forEach(r => map.set(r.id, r))
    return map
  }, [recipes])

  const dayMeals = mealPlan?.meals[dayOfWeek]

  // Determine which meal slots have recipes
  const filledSlots = useMemo(() => {
    if (!dayMeals) return []
    return MEAL_SLOTS.filter(
      slot => dayMeals[slot.key] && !dayMeals.skipped
    ).map(slot => ({
      ...slot,
      recipe: recipeMap.get(dayMeals[slot.key]!),
    }))
  }, [dayMeals, recipeMap])

  // Calculate total calories for the day
  const totalCalories = useMemo(() => {
    return filledSlots.reduce((sum, slot) => {
      return sum + (slot.recipe?.calories_per_serving || 0)
    }, 0)
  }, [filledSlots])

  if (loading) {
    return (
      <div className="border-border/50 bg-card flex flex-col overflow-hidden rounded-xl border">
        <div className="border-border/50 flex items-center gap-2 border-b px-3 py-2">
          <UtensilsCrossed className="text-muted-foreground size-4" />
          <span className="text-xs font-semibold">Meals</span>
        </div>
        <div className="flex items-center justify-center p-6">
          <span className="text-muted-foreground text-xs">Loading...</span>
        </div>
      </div>
    )
  }

  if (!mealPlan) {
    return (
      <div className="border-border/50 bg-card flex flex-col overflow-hidden rounded-xl border">
        <div className="border-border/50 flex items-center gap-2 border-b px-3 py-2">
          <UtensilsCrossed className="text-muted-foreground size-4" />
          <span className="text-xs font-semibold">Meals</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
          <UtensilsCrossed className="text-muted-foreground/50 size-5" />
          <span className="text-muted-foreground text-[11px]">
            No meal plan this week
          </span>
          <Link href="/cooking">
            <Button variant="outline" size="sm" className="h-6 text-[10px]">
              Plan Meals
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="border-border/50 bg-card flex flex-col overflow-hidden rounded-xl border">
      {/* Header */}
      <div className="border-border/50 flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-teal-500/10">
            <UtensilsCrossed className="size-3.5 text-teal-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold">
              {isToday ? 'Today' : format(viewDate, 'EEE, MMM d')}
            </span>
            {totalCalories > 0 && (
              <span className="text-muted-foreground text-[10px]">
                ~{totalCalories} cal
              </span>
            )}
          </div>
        </div>
        <Link href="/cooking">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
          >
            View
            <ChevronRight className="size-3" />
          </Button>
        </Link>
      </div>

      {/* Meals for the day */}
      <div className="flex flex-col gap-1 px-3 py-2">
        {dayMeals?.skipped ? (
          <div className="flex items-center gap-2 rounded-md bg-slate-500/10 px-2 py-1.5">
            <Ban className="size-3.5 text-slate-500" />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Skipped
              </span>
              {dayMeals.skip_note && (
                <p className="text-muted-foreground truncate text-[10px]">
                  {dayMeals.skip_note}
                </p>
              )}
            </div>
          </div>
        ) : filledSlots.length > 0 ? (
          filledSlots.map(slot => {
            const SlotIcon = slot.icon
            return (
              <div
                key={slot.key}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                  'bg-teal-500/5 dark:bg-teal-500/10'
                )}
              >
                <SlotIcon className="size-3.5 text-teal-600 dark:text-teal-400" />
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground text-[9px] uppercase tracking-wider">
                    {slot.label}
                  </span>
                  <p className="truncate text-[11px] font-medium">
                    {slot.recipe?.name || 'Unknown recipe'}
                  </p>
                </div>
                {slot.recipe?.calories_per_serving && (
                  <span className="text-muted-foreground shrink-0 text-[9px]">
                    {slot.recipe.calories_per_serving} cal
                  </span>
                )}
              </div>
            )
          })
        ) : (
          <div className="flex items-center justify-center py-2">
            <span className="text-muted-foreground text-[11px]">
              No meals planned
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
