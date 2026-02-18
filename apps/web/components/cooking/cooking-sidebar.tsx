'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCooking } from '@/hooks/use-cooking-data'
import { useShoppingState } from '@/hooks/use-shopping-state'
import { useToast } from '@/hooks/use-toast'
import { apiGet } from '@/lib/api/client'
import type { DayMeals, DayOfWeek, Recipe, ShoppingListItem } from '@/lib/types/cooking.types'
import type { WeatherForecast } from '@/lib/types/weather.types'
import { cn, resolveRecipeImageUrl } from '@/lib/utils'
import { categorizeIngredient, CATEGORY_ORDER } from '@/lib/utils/shopping-utils'
import {
    addDays,
    addWeeks,
    format,
    formatDistanceToNow,
    isToday,
    startOfWeek,
    subWeeks,
} from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
    CalendarDays,
    Check,
    ChefHat,
    ChevronDown,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    Circle,
    Copy,
    Dices,
    Expand,
    LayoutList,
    MessageSquare,
    PanelLeftClose,
    Plus,
    RefreshCw,
    ShoppingBag,
    ShoppingCart,
    SkipForward,
    Star,
    Thermometer,
    Undo2,
    X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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

const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const DINNER_ONLY = ['dinner'] as const

interface CookingSidebarProps {
  open: boolean
  onRecipeClick?: (recipeId: string) => void
}

export function CookingSidebar({ open, onRecipeClick }: CookingSidebarProps) {
  const { setSidebarOpen } = useCooking()
  const isMobile = useMediaQuery('(max-width: 1023px)')

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[300px] p-0 sm:w-[320px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Meal Plan & Shopping</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col gap-3 p-3">
              <MealPlanCard onRecipeClick={onRecipeClick} />
              <ShoppingCard />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="border-border/40 bg-card/30 hidden shrink-0 flex-col overflow-hidden border-r lg:flex"
          style={{ display: 'flex' }}
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col gap-3 p-3">
              <MealPlanCard onRecipeClick={onRecipeClick} />
              <ShoppingCard />
            </div>
          </ScrollArea>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

// ── Weekly Weather Summary (compact temp strip) ──

function getTempColor(tempF: number): string {
  if (tempF <= 20) return 'text-blue-400'
  if (tempF <= 32) return 'text-blue-300'
  if (tempF <= 45) return 'text-sky-300'
  if (tempF <= 55) return 'text-slate-400'
  if (tempF <= 65) return 'text-slate-300'
  if (tempF <= 75) return 'text-amber-400'
  if (tempF <= 85) return 'text-orange-400'
  return 'text-red-400'
}

interface DayForecast {
  high: number
  low: number
  label: string
  shortForecast: string
}

function WeeklyWeatherSummary() {
  const [days, setDays] = useState<DayForecast[]>([])

  useEffect(() => {
    apiGet<WeatherForecast>('/api/weather/forecast').then((res) => {
      if (!res.success || !res.data) return
      const periods = res.data.properties.periods
      const paired: DayForecast[] = []

      for (let i = 0; i < periods.length - 1; i++) {
        const p = periods[i]!
        if (!p.isDaytime) continue
        const night = periods[i + 1]
        if (night && !night.isDaytime) {
          paired.push({
            high: p.temperature,
            low: night.temperature,
            label: p.name,
            shortForecast: p.shortForecast,
          })
        }
      }
      setDays(paired.slice(0, 7))
    })
  }, [])

  if (days.length === 0) return null

  const allHighs = days.map((d) => d.high)
  const allLows = days.map((d) => d.low)
  const weekHigh = Math.max(...allHighs)
  const weekLow = Math.min(...allLows)

  return (
    <div className="hidden xl:flex items-center gap-0.5 rounded-md bg-muted/30 px-1.5 py-0.5">
      <Thermometer className="size-3 text-muted-foreground/50 mr-0.5 shrink-0" />
      {days.map((day, i) => (
        <Tooltip key={i}>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'text-[9px] font-semibold tabular-nums cursor-default px-[3px]',
                getTempColor(day.high)
              )}
            >
              {day.high}°
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">
            <span className="font-medium">{day.label}</span>: {day.high}°/{day.low}° — {day.shortForecast}
          </TooltipContent>
        </Tooltip>
      ))}
      <span className="text-[8px] text-muted-foreground/50 ml-0.5 shrink-0 tabular-nums">
        {weekLow}°–{weekHigh}°
      </span>
    </div>
  )
}

// ── Horizontal Meal Plan (top strip layout) ──

