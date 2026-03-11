'use client'

import { useDashboardV2 } from '@/components/dashboard-v2/dashboard-v2-provider'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { getFocusConfig } from '@/lib/constants/fitness-colors'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import {
    addDays,
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Cloud,
    CloudRain,
    CloudSnow,
    Sun,
} from 'lucide-react'
import { useEffect, useState } from 'react'

function getGreeting(
  hour: number,
  focusType: string,
  isRestDay: boolean,
  morningDone: boolean,
  workoutDone: boolean,
  nightDone: boolean,
  allDone: boolean
): string {
  const timeGreeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  if (allDone) return 'Done for the day ✓'
  if (hour < 12 && !morningDone) return `${timeGreeting} — Morning stretch is ready`
  if (hour >= 10 && hour < 16 && !workoutDone && !isRestDay)
    return `${timeGreeting} — ${focusType} awaits`
  if (isRestDay && !morningDone) return `${timeGreeting} — Rest day, stretch first`
  if (isRestDay) return `${timeGreeting} — Rest day`
  if (hour >= 17 && !nightDone) return `${timeGreeting} — Night stretch pending`
  return timeGreeting
}

function WeatherIcon({ description }: { description: string }) {
  const d = description.toLowerCase()
  if (d.includes('sun') || d.includes('clear'))
    return <Sun className="size-5 text-accent-gold animate-[float_3s_ease-in-out_infinite]" />
  if (d.includes('rain') || d.includes('drizzle'))
    return <CloudRain className="size-5 text-accent-azure" />
  if (d.includes('snow'))
    return <CloudSnow className="size-5 text-accent-teal" />
  return <Cloud className="size-5 text-accent-slate" />
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function DatePickerCalendar({
  selectedDate,
  routine,
  onSelect,
  onClose,
}: {
  selectedDate: Date
  routine: ReturnType<typeof useDashboardV2>['routine']
  onSelect: (date: Date) => void
  onClose: () => void
}) {
  const [viewMonth, setViewMonth] = useState(selectedDate)

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const handleSelect = (date: Date) => {
    onSelect(date)
    onClose()
  }

  return (
    <div className="w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="icon" className="size-7" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs font-semibold">{format(viewMonth, 'MMMM yyyy')}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          disabled={isSameMonth(viewMonth, new Date())}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map(d => (
          <div key={d} className="text-[9px] font-semibold text-muted-foreground/50 text-center py-1 uppercase">
            {d}
          </div>
        ))}
      </div>

      <div className="grid gap-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0.5">
            {week.map(day => {
              const inMonth = isSameMonth(day, viewMonth)
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())
              const dayOfWeek = format(day, 'EEEE').toLowerCase() as DayOfWeek
              const focus = routine?.schedule[dayOfWeek]?.focus || 'Rest'
              const focusConfig = getFocusConfig(focus)
              const isRest = focus === 'Rest' || focus === 'Active Recovery'

              const weekNum = (() => {
                const soy = new Date(day.getFullYear(), 0, 1)
                const d = Math.floor((day.getTime() - soy.getTime()) / 86400000)
                return Math.ceil((d + soy.getDay() + 1) / 7)
              })()
              const weekData = routine?.weeks.find(w => w.weekNumber === weekNum)
              const dayData = weekData?.days[dayOfWeek]
              const morningDone = dayData?.morningRoutine?.completed
              const workoutDone = dayData?.workout?.completed
              const nightDone = dayData?.nightRoutine?.completed
              const allDone = isRest
                ? morningDone && nightDone
                : morningDone && workoutDone && nightDone
              const someDone = morningDone || workoutDone || nightDone
              const isPast = day < new Date() && !isToday

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleSelect(day)}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-md text-[11px] transition-all relative',
                    !inMonth && 'text-muted-foreground/25',
                    inMonth && !isSelected && 'text-foreground hover:bg-muted/30',
                    isSelected && 'bg-primary text-primary-foreground font-semibold',
                    isToday && !isSelected && 'ring-1 ring-primary/50',
                    isPast && allDone && !isSelected && 'bg-accent-sage/10',
                    isPast && someDone && !allDone && !isSelected && 'bg-accent-gold/10',
                  )}
                >
                  {format(day, 'd')}
                  {inMonth && !isRest && (
                    <div
                      className={cn(
                        'size-1 rounded-full mt-px',
                        isSelected ? 'bg-primary-foreground/50' : focusConfig.bg.replace('/10', '')
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-border/20 flex justify-between">
        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => handleSelect(new Date())}>
          Today
        </Button>
      </div>
    </div>
  )
}

export function CommandBar() {
  const {
    selectedDate,
    navigateToDay,
    goToToday,
    weather,
    focusType,
    isRestDay,
    routine,
    dayOfWeek,
    weekNumber,
  } = useDashboardV2()

  const [time, setTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isToday = isSameDay(selectedDate, new Date())
  const focusConfig = getFocusConfig(focusType)

  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]
  const morningDone = dayData?.morningRoutine?.completed || false
  const workoutDone = dayData?.workout?.completed || false
  const nightDone = dayData?.nightRoutine?.completed || false
  const allDone = morningDone && (workoutDone || isRestDay) && nightDone

  const tempC = weather?.properties.temperature.value
  const tempF = tempC != null ? Math.round((tempC * 9) / 5 + 32) : null
  const heatIndexC = weather?.properties.heatIndex?.value
  const windChillC = weather?.properties.windChill?.value
  const feelsLikeC = heatIndexC ?? windChillC ?? null
  const feelsLikeF =
    feelsLikeC != null ? Math.round((feelsLikeC * 9) / 5 + 32) : null
  const showFeelsLike = feelsLikeF != null && tempF != null && feelsLikeF !== tempF
  const conditionText = weather?.properties.textDescription || ''

  const greeting = mounted
    ? getGreeting(time.getHours(), focusType, isRestDay, morningDone, workoutDone, nightDone, allDone)
    : ''

  const handlePrev = () => navigateToDay(addDays(selectedDate, -1), 'backward')
  const handleNext = () => navigateToDay(addDays(selectedDate, 1), 'forward')

  const handlePickDate = (date: Date) => {
    const direction = date > selectedDate ? 'forward' : 'backward'
    navigateToDay(date, direction)
  }

  const accentLineColors: Record<string, string> = {
    Strength: 'via-accent-ember/40',
    'Core/Posture': 'via-accent-azure/40',
    Hybrid: 'via-accent-violet/40',
    Endurance: 'via-accent-rose/40',
    Circuit: 'via-accent-sage/40',
    HIIT: 'via-accent-gold/40',
    Rest: 'via-accent-slate/40',
    'Active Recovery': 'via-accent-teal/40',
  }
  const accentLine = accentLineColors[focusType] || 'via-accent-slate/40'

  return (
    <div className="relative bg-card/80 backdrop-blur-md border-b border-border">
      <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
        {/* Left: clock + greeting */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {mounted && (
            <>
              <span className="text-2xl md:text-3xl font-bold tabular-nums text-foreground">
                {format(time, 'h:mm')}
                <span className="text-base md:text-lg font-medium text-muted-foreground/50 ml-1">
                  {format(time, 'a')}
                </span>
              </span>
              <span className="hidden sm:block text-sm font-medium text-muted-foreground truncate">
                {greeting}
              </span>
            </>
          )}
        </div>

        {/* Center: date nav + picker */}
        <div className="flex items-center gap-1.5">
          <motion.button
            onClick={handlePrev}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
          </motion.button>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'text-sm font-medium min-w-[140px] text-center px-2 py-1 rounded-md transition-colors',
                  'hover:bg-muted/50',
                  isToday ? 'text-foreground' : 'text-accent-gold'
                )}
              >
                {format(selectedDate, 'EEEE, MMM d')}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="center" side="bottom">
              <DatePickerCalendar
                selectedDate={selectedDate}
                routine={routine}
                onSelect={handlePickDate}
                onClose={() => setPickerOpen(false)}
              />
            </PopoverContent>
          </Popover>

          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="size-4" />
          </motion.button>

          {/* Calendar icon */}
          <button
            onClick={() => setPickerOpen(p => !p)}
            className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Calendar className="size-4" />
          </button>

          <AnimatePresence>
            {!isToday && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="h-6 px-2.5 text-xs rounded-full"
                >
                  Today
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: weather */}
        <div className="flex items-center gap-3 justify-end flex-1">
          {weather && (
            <div className="hidden sm:flex items-center gap-2">
              <WeatherIcon description={conditionText} />
              <div className="text-right">
                <span className="text-lg font-bold tabular-nums">
                  {tempF ?? '--'}°
                </span>
                {showFeelsLike && (
                  <span className="text-[10px] text-muted-foreground/70 ml-1">
                    Feels {feelsLikeF}°
                  </span>
                )}
                <p className="text-xs text-muted-foreground">{conditionText}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Focus color accent line */}
      <div
        className={cn(
          'h-[2px] bg-gradient-to-r from-transparent to-transparent',
          accentLine
        )}
      />
    </div>
  )
}
