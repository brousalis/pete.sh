'use client'

import { CommandBar } from '@/components/dashboard-v2/command-bar'
import { ContextPanel } from '@/components/dashboard-v2/context-panel'
import {
  DashboardV2Provider,
  useDashboardV2,
} from '@/components/dashboard-v2/dashboard-v2-provider'
import { DayFlowMobile } from '@/components/dashboard-v2/day-flow-mobile'
import {
  CommandBarSkeleton,
  ContextPanelSkeleton,
  WeekHorizonSkeleton,
  WorkoutStageSkeleton,
} from '@/components/dashboard-v2/skeletons'
import { WeekHorizon } from '@/components/dashboard-v2/week-horizon'
import { WorkoutStage } from '@/components/dashboard-v2/workout-stage'
import { AnimatePresence, motion } from 'framer-motion'
import { addDays } from 'date-fns'
import { useEffect } from 'react'

function DashboardContent() {
  const {
    loading,
    selectedDate,
    navDirection,
    navigateToDay,
    goToToday,
    completeRoutine,
  } = useDashboardV2()

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

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <CommandBarSkeleton />
        <WeekHorizonSkeleton />
        <div className="flex-1 min-h-0 grid md:grid-cols-[1fr_320px] xl:grid-cols-[1fr_350px] overflow-hidden">
          <div className="p-3 overflow-y-auto">
            <WorkoutStageSkeleton />
          </div>
          <div className="hidden md:block border-l border-white/[0.04] overflow-y-auto">
            <ContextPanelSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <CommandBar />
      <WeekHorizon />
      <DayFlowMobile />

      {/* 2-column: workout stage + context panel */}
      <div className="flex-1 min-h-0 grid md:grid-cols-[1fr_320px] xl:grid-cols-[1fr_350px] 2xl:grid-cols-[1fr_380px] overflow-hidden">
        {/* Center: Workout Stage */}
        <div className="overflow-y-auto scrollbar-hide p-3">
          <AnimatePresence mode="wait" custom={navDirection}>
            <motion.div
              key={selectedDate.toISOString()}
              initial={{
                x: navDirection === 'forward' ? 150 : navDirection === 'backward' ? -150 : 0,
                opacity: 0,
              }}
              animate={{ x: 0, opacity: 1 }}
              exit={{
                x: navDirection === 'forward' ? -150 : 150,
                opacity: 0,
              }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="h-full"
            >
              <WorkoutStage />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Context Panel */}
        <div className="hidden md:flex md:flex-col border-l border-white/[0.04] overflow-hidden min-w-0">
          <ContextPanel />
        </div>
      </div>

      {/* Mobile: context panel stacked */}
      <div className="md:hidden">
        <ContextPanel />
      </div>
    </div>
  )
}

export function DashboardV2() {
  return (
    <DashboardV2Provider>
      <DashboardContent />
    </DashboardV2Provider>
  )
}
