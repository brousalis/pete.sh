import { LargeClock } from "@/components/dashboard/large-clock"
import { WeatherDisplay } from "@/components/dashboard/weather-display"
import { HueControls } from "@/components/dashboard/hue-controls"
import { SonosControls } from "@/components/dashboard/sonos-controls"
import { WeatherWidget } from "@/components/dashboard/weather-widget"
import { WeatherForecast } from "@/components/dashboard/weather-forecast"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { CTATransit } from "@/components/dashboard/cta-transit"
import { FitnessDashboardWidget } from "@/components/dashboard/fitness-dashboard-widget"
import { LyftRequest } from "@/components/dashboard/lyft-request"
import { DesktopControls } from "@/components/dashboard/desktop-controls"
import { CoffeeBrewingAssistant } from "@/components/dashboard/coffee-brewing-assistant"

export function MainDashboard() {
  return (
    <div className="space-y-5">
      <LargeClock />
      <WeatherDisplay />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left big column */}
        <div className="space-y-5 lg:col-span-2">
          {/* HUE Lights */}
          <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
            <HueControls />
          </section>

          {/* Sonos Music */}
          <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
            <SonosControls />
          </section>

          {/* Weather Forecast */}
          <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
            <WeatherForecast />
          </section>

          {/* CTA Transit */}
          <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
            <CTATransit />
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <WeatherWidget />
          <CalendarView />
          <LyftRequest />
          <DesktopControls />
        </div>
      </div>

      {/* Coffee Brewing Assistant - Full Width Row */}
      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <CoffeeBrewingAssistant />
      </section>

      {/* Fitness Dashboard Widget */}
      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <FitnessDashboardWidget />
      </section>
    </div>
  )
}
