"use client"

import { useState, useEffect } from "react"
import { Sun, Moon, Dumbbell, Calendar, AlertTriangle, Check, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { WeeklyRoutine, DayOfWeek, Workout, DailyRoutine, RoutineCompletion } from "@/lib/types/fitness.types"
import { apiGet, apiPost } from "@/lib/api/client"

const MAX_VISIBLE_EXERCISES = 4

export function FitnessDailyView() {
  const [routine, setRoutine] = useState<WeeklyRoutine | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)

  const getCurrentDay = (): DayOfWeek => {
    return new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as DayOfWeek
  }

  const getCurrentWeekNumber = (): number => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [routineRes, workoutRes] = await Promise.all([
          apiGet<WeeklyRoutine>("/api/fitness/routine"),
          apiGet<Workout>(`/api/fitness/workout/${getCurrentDay()}`)
        ])

        if (routineRes.success && routineRes.data) {
          setRoutine(routineRes.data)
        }

        if (workoutRes.success && workoutRes.data) {
          setTodayWorkout(workoutRes.data)
        }
      } catch (error) {
        console.error("Failed to fetch fitness data", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleRoutineComplete = async (type: "morning" | "night") => {
    const day = getCurrentDay()
    const weekNumber = getCurrentWeekNumber()

    try {
      const response = await apiPost(`/api/fitness/routine/${type}/complete?day=${day}&week=${weekNumber}`)
      if (!response.success) throw new Error("Failed to mark routine complete")

      // Refresh routine data
      const routineRes = await apiGet<WeeklyRoutine>("/api/fitness/routine")
      if (routineRes.success && routineRes.data) {
        setRoutine(routineRes.data)
      }
      
      toast.success(`${type === "morning" ? "Morning" : "Night"} routine completed!`)
    } catch (error) {
      toast.error("Failed to complete routine")
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-sm text-muted-foreground text-center">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!routine) {
    return null
  }

  const today = getCurrentDay()
  const weekNumber = getCurrentWeekNumber()
  const week = routine.weeks.find((w) => w.weekNumber === weekNumber)
  const todayData = week?.days[today]
  const scheduleInfo = routine.schedule[today]
  const dayName = today.charAt(0).toUpperCase() + today.slice(1)
  const isActiveRecovery = scheduleInfo?.focus === "Active Recovery" || scheduleInfo?.focus === "Rest"

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Calendar className="size-4 text-muted-foreground shrink-0" />
          <span className="font-semibold">{dayName}</span>
          <span className="text-muted-foreground text-sm hidden xs:inline">·</span>
          <span className="text-muted-foreground text-sm hidden xs:inline">{format(new Date(), "MMM d")}</span>
          <span className="text-muted-foreground text-sm hidden sm:inline">· {scheduleInfo?.focus}</span>
        </div>
        {routine.injuryProtocol.status === "active" && (
          <Badge variant="destructive" className="gap-1 text-xs shrink-0">
            <AlertTriangle className="size-3" />
            <span className="hidden sm:inline">Injury Protocol</span>
            <span className="sm:hidden">Injury</span>
          </Badge>
        )}
      </div>

      {/* 3-Column Daily Cards - optimized for iPad (768px+) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {/* Morning Routine Card */}
        <RoutineCard
          routine={routine.dailyRoutines.morning}
          completion={todayData?.morningRoutine}
          onComplete={() => handleRoutineComplete("morning")}
          icon={<Sun className="size-4" />}
          iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />

        {/* Night Routine Card */}
        <RoutineCard
          routine={routine.dailyRoutines.night}
          completion={todayData?.nightRoutine}
          onComplete={() => handleRoutineComplete("night")}
          icon={<Moon className="size-4" />}
          iconBg="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        />

        {/* Workout Card */}
        {todayWorkout && !isActiveRecovery ? (
          <WorkoutCard
            workout={todayWorkout}
            completion={todayData?.workout}
            day={today}
          />
        ) : (
          <RestDayCard goal={scheduleInfo?.goal} />
        )}
      </div>
    </div>
  )
}

// Routine Card Component (Morning/Night)
interface RoutineCardProps {
  routine: DailyRoutine
  completion?: RoutineCompletion
  onComplete: () => void
  icon: React.ReactNode
  iconBg: string
}

function RoutineCard({ routine, completion, onComplete, icon, iconBg }: RoutineCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const isCompleted = completion?.completed || false
  const visibleExercises = routine.exercises.slice(0, MAX_VISIBLE_EXERCISES)
  const remainingCount = routine.exercises.length - MAX_VISIBLE_EXERCISES

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await onComplete()
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <Card className={cn(
      "flex flex-col h-full",
      isCompleted && "bg-green-500/5 border-green-500/20"
    )}>
      <CardContent className="flex flex-col flex-1 p-2.5 sm:p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("rounded-md p-1.5", iconBg)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{routine.name}</div>
            <div className="text-xs text-muted-foreground">{routine.duration}m</div>
          </div>
          {isCompleted && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs shrink-0">
              Done
            </Badge>
          )}
        </div>

        {/* Exercise List */}
        <div className="flex-1 space-y-1.5 mb-3">
          {visibleExercises.map((exercise, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <Checkbox 
                checked={isCompleted} 
                disabled 
                className="size-3.5 rounded-sm"
              />
              <span className={cn(
                "truncate text-xs",
                isCompleted && "text-muted-foreground line-through"
              )}>
                {exercise.name}
              </span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="text-xs text-muted-foreground pl-5">
              +{remainingCount} more
            </div>
          )}
        </div>

        {/* Action Button */}
        {!isCompleted && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            onClick={handleComplete}
            disabled={isCompleting}
          >
            {isCompleting ? "..." : "Complete"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Workout Card Component
interface WorkoutCardProps {
  workout: Workout
  completion?: { completed: boolean; completedAt?: string }
  day: DayOfWeek
}

function WorkoutCard({ workout, completion, day }: WorkoutCardProps) {
  const isCompleted = completion?.completed || false
  const visibleExercises = workout.exercises.slice(0, MAX_VISIBLE_EXERCISES)
  const remainingCount = workout.exercises.length - MAX_VISIBLE_EXERCISES

  return (
    <Link href={`/fitness/workout/${day}`} className="block h-full">
      <Card className={cn(
        "flex flex-col h-full transition-colors hover:bg-muted/50",
        isCompleted && "bg-green-500/5 border-green-500/20"
      )}>
        <CardContent className="flex flex-col flex-1 p-2.5 sm:p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-md p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Dumbbell className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{workout.name}</div>
              <div className="text-xs text-muted-foreground">
                {workout.exercises.length} exercises
              </div>
            </div>
            {isCompleted ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs shrink-0">
                Done
              </Badge>
            ) : (
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            )}
          </div>

          {/* Exercise List */}
          <div className="flex-1 space-y-1.5 mb-3">
            {visibleExercises.map((exercise) => (
              <div key={exercise.id} className="flex items-center gap-2 text-sm">
                <Checkbox 
                  checked={isCompleted} 
                  disabled 
                  className="size-3.5 rounded-sm"
                />
                <span className={cn(
                  "truncate text-xs",
                  isCompleted && "text-muted-foreground line-through"
                )}>
                  {exercise.name}
                </span>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="text-xs text-muted-foreground pl-5">
                +{remainingCount} more
              </div>
            )}
          </div>

          {/* Action Button */}
          <Button
            size="sm"
            variant={isCompleted ? "outline" : "default"}
            className="w-full h-8 text-xs"
          >
            {isCompleted ? "View Details" : "Start Workout"}
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}

// Rest Day Card
function RestDayCard({ goal }: { goal?: string }) {
  return (
    <Card className="flex flex-col h-full bg-blue-500/5 border-blue-500/20">
      <CardContent className="flex flex-col flex-1 p-2.5 sm:p-3 items-center justify-center text-center">
        <div className="rounded-md p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2">
          <Check className="size-5" />
        </div>
        <div className="font-medium text-sm">Rest Day</div>
        <div className="text-xs text-muted-foreground mt-1">
          {goal || "10,000 Steps"}
        </div>
      </CardContent>
    </Card>
  )
}
