'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Cloud, CloudRain, CloudSnow, Sun, type LucideIcon } from 'lucide-react'

function WeatherIcon({
  description,
  className,
}: {
  description: string
  className?: string
}) {
  const d = description.toLowerCase()
  let Icon: LucideIcon = Cloud
  let color = 'text-accent-slate'
  if (d.includes('sun') || d.includes('clear')) {
    Icon = Sun
    color = 'text-accent-gold'
  } else if (d.includes('rain') || d.includes('drizzle')) {
    Icon = CloudRain
    color = 'text-accent-azure'
  } else if (d.includes('snow')) {
    Icon = CloudSnow
    color = 'text-accent-teal'
  }
  return <Icon className={cn(color, className)} />
}

export function WeatherCard() {
  const { weather, forecast } = useDashboardV3()

  const tempC = weather?.properties.temperature.value
  const tempF = tempC != null ? Math.round((tempC * 9) / 5 + 32) : null
  const heatIndexC = weather?.properties.heatIndex?.value
  const windChillC = weather?.properties.windChill?.value
  const feelsLikeC = heatIndexC ?? windChillC ?? null
  const feelsLikeF =
    feelsLikeC != null ? Math.round((feelsLikeC * 9) / 5 + 32) : null
  const showFeelsLike =
    feelsLikeF != null && tempF != null && feelsLikeF !== tempF
  const conditionText = weather?.properties.textDescription || ''

  const tomorrowPeriod = forecast?.properties.periods?.find(p => {
    const start = new Date(p.startTime)
    const today = new Date()
    const delta = (start.getTime() - today.getTime()) / 86400000
    return delta > 0.5 && delta < 1.75 && p.isDaytime
  })

  if (!weather) {
    return (
    <div className="rounded-md border border-border bg-card p-3 shadow-sm ring-1 ring-border/40 ring-inset">
      <div className="flex items-center gap-1.5 mb-1.5">
          <Cloud className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold">Weather</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 py-3 text-center">
          Weather unavailable
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-sm ring-1 ring-border/40 ring-inset">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <WeatherIcon description={conditionText} className="size-3.5" />
          <span className="text-[11px] font-semibold">Weather</span>
        </div>
        <span className="text-[9px] text-muted-foreground/60 truncate max-w-[90px]">
          {conditionText}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <WeatherIcon description={conditionText} className="size-8" />
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums leading-none">
              {tempF ?? '--'}
            </span>
            <span className="text-sm text-muted-foreground">°F</span>
          </div>
          {showFeelsLike && (
            <p className="text-[9px] text-muted-foreground/70 mt-0.5">
              Feels like {feelsLikeF}°
            </p>
          )}
        </div>
      </div>

      {tomorrowPeriod && (
        <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {format(new Date(tomorrowPeriod.startTime), 'EEE')}
          </span>
          <div className="flex items-center gap-1.5">
            <WeatherIcon
              description={tomorrowPeriod.shortForecast || ''}
              className="size-3"
            />
            <span className="text-[10px] font-semibold tabular-nums">
              {tomorrowPeriod.temperature}°
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
