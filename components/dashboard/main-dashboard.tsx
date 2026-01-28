'use client'

import { CalendarCard } from '@/components/dashboard/calendar-card'
import { CoffeeCard } from '@/components/dashboard/coffee-card'
import { CookingWidget } from '@/components/dashboard/cooking-widget'
import { FitnessWidget } from '@/components/dashboard/fitness-widget'
import { HomeEnvironmentCard } from '@/components/dashboard/home-environment-card'
import { SpotifyWidget } from '@/components/dashboard/spotify-widget'
import { TodayHero } from '@/components/dashboard/today-hero'
import { TransportationCard } from '@/components/dashboard/transportation-card'
import { WeatherCard } from '@/components/dashboard/weather-card'
import { staggerContainerVariants, staggerItemVariants, transitions } from '@/lib/animations'
import { motion } from 'framer-motion'
import Masonry from 'react-masonry-css'

// Animated section wrapper for dashboard cards
function DashboardCard({
  children,
  index,
}: {
  children: React.ReactNode
  index: number
}) {
  return (
    <motion.section
      variants={staggerItemVariants}
      whileHover={{ y: -2, scale: 1.005 }}
      transition={transitions.springGentle}
      className="bg-card ring-border mb-5 rounded-2xl p-5 shadow-sm ring-1"
    >
      {children}
    </motion.section>
  )
}

export function MainDashboard() {
  const breakpointColumnsObj = {
    default: 2,
    640: 1, // 1 column on mobile (screens < 640px)
  }

  return (
    <motion.div
      className="space-y-5"
      initial="hidden"
      animate="visible"
      variants={staggerContainerVariants}
    >
      {/* Hero: Today at a Glance */}
      <motion.div variants={staggerItemVariants}>
        <TodayHero />
      </motion.div>

      {/* Masonry Grid */}
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="-ml-5 flex w-auto"
        columnClassName="pl-5 bg-clip-padding"
      >
        {/* Weather */}
        <DashboardCard index={0}>
          <WeatherCard />
        </DashboardCard>

        {/* Transportation */}
        <DashboardCard index={3}>
          <TransportationCard />
        </DashboardCard>

        {/* Calendar */}
        <DashboardCard index={4}>
          <CalendarCard />
        </DashboardCard>

        {/* Spotify */}
        <DashboardCard index={1}>
          <SpotifyWidget />
        </DashboardCard>

        {/* Fitness */}
        <DashboardCard index={2}>
          <FitnessWidget />
        </DashboardCard>
        {/* Coffee */}
        <DashboardCard index={5}>
          <CoffeeCard />
        </DashboardCard>

        {/* Cooking */}
        <DashboardCard index={6}>
          <CookingWidget />
        </DashboardCard>

        {/* Home Controls */}
        <DashboardCard index={7}>
          <HomeEnvironmentCard />
        </DashboardCard>
      </Masonry>
    </motion.div>
  )
}