export function HorizontalMealPlan({ onRecipeClick }: { onRecipeClick?: (recipeId: string) => void }) {
  const {
    currentWeek,
    setCurrentWeek,
    mealPlan,
    mealPlanLoading,
    updateMealSlot,
    getRecipeById,
    mealPlanMode,
    setMealPlanMode,
    skipDay,
    unskipDay,
    randomFillDinner,
    isSlotCompleted,
    createCompletion,
    updateCompletionRating,
    deleteCompletion,
  } = useCooking()

  const [pickerSlot, setPickerSlot] = useState<{ day: DayOfWeek; meal: string } | null>(null)
  const [skipNoteDay, setSkipNoteDay] = useState<DayOfWeek | null>(null)
  const [skipNoteText, setSkipNoteText] = useState('')
  const [randomizing, setRandomizing] = useState<DayOfWeek | null>(null)
  const [dayForecasts, setDayForecasts] = useState<Map<string, DayForecast>>(new Map())
  const [ratingSlot, setRatingSlot] = useState<{ day: DayOfWeek; meal: string; recipeId: string } | null>(null)

  useEffect(() => {
    apiGet<WeatherForecast>('/api/weather/forecast').then((res) => {
      if (!res.success || !res.data) return
      const periods = res.data.properties.periods
      const map = new Map<string, DayForecast>()
      for (let i = 0; i < periods.length - 1; i++) {
        const p = periods[i]!
        if (!p.isDaytime) continue
        const night = periods[i + 1]
        if (night && !night.isDaytime) {
          // Derive weekday from startTime so "Today"/"Tomorrow" map correctly
          const key = format(new Date(p.startTime), 'EEEE').toLowerCase().slice(0, 3)
          map.set(key, {
            high: p.temperature,
            low: night.temperature,
            label: p.name,
            shortForecast: p.shortForecast,
          })
        }
      }
      setDayForecasts(map)
    })
  }, [])

  const activeMealTypes = mealPlanMode === 'dinner-only' ? DINNER_ONLY : ALL_MEAL_TYPES

  const handlePreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const handleThisWeek = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const handleMealSelect = async (recipeId: string) => {
    if (!pickerSlot) return
    await updateMealSlot(pickerSlot.day, pickerSlot.meal, recipeId || null)
    setPickerSlot(null)
  }

  const handleRemoveMeal = async (day: DayOfWeek, mealType: string) => {
    await updateMealSlot(day, mealType, null)
  }

  const handleSkipDay = (day: DayOfWeek) => {
    setSkipNoteDay(day)
    setSkipNoteText('')
  }

  const confirmSkip = async () => {
    if (!skipNoteDay) return
    await skipDay(skipNoteDay, skipNoteText || undefined)
    setSkipNoteDay(null)
    setSkipNoteText('')
  }

  const handleRandomFill = useCallback(async (day: DayOfWeek) => {
    setRandomizing(day)
    try {
      await randomFillDinner(day)
    } finally {
      setRandomizing(null)
    }
  }, [randomFillDinner])

  const getDayForecast = useCallback((dayDate: Date): DayForecast | undefined => {
    const dayName = format(dayDate, 'EEEE').toLowerCase().slice(0, 3)
    for (const [key, val] of dayForecasts) {
      if (key.startsWith(dayName)) return val
    }
    return undefined
  }, [dayForecasts])

  const handleMarkCooked = useCallback(async (day: DayOfWeek, mealType: string, recipeId: string) => {
    const existing = isSlotCompleted(day, mealType)
    if (existing) {
      await deleteCompletion(existing.id)
    } else {
      setRatingSlot({ day, meal: mealType, recipeId })
    }
  }, [isSlotCompleted, deleteCompletion])

  const handleRatingSubmit = useCallback(async (rating?: number, notes?: string) => {
    if (!ratingSlot) return
    await createCompletion({
      recipe_id: ratingSlot.recipeId,
      meal_plan_id: mealPlan?.id,
      day_of_week: ratingSlot.day,
      meal_type: ratingSlot.meal,
      rating,
      notes: notes?.trim() || undefined,
    })
    setRatingSlot(null)
  }, [ratingSlot, createCompletion, mealPlan?.id])

  const plannedMealsCount = DAYS.reduce((count, day) => {
    const dayMeals = mealPlan?.meals[day]
    if (!dayMeals || dayMeals.skipped) return count
    return count + activeMealTypes.filter((mt) => dayMeals[mt as keyof typeof dayMeals]).length
  }, 0)

  return (
    <div className="p-3 pb-0">
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-gradient-to-r from-orange-500/[0.04] to-amber-500/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/15">
              <CalendarDays className="size-3.5 text-orange-500" />
            </div>
            <h2 className="text-sm font-bold">Cooking</h2>
            {plannedMealsCount > 0 && (
              <Badge variant="secondary" className="h-5 px-2 text-[10px] tabular-nums">
                {plannedMealsCount} planned
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Week navigation */}
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="size-7" onClick={handlePreviousWeek}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-[11px] font-medium tabular-nums text-muted-foreground min-w-[110px] text-center">
                {format(currentWeek, 'MMM d')} – {format(addDays(currentWeek, 6), 'MMM d')}
              </span>
              <Button variant="ghost" size="icon" className="size-7" onClick={handleNextWeek}>
                <ChevronRightIcon className="size-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={handleThisWeek}>
                Today
              </Button>
            </div>

            <div className="h-5 w-px bg-border/40" />

            {/* Mode toggle */}
            <div className="flex items-center rounded-md border border-border/40 p-0.5">
              <button
                onClick={() => setMealPlanMode('dinner-only')}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-medium transition-all',
                  mealPlanMode === 'dinner-only'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Dinners
              </button>
              <button
                onClick={() => setMealPlanMode('all-meals')}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-medium transition-all',
                  mealPlanMode === 'all-meals'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All
              </button>
            </div>

          </div>
        </div>

        {/* Day columns */}
        {mealPlanLoading ? (
        <div className="flex items-center justify-center py-8">
          <span className="text-xs text-muted-foreground">Loading meal plan...</span>
        </div>
      ) : (
        <div className="grid grid-cols-7 divide-x divide-border/20">
          {DAYS.map((day, dayIndex) => {
            const dayDate = addDays(currentWeek, dayIndex)
            const dayMeals = mealPlan?.meals[day]
            const isDayToday = isToday(dayDate)
            const isSkipped = dayMeals?.skipped === true

            return (
              <div
                key={day}
                className={cn(
                  'group relative px-2 py-2 min-h-[80px] transition-colors',
                  isDayToday ? 'bg-primary/[0.04]' : 'hover:bg-muted/20'
                )}
              >
                {isDayToday && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
                )}

                {/* Day header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      'text-[10px] font-medium uppercase tracking-wider',
                      isDayToday ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {format(dayDate, 'EEE')}
                    </span>
                    <span className={cn(
                      'text-sm font-bold tabular-nums',
                      isDayToday && 'text-primary'
                    )}>
                      {format(dayDate, 'd')}
                    </span>
                    {(() => {
                      const fc = getDayForecast(dayDate)
                      if (!fc) return null
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn('text-[10px] font-semibold tabular-nums cursor-default', getTempColor(fc.high))}>
                              {fc.high}°
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-[10px]">
                            <span className="font-medium">{fc.label}</span>: {fc.high}°/{fc.low}° — {fc.shortForecast}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })()}
                  </div>

                  {!isSkipped && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(() => {
                        const dinnerRecipeId = dayMeals?.dinner
                        if (!dinnerRecipeId || typeof dinnerRecipeId !== 'string') return null
                        const dinnerCompletion = isSlotCompleted(day, 'dinner')
                        return (
                          <>
                            <button
                              className={cn(
                                'rounded p-0.5 transition-all',
                                dinnerCompletion
                                  ? 'text-green-500 opacity-100 hover:text-green-600'
                                  : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10'
                              )}
                              onClick={() => handleMarkCooked(day, 'dinner', dinnerRecipeId)}
                              title={dinnerCompletion ? 'Undo cooked' : 'Mark as cooked'}
                            >
                              <Check className="size-3" />
                            </button>
                            <button
                              className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => handleRemoveMeal(day, 'dinner')}
                              title="Remove meal"
                            >
                              <X className="size-3" />
                            </button>
                          </>
                        )
                      })()}
                      <button
                        className={cn(
                          'rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                          randomizing === day && 'animate-pulse'
                        )}
                        onClick={() => handleRandomFill(day)}
                        disabled={randomizing !== null}
                        title="Random dinner"
                      >
                        <Dices className="size-3" />
                      </button>
                      <button
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        onClick={() => handleSkipDay(day)}
                        title="Skip day"
                      >
                        <SkipForward className="size-3" />
                      </button>
                    </div>
                  )}
                </div>

                {isSkipped ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 rounded-md border border-dashed border-border/40 bg-muted/20 px-1.5 py-1">
                      <SkipForward className="size-2.5 text-muted-foreground/60 shrink-0" />
                      <span className="text-[9px] text-muted-foreground/60 truncate">
                        Skipped{dayMeals?.skip_note ? ` — ${dayMeals.skip_note}` : ''}
                      </span>
                    </div>
                    <button
                      className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => unskipDay(day)}
                    >
                      <Undo2 className="size-2.5" />
                      Restore
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activeMealTypes.map((mealType) => {
                      const recipeId = dayMeals?.[mealType as keyof typeof dayMeals]
                      const recipe = recipeId && typeof recipeId === 'string' ? getRecipeById(recipeId) : null

                      if (recipe) {
                        const completion = isSlotCompleted(day, mealType)
                        return (
                          <div
                            key={mealType}
                            className={cn(
                              'group/meal flex items-center gap-2 rounded-lg border-l-2 px-2 py-1.5 cursor-pointer transition-colors hover:bg-muted/60',
                              completion
                                ? 'border-green-500/50 bg-green-500/[0.06]'
                                : 'border-orange-500/30 bg-muted/40'
                            )}
                            onClick={() => onRecipeClick?.(recipe.id)}
                          >
                            {resolveRecipeImageUrl(recipe.image_url) ? (
                              <img
                                src={resolveRecipeImageUrl(recipe.image_url)}
                                alt=""
                                className="size-7 rounded-md object-cover shrink-0"
                              />
                            ) : (
                              <div className="size-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <ChefHat className="size-3 text-muted-foreground" />
                              </div>
                            )}
                            {mealPlanMode === 'all-meals' && (
                              <span className="text-[8px] text-muted-foreground uppercase tracking-wider shrink-0">
                                {mealType.charAt(0)}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-medium leading-tight line-clamp-2 block">
                                {recipe.name}
                              </span>
                              {completion && (completion.rating || completion.notes) && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 mt-0.5 cursor-default">
                                      {completion.rating && (
                                        <div className="flex items-center gap-px">
                                          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                                            <Star
                                              key={s}
                                              className={cn(
                                                'size-2',
                                                s <= completion.rating!
                                                  ? 'fill-amber-400 text-amber-400'
                                                  : 'text-muted-foreground/30'
                                              )}
                                            />
                                          ))}
                                        </div>
                                      )}
                                      {completion.notes && (
                                        <span className="text-[9px] text-muted-foreground truncate max-w-[60px]">
                                          {completion.notes}
                                        </span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  {completion.notes && (
                                    <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                                      {completion.notes}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              )}
                            </div>
                            {mealPlanMode === 'all-meals' && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  className={cn(
                                    'rounded p-0.5 transition-all',
                                    completion
                                      ? 'text-green-500 hover:text-green-600'
                                      : 'opacity-0 group-hover/meal:opacity-100 text-muted-foreground hover:text-green-500 hover:bg-green-500/10'
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMarkCooked(day, mealType, recipe.id)
                                  }}
                                  title={completion ? 'Undo cooked' : 'Mark as cooked'}
                                >
                                  <Check className="size-3" />
                                </button>
                                <button
                                  className="opacity-0 group-hover/meal:opacity-100 transition-opacity rounded p-0.5 hover:bg-card shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveMeal(day, mealType)
                                  }}
                                >
                                  <X className="size-2.5 text-muted-foreground" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      }

                      return (
                        <Popover
                          key={mealType}
                          open={pickerSlot?.day === day && pickerSlot?.meal === mealType}
                          onOpenChange={(open) => { if (!open) setPickerSlot(null) }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              className="flex w-full items-center gap-1 rounded-md border border-dashed border-border/30 px-1.5 py-1 text-[9px] text-muted-foreground transition-colors hover:border-border/60 hover:bg-muted/20"
                              onClick={() => setPickerSlot({ day, meal: mealType })}
                            >
                              <Plus className="size-2.5" />
                              {mealPlanMode === 'all-meals' ? (
                                <span className="capitalize">{mealType}</span>
                              ) : (
                                <span>Add dinner</span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <RecipePicker
                              onSelect={handleMealSelect}
                              onClose={() => setPickerSlot(null)}
                              selectedId={typeof recipeId === 'string' ? recipeId : undefined}
                            />
                          </PopoverContent>
                        </Popover>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      </div>

      {/* Skip note dialog */}
      <AnimatePresence>
        {skipNoteDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSkipNoteDay(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-xl bg-card border border-border shadow-xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <SkipForward className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">
                    Skip {skipNoteDay.charAt(0).toUpperCase() + skipNoteDay.slice(1)}
                  </h3>
                  <p className="text-xs text-muted-foreground">Add an optional note</p>
                </div>
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Reason for skipping..."
                  value={skipNoteText}
                  onChange={(e) => setSkipNoteText(e.target.value)}
                  className="h-10 pl-9 text-sm rounded-lg"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmSkip() }}
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setSkipNoteDay(null)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-8" onClick={confirmSkip}>
                  Skip Day
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating dialog */}
      <AnimatePresence>
        {ratingSlot && (
          <CookCompletionDialog
            recipeName={getRecipeById(ratingSlot.recipeId)?.name || ''}
            onSubmit={(rating, notes) => handleRatingSubmit(rating, notes)}
            onCancel={() => setRatingSlot(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Cook Completion Dialog ──

function CookCompletionDialog({
  recipeName,
  onSubmit,
  onCancel,
}: {
  recipeName: string
  onSubmit: (rating?: number, notes?: string) => void
  onCancel: () => void
}) {
  const [selectedRating, setSelectedRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [notes, setNotes] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm rounded-xl bg-card border border-border shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-green-500/15">
            <Check className="size-4 text-green-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Mark as Cooked</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[220px]">{recipeName}</p>
          </div>
        </div>

        {/* Star rating */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Rating</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setSelectedRating(star === selectedRating ? 0 : star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'size-6 transition-colors',
                    (hover || selectedRating) >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30 hover:text-amber-300'
                  )}
                />
              </button>
            ))}
            {selectedRating > 0 && (
              <span className="text-xs text-muted-foreground ml-1.5">
                {['', 'Bad', 'Poor', 'Fair', 'Good', 'Great', 'Excellent', 'Amazing'][selectedRating]}
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Notes</label>
          <textarea
            placeholder="How did it turn out? Any tweaks for next time?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-border resize-none"
            rows={2}
            autoFocus
          />
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={() => onSubmit(selectedRating || undefined, notes || undefined)}
          >
            Save
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Meal Plan Card (sidebar variant) ──

function MealPlanCard({ onRecipeClick }: { onRecipeClick?: (recipeId: string) => void }) {
  const {
    currentWeek,
    setCurrentWeek,
    mealPlan,
    mealPlanLoading,
    updateMealSlot,
    getRecipeById,
    mealPlanMode,
    setMealPlanMode,
    skipDay,
    unskipDay,
    randomFillDinner,
  } = useCooking()

  const [pickerSlot, setPickerSlot] = useState<{ day: DayOfWeek; meal: string } | null>(null)
  const [skipNoteDay, setSkipNoteDay] = useState<DayOfWeek | null>(null)
  const [skipNoteText, setSkipNoteText] = useState('')
  const [randomizing, setRandomizing] = useState<DayOfWeek | null>(null)

  const activeMealTypes = mealPlanMode === 'dinner-only' ? DINNER_ONLY : ALL_MEAL_TYPES

  const handlePreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const handleThisWeek = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const handleMealSelect = async (recipeId: string) => {
    if (!pickerSlot) return
    await updateMealSlot(pickerSlot.day, pickerSlot.meal, recipeId || null)
    setPickerSlot(null)
  }

  const handleRemoveMeal = async (day: DayOfWeek, mealType: string) => {
    await updateMealSlot(day, mealType, null)
  }

  const handleSkipDay = (day: DayOfWeek) => {
    setSkipNoteDay(day)
    setSkipNoteText('')
  }

  const confirmSkip = async () => {
    if (!skipNoteDay) return
    await skipDay(skipNoteDay, skipNoteText || undefined)
    setSkipNoteDay(null)
    setSkipNoteText('')
  }

  const handleRandomFill = useCallback(async (day: DayOfWeek) => {
    setRandomizing(day)
    try {
      await randomFillDinner(day)
    } finally {
      setRandomizing(null)
    }
  }, [randomFillDinner])

  const plannedMealsCount = DAYS.reduce((count, day) => {
    const dayMeals = mealPlan?.meals[day]
    if (!dayMeals || dayMeals.skipped) return count
    return count + activeMealTypes.filter((mt) => dayMeals[mt as keyof typeof dayMeals]).length
  }, 0)

  return (
    <div className="border-border/50 bg-card flex flex-col overflow-hidden rounded-xl border">
      {/* Card header */}
      <div className="border-border/50 border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold">Meal Plan</h3>
            {plannedMealsCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
                {plannedMealsCount}
              </Badge>
            )}
          </div>
          {/* Mode toggle */}
          <div className="flex items-center rounded-md border border-border/40 p-0.5">
            <button
              onClick={() => setMealPlanMode('dinner-only')}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium transition-all',
                mealPlanMode === 'dinner-only'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Dinners
            </button>
            <button
              onClick={() => setMealPlanMode('all-meals')}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium transition-all',
                mealPlanMode === 'all-meals'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
          </div>
        </div>
        {/* Week navigation */}
        <div className="mt-1.5 flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="size-6" onClick={handlePreviousWeek}>
            <ChevronLeft className="size-3" />
          </Button>
          <span className="flex-1 text-center text-[11px] font-medium tabular-nums text-muted-foreground">
            {format(currentWeek, 'MMM d')} – {format(addDays(currentWeek, 6), 'MMM d')}
          </span>
          <Button variant="ghost" size="icon" className="size-6" onClick={handleNextWeek}>
            <ChevronRightIcon className="size-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={handleThisWeek}>
            Today
          </Button>
        </div>
      </div>

      {/* Day list */}
      {mealPlanLoading ? (
        <div className="flex items-center justify-center py-8">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <div className="flex flex-col">
          {DAYS.map((day, dayIndex) => {
            const dayDate = addDays(currentWeek, dayIndex)
            const dayMeals = mealPlan?.meals[day]
            const isDayToday = isToday(dayDate)
            const isSkipped = dayMeals?.skipped === true

            return (
              <DayRow
                key={day}
                day={day}
                dayDate={dayDate}
                dayMeals={dayMeals}
                isDayToday={isDayToday}
                isSkipped={isSkipped}
                activeMealTypes={activeMealTypes}
                mealPlanMode={mealPlanMode}
                getRecipeById={getRecipeById}
                pickerSlot={pickerSlot}
                setPickerSlot={setPickerSlot}
                onMealSelect={handleMealSelect}
                onRemoveMeal={handleRemoveMeal}
                onSkipDay={handleSkipDay}
                onUnskipDay={unskipDay}
                onRandomFill={handleRandomFill}
                onRecipeClick={onRecipeClick}
                randomizing={randomizing}
              />
            )
          })}
        </div>
      )}

      {/* Skip note dialog */}
      <AnimatePresence>
        {skipNoteDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSkipNoteDay(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-xl bg-card border border-border shadow-xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <SkipForward className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">
                    Skip {skipNoteDay.charAt(0).toUpperCase() + skipNoteDay.slice(1)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Add an optional note
                  </p>
                </div>
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Reason for skipping..."
                  value={skipNoteText}
                  onChange={(e) => setSkipNoteText(e.target.value)}
                  className="h-10 pl-9 text-sm rounded-lg"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmSkip() }}
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setSkipNoteDay(null)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-8" onClick={confirmSkip}>
                  Skip Day
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Day Row ──

function DayRow({
  day,
  dayDate,
  dayMeals,
  isDayToday,
  isSkipped,
  activeMealTypes,
  mealPlanMode,
  getRecipeById,
  pickerSlot,
  setPickerSlot,
  onMealSelect,
  onRemoveMeal,
  onSkipDay,
  onUnskipDay,
  onRandomFill,
  onRecipeClick,
  randomizing,
}: {
  day: DayOfWeek
  dayDate: Date
  dayMeals: DayMeals | undefined
  isDayToday: boolean
  isSkipped: boolean
  activeMealTypes: readonly string[]
  mealPlanMode: string
  getRecipeById: (id: string) => Recipe | undefined
  pickerSlot: { day: DayOfWeek; meal: string } | null
  setPickerSlot: (slot: { day: DayOfWeek; meal: string } | null) => void
  onMealSelect: (recipeId: string) => void
  onRemoveMeal: (day: DayOfWeek, mealType: string) => void
  onSkipDay: (day: DayOfWeek) => void
  onUnskipDay: (day: DayOfWeek) => void
  onRandomFill: (day: DayOfWeek) => void
  onRecipeClick?: (recipeId: string) => void
  randomizing: DayOfWeek | null
}) {
  return (
    <div
      className={cn(
        'group relative border-b border-border/30 px-3 py-1.5 transition-colors last:border-b-0',
        isDayToday
          ? 'bg-primary/[0.04]'
          : 'hover:bg-muted/30'
      )}
    >
      {/* Today accent */}
      {isDayToday && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary" />
      )}

      {/* Day header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-baseline gap-1.5">
          <span className={cn(
            'text-[11px] font-medium',
            isDayToday ? 'text-primary' : 'text-muted-foreground'
          )}>
            {format(dayDate, 'EEE')}
          </span>
          <span className={cn(
            'text-xs font-bold tabular-nums',
            isDayToday && 'text-primary'
          )}>
            {format(dayDate, 'd')}
          </span>
        </div>

        {/* Hover actions */}
        {!isSkipped && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className={cn(
                'rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                randomizing === day && 'animate-pulse'
              )}
              onClick={() => onRandomFill(day)}
              disabled={randomizing !== null}
              title="Random dinner"
            >
              <Dices className="size-3" />
            </button>
            <button
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => onSkipDay(day)}
              title="Skip day"
            >
              <SkipForward className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Skipped state */}
      {isSkipped ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 rounded-md border border-dashed border-border/40 bg-muted/20 px-2 py-1.5">
            <SkipForward className="size-3 text-muted-foreground/60 shrink-0" />
            <span className="text-[10px] text-muted-foreground/60">Skipped</span>
            {dayMeals?.skip_note && (
              <span className="text-[10px] text-muted-foreground/40 truncate">
                — {dayMeals.skip_note}
              </span>
            )}
          </div>
          <button
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
            onClick={() => onUnskipDay(day)}
          >
            <Undo2 className="size-2.5" />
            Restore
          </button>
        </div>
      ) : (
        /* Meal slots */
        <div className="space-y-1">
          {activeMealTypes.map((mealType) => {
            const recipeId = dayMeals?.[mealType as keyof typeof dayMeals]
            const recipe = recipeId && typeof recipeId === 'string' ? getRecipeById(recipeId) : null

            if (recipe) {
              return (
                <div
                  key={mealType}
                  className="group/meal flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5 cursor-pointer transition-colors hover:bg-muted/60"
                  onClick={() => onRecipeClick?.(recipe.id)}
                >
                  {resolveRecipeImageUrl(recipe.image_url) ? (
                    <img
                      src={resolveRecipeImageUrl(recipe.image_url)}
                      alt=""
                      className="size-6 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-6 rounded bg-muted flex items-center justify-center shrink-0">
                      <ChefHat className="size-3 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {mealPlanMode === 'all-meals' && (
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">
                        {mealType}
                      </span>
                    )}
                    <span className="text-[11px] font-medium leading-tight line-clamp-1 block">
                      {recipe.name}
                    </span>
                  </div>
                  <button
                    className="opacity-0 group-hover/meal:opacity-100 transition-opacity rounded p-0.5 hover:bg-card"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveMeal(day, mealType)
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
                open={pickerSlot?.day === day && pickerSlot?.meal === mealType}
                onOpenChange={(open) => { if (!open) setPickerSlot(null) }}
              >
                <PopoverTrigger asChild>
                  <button
                    className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-border/30 px-2 py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-border/60 hover:bg-muted/20"
                    onClick={() => setPickerSlot({ day, meal: mealType })}
                  >
                    <Plus className="size-3" />
                    {mealPlanMode === 'all-meals' ? (
                      <span className="capitalize">{mealType}</span>
                    ) : (
                      <span>Add dinner</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start" side="right">
                  <RecipePicker
                    onSelect={onMealSelect}
                    onClose={() => setPickerSlot(null)}
                    selectedId={typeof recipeId === 'string' ? recipeId : undefined}
                  />
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Shopping List Card ──

export function ShoppingCard({ onOpenFocusMode, onCollapse }: { onOpenFocusMode?: () => void; onCollapse?: () => void }) {
  const { shoppingList, shoppingListLoading, refreshShoppingList } = useCooking()
  const { toast } = useToast()
  const shopState = useShoppingState(shoppingList ?? null)
  const {
    manualItems,
    trips,
    toggleItem,
    hideItem,
    isChecked: isItemChecked,
    isHidden: isItemHidden,
    completeTrip,
    undoLastTrip,
    toggleManualItem,
    addManualItem,
    removeManualItem,
  } = shopState

  const [newItemInput, setNewItemInput] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [showCategories, setShowCategories] = useState(true)
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)

  useEffect(() => {
    refreshShoppingList()
  }, [refreshShoppingList])

  const handleAddManualItem = () => {
    if (!newItemInput.trim()) return
    addManualItem(newItemInput)
    setNewItemInput('')
  }

  const handleCopyToClipboard = () => {
    const lines: string[] = []
    if (shoppingList) {
      grouped.forEach(([category, items]) => {
        lines.push(`\n${category}:`)
        items.forEach((item) => {
          const checked = isItemChecked(item.ingredient)
          const amountStr = item.amount > 0 ? ` - ${Math.round(item.amount * 100) / 100} ${item.unit}` : item.unit ? ` - ${item.unit}` : ''
          lines.push(`  ${checked ? '✓' : '○'} ${item.ingredient}${amountStr}`)
        })
      })
    }
    if (manualItems.length > 0) {
      lines.push('\nOther Items:')
      manualItems.forEach((item) => {
        lines.push(`  ${item.checked ? '✓' : '○'} ${item.name}`)
      })
    }
    navigator.clipboard.writeText(lines.join('\n'))
    toast({ title: 'Copied to clipboard' })
  }

  const toggleCategory = (category: string) => {
    const newSet = new Set(collapsedCategories)
    if (newSet.has(category)) newSet.delete(category)
    else newSet.add(category)
    setCollapsedCategories(newSet)
  }

  const grouped = useMemo(() => {
    if (!shoppingList) return []
    const groups = new Map<string, ShoppingListItem[]>()
    shoppingList.items.forEach((item) => {
      if (isItemHidden(item.ingredient)) return
      const category = categorizeIngredient(item.ingredient)
      if (!groups.has(category)) groups.set(category, [])
      groups.get(category)!.push(item)
    })
    return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map(
      (cat) => [cat, groups.get(cat)!] as [string, ShoppingListItem[]]
    )
  }, [shoppingList, isItemHidden])

  const flatItems = useMemo(() => {
    const all = grouped.flatMap(([, items]) => items)
    const unchecked = all.filter((i) => !isItemChecked(i.ingredient))
    const checked = all.filter((i) => isItemChecked(i.ingredient))
    return [...unchecked, ...checked]
  }, [grouped, isItemChecked])

  const visibleItemCount = grouped.reduce((sum, [, items]) => sum + items.length, 0) + manualItems.length
  const checkedCount =
    grouped.reduce((sum, [, items]) => sum + items.filter((i) => isItemChecked(i.ingredient)).length, 0) +
    manualItems.filter((i) => i.checked).length
  const hasCheckedItems = checkedCount > 0
  const progressPercent = visibleItemCount > 0 ? Math.round((checkedCount / visibleItemCount) * 100) : 0

  return (
    <div className="border-border/50 bg-card flex flex-col rounded-xl border">
      {/* Card header */}
      <div className="border-border/50 border-b px-3 py-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold">Shopping</h3>
            {trips.length > 0 && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px] tabular-nums border-green-500/30 text-green-600">
                Trip {trips.length + 1}
              </Badge>
            )}
            {visibleItemCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
                {checkedCount}/{visibleItemCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {visibleItemCount > 0 && (
              <button
                onClick={() => setShowCategories((v) => !v)}
                className={cn(
                  'rounded p-1 transition-colors',
                  showCategories
                    ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    : 'text-foreground bg-muted'
                )}
                title={showCategories ? 'Show flat list' : 'Show categories'}
              >
                <LayoutList className="size-3" />
              </button>
            )}
            <button
              onClick={() => refreshShoppingList(true)}
              className={cn(
                'rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                shoppingListLoading && 'animate-spin'
              )}
              title="Regenerate from meal plan"
              disabled={shoppingListLoading}
            >
              <RefreshCw className="size-3" />
            </button>
            {visibleItemCount > 0 && (
              <button
                onClick={handleCopyToClipboard}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="size-3" />
              </button>
            )}
            {onOpenFocusMode && visibleItemCount > 0 && (
              <button
                onClick={onOpenFocusMode}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Focus mode"
              >
                <Expand className="size-3" />
              </button>
            )}
            {onCollapse && (
              <>
                <div className="h-3 w-px bg-border/40 mx-0.5" />
                <button
                  onClick={onCollapse}
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Hide shopping list"
                >
                  <PanelLeftClose className="size-3" />
                </button>
              </>
            )}
          </div>
        </div>
        {visibleItemCount > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <MiniProgressRing percent={progressPercent} size={18} />
            <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{progressPercent}%</span>
          </div>
        )}
        {/* Trip history strip */}
        {trips.length > 0 && (
          <div className="mt-2 space-y-1">
            {trips.map((trip, i) => {
              const itemCount = trip.items.length + trip.manualItems.length
              const isExpanded = expandedTripId === trip.id
              const isLatest = i === trips.length - 1
              return (
                <div key={trip.id}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors min-w-0 flex-1"
                    >
                      <Check className="size-2.5 text-green-500 shrink-0" />
                      <span className="truncate">
                        Trip {i + 1} &middot; {itemCount} item{itemCount !== 1 ? 's' : ''} &middot; {formatDistanceToNow(new Date(trip.completedAt), { addSuffix: true })}
                      </span>
                      <ChevronDown className={cn('size-2.5 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                    {isLatest && (
                      <button
                        onClick={undoLastTrip}
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Undo last trip"
                      >
                        <Undo2 className="size-2.5" />
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="ml-4 mt-0.5 space-y-0.5 pb-1">
                      {trip.items.map((item) => (
                        <div key={item.ingredient} className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                          <Check className="size-2 text-green-500/50 shrink-0" />
                          <span className="truncate">{item.ingredient}</span>
                          {(item.amount > 0 || item.unit) && (
                            <span className="text-[9px] text-muted-foreground/40 shrink-0">
                              {item.amount > 0 ? `${Math.round(item.amount * 100) / 100} ` : ''}{item.unit}
                            </span>
                          )}
                        </div>
                      ))}
                      {trip.manualItems.map((name) => (
                        <div key={name} className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                          <Check className="size-2 text-green-500/50 shrink-0" />
                          <span className="truncate">{name}</span>
                          <span className="text-[9px] text-muted-foreground/40">(custom)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2 space-y-2">
        {/* Add item input */}
        <div className="flex gap-1.5">
          <Input
            placeholder="Add a custom item..."
            value={newItemInput}
            onChange={(e) => setNewItemInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddManualItem() }}
            className="h-7 text-[10px]"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 px-2"
            onClick={handleAddManualItem}
            disabled={!newItemInput.trim()}
          >
            <Plus className="size-3" />
          </Button>
        </div>

        {shoppingListLoading ? (
          <div className="flex items-center justify-center py-6">
            <span className="text-[11px] text-muted-foreground">Loading...</span>
          </div>
        ) : visibleItemCount === 0 && manualItems.length === 0 ? (
          <div className="py-6 text-center">
            <ShoppingCart className="size-6 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground/50">
              Add meals to auto-generate
            </p>
          </div>
        ) : (
          <>
            {showCategories ? (
              /* Grouped items */
              grouped.map(([category, items]) => {
                const unchecked = items.filter((i) => !isItemChecked(i.ingredient))
                const checked = items.filter((i) => isItemChecked(i.ingredient))
                const sortedItems = [...unchecked, ...checked]
                const categoryChecked = checked.length
                const isCatCollapsed = collapsedCategories.has(category)

                return (
                  <div key={category}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex w-full items-center gap-1.5 py-1 text-left"
                    >
                      <ChevronDown
                        className={cn(
                          'size-3 text-muted-foreground transition-transform',
                          isCatCollapsed && '-rotate-90'
                        )}
                      />
                      <span className="text-[11px] font-semibold">{category}</span>
                      <span className="text-[9px] text-muted-foreground tabular-nums ml-auto">
                        {categoryChecked}/{items.length}
                      </span>
                    </button>
                    {!isCatCollapsed && (
                      <div className="ml-1 space-y-0.5">
                        {sortedItems.map((item) => (
                          <ShoppingItemRow
                            key={item.ingredient}
                            item={item}
                            isChecked={isItemChecked(item.ingredient)}
                            onToggle={() => toggleItem(item.ingredient)}
                            onHide={() => hideItem(item.ingredient)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              /* Flat list — no category headers */
              <div className="space-y-0.5">
                {flatItems.map((item) => (
                  <ShoppingItemRow
                    key={item.ingredient}
                    item={item}
                    isChecked={isItemChecked(item.ingredient)}
                    onToggle={() => toggleItem(item.ingredient)}
                    onHide={() => hideItem(item.ingredient)}
                  />
                ))}
              </div>
            )}

            {/* Manual items */}
            {manualItems.length > 0 && (
              <div>
                {showCategories && (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="text-[11px] font-semibold">Custom Items</span>
                    <span className="text-[9px] text-muted-foreground tabular-nums ml-auto">
                      {manualItems.filter((i) => i.checked).length}/{manualItems.length}
                    </span>
                  </div>
                )}
                <div className={cn('space-y-0.5', showCategories && 'ml-1')}>
                  {manualItems.map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        'group/manual flex items-center gap-1.5 rounded px-1.5 py-1.5 transition-all',
                        item.checked ? 'opacity-40' : 'hover:bg-muted/30'
                      )}
                    >
                      <button onClick={() => toggleManualItem(index)} className="shrink-0">
                        {item.checked ? (
                          <div className="size-4 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="size-2.5 text-white" />
                          </div>
                        ) : (
                          <Circle className="size-4 text-muted-foreground/40" />
                        )}
                      </button>
                      <span className={cn(
                        'flex-1 text-[11px] transition-colors',
                        item.checked && 'line-through text-muted-foreground'
                      )}>
                        {item.name}
                      </span>
                      <button
                        onClick={() => removeManualItem(index)}
                        className="shrink-0 rounded p-0.5 opacity-0 group-hover/manual:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        title="Remove item"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Trip button */}
            {hasCheckedItems && (
              <button
                onClick={() => completeTrip(shoppingList?.items ?? [])}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-[11px] font-medium text-green-600 transition-colors hover:bg-green-500/20 mt-1"
              >
                <ShoppingBag className="size-3" />
                Complete Trip ({checkedCount})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Shopping Item Row ──

function ShoppingItemRow({
  item,
  isChecked,
  onToggle,
  onHide,
}: {
  item: ShoppingListItem
  isChecked: boolean
  onToggle: () => void
  onHide: () => void
}) {
  return (
    <div
      className={cn(
        'group/item flex items-center gap-1.5 rounded px-1.5 py-1.5 transition-all',
        isChecked ? 'opacity-40' : 'hover:bg-muted/30'
      )}
    >
      <button onClick={onToggle} className="shrink-0">
        {isChecked ? (
          <div className="size-4 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="size-2.5 text-white" />
          </div>
        ) : (
          <Circle className="size-4 text-muted-foreground/40" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <span className={cn(
          'text-[11px] transition-colors',
          isChecked ? 'line-through text-muted-foreground' : 'font-medium'
        )}>
          {item.ingredient}
        </span>
        {(item.amount > 0 || item.unit) && (
          <span className="text-[9px] text-muted-foreground/50 ml-1">
            {item.amount > 0 ? `${Math.round(item.amount * 100) / 100} ` : ''}{item.unit}
          </span>
        )}
      </div>
      <button
        onClick={onHide}
        className="shrink-0 rounded p-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        title="Remove item"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

// ── Mini Progress Ring ──

function MiniProgressRing({ percent, size = 18 }: { percent: number; size?: number }) {
  const strokeWidth = 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/50"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-green-500 transition-all duration-300"
      />
    </svg>
  )
}
