'use client'

import { CalendarCard } from '@/components/dashboard/calendar-card'
import { CoffeeCard } from '@/components/dashboard/coffee-card'
import { HomeEnvironmentCard } from '@/components/dashboard/home-environment-card'
import { TodayHero } from '@/components/dashboard/today-hero'
import { TransportationCard } from '@/components/dashboard/transportation-card'
import { WeatherCard } from '@/components/dashboard/weather-card'
import Masonry from 'react-masonry-css'

export function MainDashboard() {
  const breakpointColumnsObj = {
    default: 2,
    640: 1, // 1 column on mobile (screens < 640px)
  }

  return (
    <div className="space-y-5">
      {/* Hero: Today at a Glance */}
      <TodayHero />

      {/* Masonry Grid */}
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="-ml-5 flex w-auto"
        columnClassName="pl-5 bg-clip-padding"
      >
        {/* Weather */}
        <section className="bg-card ring-border mb-5 rounded-2xl p-5 shadow-sm ring-1">
          <WeatherCard />
        </section>

        {/* Transportation */}
        <section className="bg-card ring-border mb-5 rounded-2xl p-5 shadow-sm ring-1">
          <TransportationCard />
        </section>

        {/* Calendar */}
        <section className="bg-card ring-border mb-5 rounded-2xl p-5 shadow-sm ring-1">
          <CalendarCard />
        </section>

        {/* Coffee */}
        <section className="bg-card ring-border mb-5 rounded-2xl p-5 shadow-sm ring-1">
          <CoffeeCard />
        </section>

        {/* Home Controls */}
        <section className="bg-card ring-border mb-5 rounded-2xl p-5 shadow-sm ring-1">
          <HomeEnvironmentCard />
        </section>
      </Masonry>
    </div>
  )
}
