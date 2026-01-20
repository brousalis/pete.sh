'use client'

import { Button } from '@/components/ui/button'
import { staggerContainerVariants, staggerItemVariants, transitions } from '@/lib/animations'
import { motion } from 'framer-motion'
import { Home } from 'lucide-react'
import Link from 'next/link'
import { DeckCalendar } from './deck-calendar'
import { DeckClock } from './deck-clock'
import { DeckFitness } from './deck-fitness'
import { DeckLights } from './deck-lights'
import { DeckMusic } from './deck-music'
import { DeckTransit } from './deck-transit'
import { DeckWeather } from './deck-weather'

// Animated wrapper for deck cards
function DeckCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={staggerItemVariants}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={transitions.springGentle}
    >
      {children}
    </motion.div>
  )
}

export function DeckDashboard() {
  return (
    <motion.div
      className="flex h-full w-full flex-col overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={staggerContainerVariants}
    >
      <div className="flex h-full flex-col overflow-hidden p-1">
        {/* Navigation Button */}
        <motion.div
          className="mb-0.5 flex shrink-0 justify-end"
          variants={staggerItemVariants}
        >
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-8 min-h-[44px] touch-manipulation gap-1.5 px-2 text-xs"
            >
              <Home className="size-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </motion.div>

        {/* Top Row: Clock and Weather */}
        <motion.div
          className="mb-0.5 grid shrink-0 grid-cols-1 gap-1 sm:grid-cols-3"
          variants={staggerContainerVariants}
        >
          <DeckCard>
            <div className="sm:col-span-2">
              <DeckClock />
            </div>
          </DeckCard>
          <DeckCard>
            <DeckWeather />
          </DeckCard>
        </motion.div>

        {/* Main Grid: Control Buttons - Optimized for iPad mini */}
        <motion.div
          className="grid min-h-0 flex-1 grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-3"
          variants={staggerContainerVariants}
        >
          <DeckCard>
            <DeckLights />
          </DeckCard>
          <DeckCard>
            <DeckMusic />
          </DeckCard>
          <DeckCard>
            <DeckCalendar />
          </DeckCard>
          <DeckCard>
            <DeckTransit />
          </DeckCard>
          <DeckCard>
            <DeckFitness />
          </DeckCard>
        </motion.div>
      </div>
    </motion.div>
  )
}
