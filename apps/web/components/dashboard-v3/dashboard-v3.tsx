'use client'

import { ActiveDetail } from '@/components/dashboard-v3/active-detail'
import { CommandPalette } from '@/components/dashboard-v3/command-palette'
import {
  DashboardV3Provider,
  useDashboardV3,
} from '@/components/dashboard-v3/dashboard-v3-provider'
import { DayHeader } from '@/components/dashboard-v3/day-header'
import { DayTimeline } from '@/components/dashboard-v3/day-timeline'
import { HudBar } from '@/components/dashboard-v3/hud-bar'
import { ActivityCard } from '@/components/dashboard-v3/live-signals/activity-card'
import { LoadTrendCard } from '@/components/dashboard-v3/live-signals/load-trend-card'
import { ReadinessCard } from '@/components/dashboard-v3/live-signals/readiness-card'
import { StreakCard } from '@/components/dashboard-v3/live-signals/streak-card'
import { WeatherCard } from '@/components/dashboard-v3/live-signals/weather-card'
import { MealStrip } from '@/components/dashboard-v3/meal-strip'
import { TrainingLogHeatmap } from '@/components/dashboard-v3/training-log-heatmap'
import { WeekRail } from '@/components/dashboard-v3/week-rail'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { DashboardV2SeedData } from '@/hooks/use-dashboard-v2-data'
import { CookingProvider, useCooking } from '@/hooks/use-cooking-data'
import { addDays, startOfWeek } from 'date-fns'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Syncs CookingProvider's currentWeek with dashboard selectedDate */
function CookingWeekSync() {
  const { selectedDate } = useDashboardV3()
  const { setCurrentWeek, currentWeek } = useCooking()
  const targetWeek = startOfWeek(selectedDate, { weekStartsOn: 1 })

  useEffect(() => {
    if (targetWeek.getTime() !== currentWeek.getTime()) {
      setCurrentWeek(targetWeek)
    }
  }, [selectedDate, targetWeek, currentWeek, setCurrentWeek])

  return null
}

function useSwipeNav() {
  const { selectedDate, navigateToDay } = useDashboardV3()
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    startX.current = t.clientX
    startY.current = t.clientY
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current == null || startY.current == null) return
      const t = e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - startX.current
      const dy = t.clientY - startY.current
      startX.current = null
      startY.current = null
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return
      if (dx < 0) navigateToDay(addDays(selectedDate, 1), 'forward')
      else navigateToDay(addDays(selectedDate, -1), 'backward')
    },
    [selectedDate, navigateToDay]
  )

  return { onTouchStart, onTouchEnd }
}

