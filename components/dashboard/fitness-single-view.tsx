"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, AlertTriangle, Flame, Target, ChevronDown, Circle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { StretchPanel } from "@/components/dashboard/stretch-panel"
import { WorkoutCenter } from "@/components/dashboard/workout-center"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type {
  WeeklyRoutine,
  DayOfWeek,
  Workout,
  ConsistencyStats
} from "@/lib/types/fitness.types"

const DAYS_OF_WEEK: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

/**
 * FitnessSingleView - A compact single-view fitness dashboard optimized for iPad Mini landscape.
 *
 * Layout: 3-panel design with morning/night stretch sidebars and central workout area
 * Target: 1024 x 768px (iPad Mini landscape)
 *
 * Features:
 * - Morning routine panel (left)
 * - Workout center (middle, larger)
 * - Night routine panel (right)
 * - Consistency bar (bottom)
 * - Single video at a time
 * - Timer with audio cues
 */
export function FitnessSingleView() {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null)
  const [selectedDayWorkout, setSelectedDayWorkout] = useState<Workout | null>(null)
  const [consistencyStats, setConsistencyStats] = useState<ConsistencyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [completingMorning, setCompletingMorning] = useState(false)
  const [completingNight, setCompletingNight] = useState(false)
  const [completingWorkout, setCompletingWorkout] = useState(false)
  const [openVideoId, setOpenVideoId] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null)
  const [dayPickerOpen, setDayPickerOpen] = useState(false)

  const getCurrentDay = (): DayOfWeek => {
    return new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek
  }

  const getCurrentWeekNumber = (): number => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  const today = getCurrentDay()
  const isViewingToday = selectedDay === null || selectedDay === today
  const viewingDay = selectedDay || today

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const day = getCurrentDay()
      const [routineRes, workoutRes, consistencyRes] = await Promise.all([
        fetch("/api/fitness/routine"),
        fetch(`/api/fitness/workout/${day}`),
        fetch("/api/fitness/consistency"),
      ])

      if (routineRes.ok) {
        const data = await routineRes.json()
        if (data.success) setRoutine(data.data)
      }

      if (workoutRes.ok) {
        const data = await workoutRes.json()
        if (data.success && data.data) setTodayWorkout(data.data)
      }

      if (consistencyRes.ok) {
        const data = await consistencyRes.json()
        if (data.success) setConsistencyStats(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch fitness data", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch workout for selected day
  const fetchSelectedDayWorkout = useCallback(async (day: DayOfWeek) => {
    try {
      const response = await fetch(`/api/fitness/workout/${day}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setSelectedDayWorkout(data.data)
        } else {
          setSelectedDayWorkout(null)
        }
      }
    } catch (error) {
      console.error("Failed to fetch workout for day", error)
      setSelectedDayWorkout(null)
    }
  }, [])

  // Handle day selection
  const handleDaySelect = (day: DayOfWeek) => {
    if (day === today) {
      setSelectedDay(null)
      setSelectedDayWorkout(null)
    } else {
      setSelectedDay(day)
      fetchSelectedDayWorkout(day)
    }
    setDayPickerOpen(false)
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle morning routine completion
  const handleMorningComplete = async () => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()
    setCompletingMorning(true)

    try {
      const response = await fetch(`/api/fitness/routine/morning/complete?day=${day}&week=${weekNumber}`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed")
      await fetchData()
      toast.success("Morning routine completed!")
    } catch {
      toast.error("Failed to complete routine")
    } finally {
      setCompletingMorning(false)
    }
  }

  // Handle night routine completion
  const handleNightComplete = async () => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()
    setCompletingNight(true)

    try {
      const response = await fetch(`/api/fitness/routine/night/complete?day=${day}&week=${weekNumber}`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed")
      await fetchData()
      toast.success("Night routine completed!")
    } catch {
      toast.error("Failed to complete routine")
    } finally {
      setCompletingNight(false)
    }
  }

  // Handle morning routine uncomplete
  const handleMorningUncomplete = async () => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()
    setCompletingMorning(true)

    try {
      const response = await fetch(`/api/fitness/routine/morning/complete?day=${day}&week=${weekNumber}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed")
      await fetchData()
      toast.success("Morning routine unmarked")
    } catch {
      toast.error("Failed to uncomplete routine")
    } finally {
      setCompletingMorning(false)
    }
  }

  // Handle night routine uncomplete
  const handleNightUncomplete = async () => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()
    setCompletingNight(true)

    try {
      const response = await fetch(`/api/fitness/routine/night/complete?day=${day}&week=${weekNumber}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed")
      await fetchData()
      toast.success("Night routine unmarked")
    } catch {
      toast.error("Failed to uncomplete routine")
    } finally {
      setCompletingNight(false)
    }
  }

  // Handle workout completion
  const handleWorkoutComplete = async (exercisesCompleted: string[]) => {
    const day = getCurrentDay()
    setCompletingWorkout(true)

    try {
      const response = await fetch(`/api/fitness/workout/${day}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercisesCompleted }),
      })
      if (!response.ok) throw new Error("Failed")
      await fetchData()
      toast.success("Workout completed!")
    } catch {
      toast.error("Failed to complete workout")
    } finally {
      setCompletingWorkout(false)
    }
  }

  // Handle video toggle - only one video at a time
  const handleVideoToggle = (videoId: string | null) => {
    setOpenVideoId(videoId)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading fitness data...</div>
      </div>
    )
  }

  if (!routine) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">No routine data found</div>
      </div>
    )
  }

  const weekNumber = getCurrentWeekNumber()
  const week = routine.weeks.find((w) => w.weekNumber === weekNumber)
  const todayData = week?.days[today]
  const viewingDaySchedule = routine.schedule[viewingDay]
  const todaySchedule = routine.schedule[today]
  const viewingDayName = viewingDay.charAt(0).toUpperCase() + viewingDay.slice(1)
  const hasInjuryProtocol = routine.injuryProtocol?.status === "active"
  const isViewingRestDay = viewingDaySchedule?.focus === "Rest" || viewingDaySchedule?.focus === "Active Recovery"

  // Get the appropriate workout to display
  const displayWorkout = isViewingToday ? todayWorkout : selectedDayWorkout

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Popover open={dayPickerOpen} onOpenChange={setDayPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 gap-1.5 font-semibold",
                  !isViewingToday && "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                )}
              >
                <Calendar className="size-4" />
                {viewingDayName}
                <ChevronDown className="size-3 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((day) => {
                  const daySchedule = routine.schedule[day]
                  const isToday = day === today
                  const isSelected = day === viewingDay
                  const isRest = daySchedule?.focus === "Rest"

                  return (
                    <button
                      key={day}
                      onClick={() => handleDaySelect(day)}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-md text-center transition-colors min-w-[48px]",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                        isToday && !isSelected && "ring-1 ring-primary/50"
                      )}
                    >
                      <span className="text-[10px] font-medium">{DAY_LABELS[day]}</span>
                      <span className={cn(
                        "text-[9px] mt-0.5",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {isRest ? "Rest" : daySchedule?.focus?.slice(0, 4)}
                      </span>
                      {isToday && (
                        <Circle className={cn(
                          "size-1.5 mt-0.5 fill-current",
                          isSelected ? "text-primary-foreground" : "text-primary"
                        )} />
                      )}
                    </button>
                  )
                })}
              </div>
              {!isViewingToday && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={() => handleDaySelect(today)}
                >
                  Back to Today
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-muted-foreground text-sm">{format(new Date(), "MMM d")}</span>
          <span className="text-muted-foreground text-sm hidden sm:inline">·</span>
          <span className="text-sm text-foreground/80 hidden sm:inline">{viewingDaySchedule?.focus}</span>

          {!isViewingToday && (
            <Badge variant="secondary" className="text-[10px] h-5 ml-1">
              Preview
            </Badge>
          )}
        </div>
        {hasInjuryProtocol && (
          <Badge variant="destructive" className="gap-1 text-xs shrink-0">
            <AlertTriangle className="size-3" />
            <span className="hidden sm:inline">Injury Protocol</span>
            <span className="sm:hidden">Injury</span>
          </Badge>
        )}
      </div>

      {/* Main 3-Panel Layout */}
      <div className="flex-1 grid grid-cols-[200px_1fr_200px] gap-3 min-h-0">
        {/* Morning Panel - Always shows today's data */}
        <StretchPanel
          routine={routine.dailyRoutines.morning}
          type="morning"
          completion={todayData?.morningRoutine}
          onComplete={handleMorningComplete}
          onUncomplete={handleMorningUncomplete}
          isCompleting={completingMorning}
        />

        {/* Workout Center - Shows selected day's workout */}
        <WorkoutCenter
          workout={isViewingRestDay ? null : displayWorkout}
          day={viewingDay}
          focus={viewingDaySchedule?.focus}
          goal={viewingDaySchedule?.goal}
          completion={isViewingToday ? todayData?.workout : undefined}
          hasInjuryProtocol={hasInjuryProtocol}
          onComplete={handleWorkoutComplete}
          isCompleting={completingWorkout}
          openVideoId={openVideoId}
          onVideoToggle={handleVideoToggle}
          isPreview={!isViewingToday}
        />

        {/* Night Panel - Always shows today's data */}
        <StretchPanel
          routine={routine.dailyRoutines.night}
          type="night"
          completion={todayData?.nightRoutine}
          onComplete={handleNightComplete}
          onUncomplete={handleNightUncomplete}
          isCompleting={completingNight}
        />
      </div>

      {/* Compact Consistency Bar */}
      {consistencyStats && (
        <div className="mt-3 shrink-0">
          <ConsistencyBar stats={consistencyStats} />
        </div>
      )}
    </div>
  )
}

