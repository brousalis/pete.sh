import { TodayHero } from '@/components/dashboard/today-hero'
import { CoffeeCard } from '@/components/dashboard/coffee-card'
import { CalendarCard } from '@/components/dashboard/calendar-card'
import { TransportationCard } from '@/components/dashboard/transportation-card'
import { HomeEnvironmentCard } from '@/components/dashboard/home-environment-card'
import { WeatherCard } from '@/components/dashboard/weather-card'

export function MainDashboard() {
  return (
    <div className="space-y-5">
      {/* Hero: Today at a Glance */}
      <TodayHero />

      {/* Row 1: Weather + Getting Around (Above the fold) */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Weather */}
        <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
          <WeatherCard />
        </section>

        {/* Transportation */}
        <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
          <TransportationCard />
        </section>
      </div>

      {/* Row 2: Home Controls + Calendar */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Home Controls */}
        <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
          <HomeEnvironmentCard />
        </section>

        {/* Calendar */}
        <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
          <CalendarCard />
        </section>
      </div>

      {/* Row 3: Coffee */}
      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <CoffeeCard />
      </section>
    </div>
  )
}
