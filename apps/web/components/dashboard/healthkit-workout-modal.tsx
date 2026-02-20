'use client'

import { HrZonesChart } from '@/components/dashboard/hr-zones-chart'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGet } from '@/lib/api/client'
import type { AppleWorkoutType } from '@/lib/types/apple-health.types'
import { getWorkoutDisplayLabel } from '@/lib/utils/workout-labels'
import {
  Activity,
  Flame,
  Heart,
  MapPin,
  Timer,
  TrendingUp,
  Watch
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface HeartRateZone {
  name: string
  minBpm: number
  maxBpm: number
  duration: number
  percentage: number
}

interface HealthKitWorkoutDetail {
  id: string
  workoutType: AppleWorkoutType
  startDate: string
  endDate: string
  duration: number
  activeCalories: number
  totalCalories: number
  distanceMiles?: number
  hrAverage?: number
  hrMin?: number
  hrMax?: number
  hrZones?: HeartRateZone[]
  cadenceAverage?: number
  paceAverage?: number
}

interface HealthKitWorkoutModalProps {
  workoutId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WORKOUT_TYPE_ICONS: Record<string, typeof Activity> = {
  running: Activity,
  walking: Activity,
  hiking: Activity,
  cycling: Activity,
  functionalStrengthTraining: Activity,
  rowing: Activity,
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

function formatPace(minutesPerMile: number): string {
  const mins = Math.floor(minutesPerMile)
  const secs = Math.round((minutesPerMile - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}/mi`
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function HealthKitWorkoutModal({
  workoutId,
  open,
  onOpenChange,
}: HealthKitWorkoutModalProps) {
  const [workout, setWorkout] = useState<HealthKitWorkoutDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workoutId || !open) {
      setWorkout(null)
      setError(null)
      return
    }

    const fetchWorkout = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiGet<HealthKitWorkoutDetail>(
          `/api/apple-health/workout/${workoutId}?samples=false&analytics=false`
        )
        if (response.success && response.data) {
          setWorkout(response.data)
        } else {
          setError('Failed to load workout details')
        }
      } catch (err) {
        console.error('Error fetching workout:', err)
        setError('Failed to load workout details')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkout()
  }, [workoutId, open])

  const Icon = workout
    ? WORKOUT_TYPE_ICONS[workout.workoutType] || Activity
    : Activity

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            Workout Details
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {workout && !loading && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10">
                <Icon className="size-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {getWorkoutDisplayLabel(workout.workoutType)}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {formatTime(workout.startDate)} -{' '}
                  {formatTime(workout.endDate)}
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {formatDuration(workout.duration)}
              </Badge>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {/* Calories */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-orange-500">
                  <Flame className="size-4" />
                  <span className="text-xs font-medium">Calories</span>
                </div>
                <p className="mt-1 text-lg font-semibold">
                  {Math.round(workout.activeCalories)}
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    active
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {Math.round(workout.totalCalories)} total
                </p>
              </div>

              {/* Heart Rate */}
              {workout.hrAverage && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-red-500">
                    <Heart className="size-4" />
                    <span className="text-xs font-medium">Heart Rate</span>
                  </div>
                  <p className="mt-1 text-lg font-semibold">
                    {workout.hrAverage}
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      avg BPM
                    </span>
                  </p>
                  {workout.hrMin && workout.hrMax && (
                    <p className="text-muted-foreground text-xs">
                      {workout.hrMin} - {workout.hrMax} range
                    </p>
                  )}
                </div>
              )}

              {/* Distance (for cardio) */}
              {workout.distanceMiles && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-blue-500">
                    <MapPin className="size-4" />
                    <span className="text-xs font-medium">Distance</span>
                  </div>
                  <p className="mt-1 text-lg font-semibold">
                    {workout.distanceMiles.toFixed(2)}
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      mi
                    </span>
                  </p>
                </div>
              )}

              {/* Pace (for running) */}
              {workout.paceAverage && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-green-500">
                    <Timer className="size-4" />
                    <span className="text-xs font-medium">Pace</span>
                  </div>
                  <p className="mt-1 text-lg font-semibold">
                    {formatPace(workout.paceAverage)}
                  </p>
                </div>
              )}

              {/* Cadence (for running) */}
              {workout.cadenceAverage && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-purple-500">
                    <TrendingUp className="size-4" />
                    <span className="text-xs font-medium">Cadence</span>
                  </div>
                  <p className="mt-1 text-lg font-semibold">
                    {Math.round(workout.cadenceAverage)}
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      spm
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* HR Zones */}
            {workout.hrZones && workout.hrZones.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Heart className="size-4 text-red-500" />
                  Heart Rate Zones
                </h4>
                <HrZonesChart zones={workout.hrZones} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Compact badge component for inline display in exercise rows
interface HealthKitWorkoutBadgeProps {
  workoutId: string
  workoutType: string
  duration: number
  onClick?: () => void
  className?: string
}

export function HealthKitWorkoutBadge({
  workoutId,
  workoutType,
  duration,
  onClick,
  className,
}: HealthKitWorkoutBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`cursor-pointer gap-1 border-red-500/30 bg-red-500/5 text-red-500 hover:bg-red-500/10 ${className}`}
      onClick={e => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      <Watch className="size-3" />
      <span className="text-[10px]">
        {getWorkoutDisplayLabel(workoutType)} •{' '}
        {formatDuration(duration)}
      </span>
    </Badge>
  )
}
