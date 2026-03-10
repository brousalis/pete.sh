import type { DayOfWeek, WeeklyRoutine } from '@/lib/types/fitness.types'
import {
  Calendar,
  Dumbbell,
  Flame,
  Sun,
  Target,
  Zap,
} from 'lucide-react'
import { isSameDay } from 'date-fns'
import { FOCUS_ACCENT, TW } from '@/lib/constants/colors'

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

export const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export interface FocusConfigEntry {
  icon: typeof Dumbbell
  color: string
  bg: string
  ring: string
  accent: string
}

const FOCUS_ICONS: Record<string, typeof Dumbbell> = {
  Strength: Dumbbell,
  'Core/Posture': Target,
  Core: Target,
  Hybrid: Zap,
  Endurance: Flame,
  Circuit: Zap,
  HIIT: Flame,
  Rest: Calendar,
  'Active Recovery': Sun,
}

export const FOCUS_CONFIG: Record<string, FocusConfigEntry> = Object.fromEntries(
  Object.entries(FOCUS_ACCENT).map(([focus, accent]) => {
    const tw = TW[accent]
    return [focus, {
      icon: FOCUS_ICONS[focus] ?? Calendar,
      color: tw.text,
      bg: tw.bg10,
      ring: `ring-accent-${accent}/30`,
      accent: tw.bg,
    }]
  })
)

export const FOCUS_CONFIG_FALLBACK: FocusConfigEntry = {
  icon: Calendar,
  color: 'text-muted-foreground',
  bg: 'bg-muted',
  ring: 'ring-muted',
  accent: 'bg-muted-foreground',
}

export type FitnessStatus = 'complete' | 'partial' | 'missed' | 'rest' | 'future' | 'skipped'

export interface FitnessStatusDetails {
  workout: boolean
  workoutSkipped: boolean
  morning: boolean
  morningSkipped: boolean
  night: boolean
  nightSkipped: boolean
  isRest: boolean
  skipped: boolean
  skippedReason?: string
}

export function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  )
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

export function getFitnessStatusForDay(
  date: Date,
  routine: WeeklyRoutine | null | undefined
): { status: FitnessStatus; details: FitnessStatusDetails } {
  const defaultDetails: FitnessStatusDetails = { workout: false, workoutSkipped: false, morning: false, morningSkipped: false, night: false, nightSkipped: false, isRest: false, skipped: false }
  if (!routine) return { status: 'future', details: defaultDetails }

  const dayOfWeek = date
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as DayOfWeek
  const weekNumber = getWeekNumber(date)
  const schedule = routine.schedule[dayOfWeek]
  const week = routine.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]

  const isRestDay =
    schedule?.focus === 'Rest' || schedule?.focus === 'Active Recovery'
  const isToday = isSameDay(date, new Date())
  const isFutureDate = date > new Date()

  const workoutDone = dayData?.workout?.completed ?? false
  const workoutSkipped = dayData?.workout?.skipped ?? false
  const morningDone = dayData?.morningRoutine?.completed ?? false
  const morningExplicitlySkipped = dayData?.morningRoutine?.skipped ?? false
  const nightDone = dayData?.nightRoutine?.completed ?? false
  const nightExplicitlySkipped = dayData?.nightRoutine?.skipped ?? false

  const morningSkipped = morningExplicitlySkipped || (workoutSkipped && !morningDone)
  const nightSkipped = nightExplicitlySkipped || (workoutSkipped && !nightDone)

  const details: FitnessStatusDetails = {
    workout: workoutDone,
    workoutSkipped: workoutSkipped,
    morning: morningDone,
    morningSkipped: morningSkipped,
    night: nightDone,
    nightSkipped: nightSkipped,
    isRest: isRestDay,
    skipped: workoutSkipped || morningExplicitlySkipped || nightExplicitlySkipped,
    skippedReason: dayData?.workout?.skippedReason || dayData?.morningRoutine?.skippedReason || dayData?.nightRoutine?.skippedReason,
  }

  if (isFutureDate && !isToday) {
    return { status: 'future', details }
  }

  const allSkipped = isRestDay
    ? (morningSkipped && nightSkipped) && !morningDone && !nightDone
    : (workoutSkipped || !schedule?.workout) && morningSkipped && nightSkipped && !workoutDone && !morningDone && !nightDone

  if (allSkipped) {
    return { status: 'skipped', details }
  }

  if (workoutSkipped && !isRestDay && !workoutDone) {
    return { status: 'skipped', details }
  }

  if (isRestDay) {
    if (morningDone && nightDone) return { status: 'complete', details }
    if (morningDone || nightDone) return { status: 'partial', details }
    if (morningSkipped && nightSkipped) return { status: 'skipped', details }
    if (!isToday && !isFutureDate) return { status: 'missed', details }
    return { status: 'rest', details }
  }

  if (workoutDone && morningDone && nightDone) return { status: 'complete', details }
  if (workoutDone || morningDone || nightDone) return { status: 'partial', details }
  if (!isToday && !isFutureDate) return { status: 'missed', details }
  return { status: 'future', details }
}

export function getDayCompletionProgress(details: FitnessStatusDetails, isRestDay: boolean): number {
  const items = isRestDay
    ? [details.morning, details.night]
    : [details.morning, details.workout, details.night]
  const completed = items.filter(Boolean).length
  return Math.round((completed / items.length) * 100)
}
