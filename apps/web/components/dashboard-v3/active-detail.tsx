'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { MealDetail } from '@/components/dashboard-v3/detail/meal-detail'
import { RoutineDetail } from '@/components/dashboard-v3/detail/routine-detail'
import { WorkoutDetail } from '@/components/dashboard-v3/detail/workout-detail'
import { AnimatePresence, motion } from 'framer-motion'

export function ActiveDetail() {
  const { activeItem } = useDashboardV3()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeItem ?? 'none'}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {activeItem === 'morning' && <RoutineDetail type="morning" />}
        {activeItem === 'night' && <RoutineDetail type="night" />}
        {activeItem === 'workout' && <WorkoutDetail />}
        {activeItem === 'breakfast' && <MealDetail meal="breakfast" />}
        {activeItem === 'lunch' && <MealDetail meal="lunch" />}
        {activeItem === 'dinner' && <MealDetail meal="dinner" />}
        {!activeItem && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Select a block from the timeline
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
