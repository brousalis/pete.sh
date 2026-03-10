'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { ActivitySummary } from '@/components/dashboard-v2/activity-summary'
import { EventList } from '@/components/dashboard-v2/event-list'
import { MealSpotlight } from '@/components/dashboard-v2/meal-spotlight'
import { NowPlayingBar } from '@/components/dashboard-v2/now-playing-bar'
import { ProgressRing } from '@/components/dashboard-v2/progress-ring'
import { QuickActions } from '@/components/dashboard-v2/quick-actions'
import { ShoppingSummary } from '@/components/dashboard-v2/shopping-summary'
import { motion } from 'framer-motion'
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations'

export function ContextPanel() {
  const {
    routine,
    dayOfWeek,
    weekNumber,
    isRestDay,
  } = useDashboardV2()

  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]

  const morningDone = dayData?.morningRoutine?.completed || false
  const workoutDone = dayData?.workout?.completed || false
  const nightDone = dayData?.nightRoutine?.completed || false

  const segments = [
    {
      label: 'Morning stretch',
      completed: morningDone,
      color: 'stroke-accent-gold',
    },
    ...(isRestDay
      ? []
      : [
          {
            label: 'Workout',
            completed: workoutDone,
            color: 'stroke-accent-ember',
          },
        ]),
    {
      label: 'Night stretch',
      completed: nightDone,
      color: 'stroke-accent-violet',
    },
  ]

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide">
      <motion.div
        className="flex flex-col gap-2.5 p-2.5"
        initial="hidden"
        animate="visible"
        variants={staggerContainerVariants}
      >
        <motion.div variants={staggerItemVariants}>
          <QuickActions />
        </motion.div>

        <motion.div variants={staggerItemVariants}>
          <ProgressRing segments={segments} />
        </motion.div>

        <motion.div variants={staggerItemVariants}>
          <ActivitySummary />
        </motion.div>

        <motion.div variants={staggerItemVariants}>
          <MealSpotlight />
        </motion.div>

        <motion.div variants={staggerItemVariants}>
          <ShoppingSummary />
        </motion.div>

        <motion.div variants={staggerItemVariants}>
          <EventList />
        </motion.div>

        <motion.div variants={staggerItemVariants}>
          <NowPlayingBar />
        </motion.div>
      </motion.div>
    </div>
  )
}
