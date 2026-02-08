'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { apiGet, apiPost } from '@/lib/api/client'
import type {
    AvailableWalkingWorkout,
    CreateMapleWalkInput,
    MapleMoodRating,
    MapleWalk,
} from '@/lib/types/maple.types'
import { formatWalkDistance, formatWalkDuration } from '@/lib/types/maple.types'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { Check, Clock, Heart, Loader2, Route } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { MapleMoodRatingSelector } from './maple-mood-rating'

interface MapleAddWalkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWalkCreated?: (walk: MapleWalk) => void
}

export function MapleAddWalkDialog({
  open,
  onOpenChange,
  onWalkCreated,
}: MapleAddWalkDialogProps) {
  const [availableWorkouts, setAvailableWorkouts] = useState<AvailableWalkingWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedWorkout, setSelectedWorkout] = useState<AvailableWalkingWorkout | null>(null)
  const [title, setTitle] = useState('')
  const [moodRating, setMoodRating] = useState<MapleMoodRating | null>(null)
  const [notes, setNotes] = useState('')

  // Fetch available workouts
  const fetchWorkouts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiGet<AvailableWalkingWorkout[]>('/api/maple/walks/available')
      if (response.success && response.data) {
        setAvailableWorkouts(response.data)
      } else {
        setError('Failed to load available workouts')
      }
    } catch (err) {
      console.error('Error fetching available workouts:', err)
      setError('Failed to load available workouts')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch when dialog opens
  useEffect(() => {
    if (open) {
      fetchWorkouts()
      // Reset form
      setSelectedWorkout(null)
      setTitle('')
      setMoodRating(null)
      setNotes('')
    }
  }, [open, fetchWorkouts])

  // Submit handler
  const handleSubmit = async () => {
    if (!selectedWorkout) return

    setSubmitting(true)
    setError(null)

    try {
      const input: CreateMapleWalkInput = {
        healthkitWorkoutId: selectedWorkout.id,
        title: title.trim() || undefined,
        moodRating: moodRating || undefined,
        notes: notes.trim() || undefined,
      }

      const response = await apiPost<MapleWalk>('/api/maple/walks', input)

      if (response.success && response.data) {
        onWalkCreated?.(response.data)
        onOpenChange(false)
      } else {
        setError(response.error || 'Failed to create walk')
      }
    } catch (err) {
      console.error('Error creating walk:', err)
      setError('Failed to create walk')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🐕</span>
            Add Maple Walk
          </DialogTitle>
          <DialogDescription>
            Select a recent walking workout to track as a Maple walk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Available Workouts Selection */}
          <div className="space-y-3">
            <Label>Select a Walk</Label>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : availableWorkouts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-muted-foreground">No walking workouts available to link.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sync a walk from your Apple Watch first.
                </p>
              </div>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
                {availableWorkouts.map((workout) => (
                  <WorkoutOption
                    key={workout.id}
                    workout={workout}
                    selected={selectedWorkout?.id === workout.id}
                    onClick={() => setSelectedWorkout(workout)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder="e.g., Evening walk around the block"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Mood Rating */}
          <div className="space-y-3">
            <Label>How was Maple?</Label>
            <MapleMoodRatingSelector
              value={moodRating}
              onChange={setMoodRating}
              size="lg"
              showLabels
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about the walk..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedWorkout || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Add Walk'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Workout option component
function WorkoutOption({
  workout,
  selected,
  onClick,
}: {
  workout: AvailableWalkingWorkout
  selected: boolean
  onClick: () => void
}) {
  const date = parseISO(workout.startDate)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
        )}
      >
        {selected && <Check className="size-3" />}
      </div>

      {/* Workout info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">{format(date, 'EEEE, MMM d')}</span>
          <span className="text-sm text-muted-foreground">{format(date, 'h:mm a')}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {workout.duration && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatWalkDuration(workout.duration)}
            </span>
          )}
          {workout.distanceMiles && (
            <span className="flex items-center gap-1">
              <Route className="size-3" />
              {formatWalkDistance(workout.distanceMiles)}
            </span>
          )}
          {workout.hrAverage && (
            <span className="flex items-center gap-1 text-red-400">
              <Heart className="size-3" />
              {Math.round(workout.hrAverage)} bpm
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