// Compact Consistency Bar Component
interface ConsistencyBarProps {
  stats: ConsistencyStats
}

function ConsistencyBar({ stats }: ConsistencyBarProps) {
  return (
    <div className="flex items-center gap-4 sm:gap-6 p-2.5 rounded-lg bg-muted/30 border">
      {/* Streaks */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Flame className="size-4 text-orange-500" />
          <div>
            <div className="text-base font-bold leading-none">{stats.currentStreak}</div>
            <div className="text-[9px] text-muted-foreground">Current Streak</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="size-4 text-blue-500" />
          <div>
            <div className="text-base font-bold leading-none">{stats.longestStreak}</div>
            <div className="text-[9px] text-muted-foreground">Longest Streak</div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Progress Bars */}
      <div className="flex-1 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span className="text-muted-foreground">Week</span>
            <span className="font-medium">{stats.weeklyCompletion}%</span>
          </div>
          <Progress value={stats.weeklyCompletion} className="h-1" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] mb-0.5">
            <span className="text-muted-foreground">Month</span>
            <span className="font-medium">{stats.monthlyCompletion}%</span>
          </div>
          <Progress value={stats.monthlyCompletion} className="h-1" />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border hidden sm:block" />

      {/* Routine Stats */}
      <div className="hidden sm:flex items-center gap-3 text-center">
        <div>
          <div className="text-sm font-semibold">{stats.streaks.workouts}</div>
          <div className="text-[9px] text-muted-foreground">Workouts</div>
        </div>
        <div>
          <div className="text-sm font-semibold">{stats.streaks.morningRoutines}</div>
          <div className="text-[9px] text-muted-foreground">AM</div>
        </div>
        <div>
          <div className="text-sm font-semibold">{stats.streaks.nightRoutines}</div>
          <div className="text-[9px] text-muted-foreground">PM</div>
        </div>
      </div>
    </div>
  )
}
