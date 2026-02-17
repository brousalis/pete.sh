'use client'

import { useState } from 'react'
import { CalendarPlus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCooking } from '@/hooks/use-cooking-data'
import { useToast } from '@/hooks/use-toast'
import { format, addDays } from 'date-fns'
import type { DayOfWeek } from '@/lib/types/cooking.types'

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

interface AddToMealPlanPopoverProps {
  recipeId: string
  recipeName: string
  children?: React.ReactNode
  variant?: 'icon' | 'button'
  onAdded?: () => void
}

export function AddToMealPlanPopover({
  recipeId,
  recipeName,
  children,
  variant = 'icon',
  onAdded,
}: AddToMealPlanPopoverProps) {
  const { currentWeek, mealPlan, updateMealSlot } = useCooking()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null)

  const handleMealSelect = async (mealType: string) => {
    if (!selectedDay) return
    await updateMealSlot(selectedDay, mealType, recipeId)
    toast({
      title: 'Added to meal plan',
      description: `${recipeName} → ${selectedDay} ${mealType}`,
    })
    setOpen(false)
    setSelectedDay(null)
    onAdded?.()
  }

  const getMealForSlot = (day: DayOfWeek, mealType: string): string | undefined => {
    const dayMeals = mealPlan?.meals[day]
    if (!dayMeals) return undefined
    return dayMeals[mealType as keyof typeof dayMeals]
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            variant={variant === 'icon' ? 'ghost' : 'outline'}
            size={variant === 'icon' ? 'icon' : 'sm'}
            className={variant === 'icon' ? 'size-8' : ''}
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarPlus className="size-4" />
            {variant === 'button' && <span className="ml-1.5">Add to Plan</span>}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Add to Meal Plan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(currentWeek, 'MMM d')} -{' '}
              {format(addDays(currentWeek, 6), 'MMM d')}
            </p>
          </div>

          {!selectedDay ? (
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day, i) => {
                const dayDate = addDays(currentWeek, i)
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-center hover:bg-muted transition-colors"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {format(dayDate, 'EEE')}
                    </span>
                    <span className="text-sm font-medium">
                      {format(dayDate, 'd')}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs capitalize">
                  {selectedDay}
                </Badge>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Change day
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {MEAL_TYPES.map((mealType) => {
                  const existing = getMealForSlot(selectedDay, mealType)
                  const isThisRecipe = existing === recipeId
                  return (
                    <button
                      key={mealType}
                      onClick={() => handleMealSelect(mealType)}
                      className={`flex items-center gap-1.5 rounded-lg border p-2 text-left text-xs transition-colors ${
                        isThisRecipe
                          ? 'border-primary/50 bg-primary/5 text-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {isThisRecipe && <Check className="size-3 shrink-0" />}
                      <div className="min-w-0">
                        <span className="font-medium capitalize block">
                          {mealType}
                        </span>
                        {existing && !isThisRecipe && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            Has recipe
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