function DashboardContent() {
  const {
    loading,
    selectedDate,
    navigateToDay,
    goToToday,
    completeRoutine,
    setActiveItem,
  } = useDashboardV3()

  const [paletteOpen, setPaletteOpen] = useState(false)
  const swipe = useSwipeNav()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'h':
        case 'H':
          e.preventDefault()
          navigateToDay(addDays(selectedDate, -1), 'backward')
          break
        case 'ArrowRight':
        case 'l':
        case 'L':
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
        case 'w':
        case 'W':
          e.preventDefault()
          setActiveItem('workout')
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedDate, navigateToDay, goToToday, completeRoutine, setActiveItem])

  return (
    <div
      className="flex flex-col h-full bg-background"
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      <CookingWeekSync />
      <HudBar onOpenCommand={() => setPaletteOpen(true)} />

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[148px_minmax(0,1fr)] xl:grid-cols-[168px_minmax(0,1fr)_320px]">
        {/* Left: week rail + training log */}
        <aside className="hidden md:flex flex-col border-r border-border overflow-y-auto overflow-x-hidden scrollbar-hide min-w-0">
          <WeekRail />
          <TrainingLogHeatmap />
        </aside>

        {/* Center: day canvas */}
        <main className="min-h-0 overflow-y-auto">
          <motion.div
            key={selectedDate.toDateString()}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="p-3 md:p-4 space-y-3"
          >
            <DayHeader />

            {/* Mobile-only: week strip across the top */}
            <div className="md:hidden rounded-md border border-border bg-card overflow-x-auto scrollbar-hide">
              <MobileWeekStrip />
            </div>

            {/* Mobile / tablet: signal chips above timeline */}
            <div className="xl:hidden flex gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3">
              <div className="min-w-[260px] shrink-0">
                <ReadinessCard />
              </div>
              <div className="min-w-[260px] shrink-0">
                <ActivityCard />
              </div>
              <div className="min-w-[260px] shrink-0">
                <LoadTrendCard />
              </div>
              <div className="min-w-[220px] shrink-0">
                <WeatherCard />
              </div>
              <div className="min-w-[200px] shrink-0">
                <StreakCard />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              <DayTimeline />
              <ActiveDetail />
            </div>

            {/* Keyboard hints */}
            <div className="hidden md:flex items-center justify-center gap-3 pt-1 pb-2 text-[9px] text-muted-foreground/50 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-border/50 font-mono">h</kbd>
                <kbd className="px-1 rounded border border-border/50 font-mono">l</kbd>
                <span>day</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-border/50 font-mono">t</kbd>
                <span>today</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-border/50 font-mono">w</kbd>
                <span>workout</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-border/50 font-mono">m</kbd>
                <kbd className="px-1 rounded border border-border/50 font-mono">n</kbd>
                <span>routines</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-border/50 font-mono">⌘K</kbd>
                <span>jump</span>
              </span>
            </div>
          </motion.div>
        </main>

        {/* Right: live signals stack (xl+ only) */}
        <aside className="hidden xl:flex flex-col border-l border-border overflow-y-auto scrollbar-hide">
          <div className="p-3 space-y-3">
            <ReadinessCard />
            <ActivityCard />
            <LoadTrendCard />
            <WeatherCard />
            <StreakCard />
          </div>
        </aside>
      </div>

      <MealStrip />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {loading && (
        <div className="absolute top-14 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border shadow-sm text-[10px] text-muted-foreground">
          <div className="size-2 rounded-full bg-accent-sage animate-pulse" />
          Syncing…
        </div>
      )}
    </div>
  )
}

function MobileWeekStrip() {
  const { selectedDate, navigateToDay, routine } = useDashboardV3()
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const DAY_KEYS: import('@/lib/types/fitness.types').DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]

  return (
    <div className="flex divide-x divide-border/40 min-w-full">
      {weekDays.map((date, i) => {
        const dayKey = DAY_KEYS[i]!
        const isActive = date.toDateString() === selectedDate.toDateString()
        const focus = routine?.schedule[dayKey]?.focus || 'Rest'
        return (
          <button
            key={dayKey}
            type="button"
            onClick={() => {
              const dir = date > selectedDate ? 'forward' : 'backward'
              navigateToDay(date, dir)
            }}
            className={`flex-1 px-2 py-2 text-left min-w-[76px] ${isActive ? 'bg-muted/40' : 'hover:bg-muted/20'}`}
          >
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {date.toLocaleDateString('en', { weekday: 'short' })}
            </div>
            <div className="text-sm font-bold tabular-nums mt-0.5">
              {date.getDate()}
            </div>
            <div className="text-[8px] text-muted-foreground/80 truncate">
              {focus}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function DashboardV3({ seed }: { seed?: DashboardV2SeedData }) {
  return (
    <DashboardV3Provider seed={seed}>
      <CookingProvider
        initialRecipes={seed?.data.recipes}
        initialMealPlan={seed?.data.mealPlan}
        initialShoppingList={seed?.data.shoppingList}
        initialFridgeScan={seed?.data.latestFridgeScan}
      >
        <TooltipProvider delayDuration={300}>
          <DashboardContent />
        </TooltipProvider>
      </CookingProvider>
    </DashboardV3Provider>
  )
}
