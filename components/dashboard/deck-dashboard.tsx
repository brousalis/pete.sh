"use client"

import Link from "next/link"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeckClock } from "./deck-clock"
import { DeckWeather } from "./deck-weather"
import { DeckLights } from "./deck-lights"
import { DeckMusic } from "./deck-music"
import { DeckCalendar } from "./deck-calendar"
import { DeckTransit } from "./deck-transit"
import { DeckFitness } from "./deck-fitness"

export function DeckDashboard() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex h-full flex-col overflow-hidden p-1">
        {/* Navigation Button */}
        <div className="mb-0.5 flex shrink-0 justify-end">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 min-h-[44px] gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground touch-manipulation"
            >
              <Home className="size-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </div>

        {/* Top Row: Clock and Weather */}
        <div className="mb-0.5 grid shrink-0 grid-cols-1 gap-1 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <DeckClock />
          </div>
          <DeckWeather />
        </div>

        {/* Main Grid: Control Buttons - Optimized for iPad mini */}
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-3">
          <DeckLights />
          <DeckMusic />
          <DeckCalendar />
          <DeckTransit />
          <DeckFitness />
        </div>
      </div>
    </div>
  )
}
