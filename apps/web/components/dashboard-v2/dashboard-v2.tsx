'use client'

import { CookCompletionDialog } from '@/components/cooking/cooking-sidebar'
import { RecipePickerDialog } from '@/components/cooking/recipe-picker'
import { CommandBar } from '@/components/dashboard-v2/command-bar'
import { DashboardCalendarSection } from '@/components/dashboard-v2/dashboard-calendar-section'
import { DashboardCookingSection } from '@/components/dashboard-v2/dashboard-cooking-section'
import {
  DashboardV2Provider,
  useDashboardV2,
} from '@/components/dashboard-v2/dashboard-v2-provider'
import { DayFlowMobile } from '@/components/dashboard-v2/day-flow-mobile'
import {
  CommandBarSkeleton,
  WeekHorizonSkeleton,
  WorkoutStageSkeleton,
} from '@/components/dashboard-v2/skeletons'
import { WeekHorizon } from '@/components/dashboard-v2/week-horizon'
import { FitnessPageContent } from '@/components/dashboard/fitness-page-content'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CookingProvider, useCooking } from '@/hooks/use-cooking-data'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { addDays, startOfWeek } from 'date-fns'
import { AnimatePresence } from 'framer-motion'
import { CalendarDays, ChefHat, Dumbbell, MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/** Syncs CookingProvider's currentWeek with dashboard selectedDate */
function CookingWeekSync() {
  const { selectedDate } = useDashboardV2()
  const { setCurrentWeek, currentWeek } = useCooking()
  const targetWeek = startOfWeek(selectedDate, { weekStartsOn: 1 })

  useEffect(() => {
    if (targetWeek.getTime() !== currentWeek.getTime()) {
      setCurrentWeek(targetWeek)
    }
  }, [selectedDate, targetWeek, currentWeek, setCurrentWeek])

  return null
}

function DashboardContent() {
  const {
    loading,
    selectedDate,
    navigateToDay,
    goToToday,
    completeRoutine,
  } = useDashboardV2()

  const [pickerSlot, setPickerSlot] = useState<{
    day: DayOfWeek
    meal: string
  } | null>(null)
  const [skipNoteDay, setSkipNoteDay] = useState<DayOfWeek | null>(null)
  const [skipNoteText, setSkipNoteText] = useState('')
  const [ratingSlot, setRatingSlot] = useState<{
    day: DayOfWeek
    meal: string
    recipeId: string
  } | null>(null)
  const [randomizingDay, setRandomizingDay] = useState<DayOfWeek | null>(null)
  const cooking = useCooking()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          navigateToDay(addDays(selectedDate, -1), 'backward')
          break
        case 'ArrowRight':
          e.preventDefault()
          navigateToDay(addDays(selectedDate, 1), 'forward')
          break
        case 't':
        case 'T':
          e.preventDefault()
          goToToday()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          completeRoutine('morning')
          break
        case 'n':
        case 'N':
          e.preventDefault()
          completeRoutine('night')
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedDate, navigateToDay, goToToday, completeRoutine])

  const handleRecipeClick = (recipeId: string) => {
    cooking.setSelectedRecipeId(recipeId)
  }

  const handleMealSelect = async (recipeId: string) => {
    if (!pickerSlot) return
    await cooking.updateMealSlot(pickerSlot.day, pickerSlot.meal, recipeId)
    setPickerSlot(null)
  }

  const handleMarkCooked = useCallback(
    (day: DayOfWeek, meal: string, recipeId: string) => {
      const existing = cooking.isSlotCompleted(day, meal)
      if (existing) {
        cooking.deleteCompletion(existing.id)
      } else {
        setRatingSlot({ day, meal, recipeId })
      }
    },
    [cooking]
  )

  const handleRatingSubmit = useCallback(
    async (rating?: number, notes?: string) => {
      if (!ratingSlot) return
      await cooking.createCompletion({
        recipe_id: ratingSlot.recipeId,
        meal_plan_id: cooking.mealPlan?.id ?? '',
        day_of_week: ratingSlot.day,
        meal_type: ratingSlot.meal,
        rating,
        notes: notes?.trim() || undefined,
      })
      setRatingSlot(null)
    },
    [ratingSlot, cooking]
  )

  const confirmSkip = useCallback(async () => {
    if (!skipNoteDay) return
    await cooking.skipDay(skipNoteDay, skipNoteText || undefined)
    setSkipNoteDay(null)
    setSkipNoteText('')
  }, [skipNoteDay, skipNoteText, cooking])

  const handleRandomFill = useCallback(
    async (day: DayOfWeek) => {
      setRandomizingDay(day)
      try {
        await cooking.randomFillDinner(day)
      } finally {
        setRandomizingDay(null)
      }
    },
    [cooking]
  )

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <CommandBarSkeleton />
        <WeekHorizonSkeleton />
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="p-3 overflow-y-auto h-full">
            <WorkoutStageSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <CookingWeekSync />
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <CommandBar />
        <WeekHorizon
          onAddDinner={(day) => setPickerSlot({ day, meal: 'dinner' })}
          onRecipeClick={handleRecipeClick}
          onMarkCooked={handleMarkCooked}
          onRemoveMeal={(day, meal) => cooking.updateMealSlot(day, meal, null)}
          onAddToShopping={(recipeId) => cooking.addRecipeToShoppingList(recipeId)}
          onRandomFill={handleRandomFill}
          onSkipDay={(day) => setSkipNoteDay(day)}
          onUnskipDay={(day) => cooking.unskipDay(day)}
          isSlotCompleted={cooking.isSlotCompleted}
          randomizingDay={randomizingDay}
        />
        <DayFlowMobile />

        {/* Fitness */}
        <section className="shrink-0 flex flex-col border-b border-border">
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-card/40">
            <Dumbbell className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Fitness</h2>
          </div>
          <div className="flex-1 min-h-[280px] min-w-0 overflow-auto">
            <FitnessPageContent
              embedded
              selectedDate={selectedDate}
              onDateChange={(date) =>
                navigateToDay(date, date > selectedDate ? 'forward' : 'backward')
              }
            />
          </div>
        </section>

        {/* Cooking */}
        <section className="min-h-[320px] shrink-0 flex flex-col border-b border-border">
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-card/40">
            <ChefHat className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Cooking</h2>
          </div>
          <div className="flex-1 min-h-[280px] min-w-0 overflow-auto">
            <DashboardCookingSection />
          </div>
        </section>

        {/* Calendar */}
        <section className="shrink-0 flex flex-col border-b border-border">
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-card/40">
            <CalendarDays className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Calendar</h2>
          </div>
          <div className="flex-1 min-h-[280px] min-w-0 overflow-auto">
            <DashboardCalendarSection />
          </div>
        </section>
      </div>

      <RecipePickerDialog
        open={!!pickerSlot}
        onOpenChange={(open) => !open && setPickerSlot(null)}
        onSelect={handleMealSelect}
        selectedId={
          pickerSlot
            ? (() => {
                const dm = cooking.mealPlan?.meals[pickerSlot.day]
                const id = dm?.[pickerSlot.meal as keyof typeof dm]
                return typeof id === 'string' ? id : undefined
              })()
            : undefined
        }
      />

      {/* Skip day dialog */}
      <Dialog open={!!skipNoteDay} onOpenChange={(open) => !open && (setSkipNoteDay(null), setSkipNoteText(''))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Skip {skipNoteDay ? skipNoteDay.charAt(0).toUpperCase() + skipNoteDay.slice(1) : ''}
            </DialogTitle>
            <DialogDescription>Add an optional note</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="skip-day-reason">Reason</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="skip-day-reason"
                  placeholder="Reason for skipping..."
                  value={skipNoteText}
                  onChange={(e) => setSkipNoteText(e.target.value)}
                  className="pl-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmSkip()
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSkipNoteDay(null)
                setSkipNoteText('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmSkip}>Skip Day</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as cooked / rating dialog */}
      <AnimatePresence>
        {ratingSlot && (
          <CookCompletionDialog
            recipeName={cooking.getRecipeById(ratingSlot.recipeId)?.name || ''}
            onSubmit={(rating, notes) => handleRatingSubmit(rating, notes)}
            onCancel={() => setRatingSlot(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export function DashboardV2() {
  return (
    <DashboardV2Provider>
      <CookingProvider>
        <DashboardContent />
      </CookingProvider>
    </DashboardV2Provider>
  )
}
