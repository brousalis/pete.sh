'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { apiDelete, apiGet, apiPut } from '@/lib/api/client'
import type { MapleMoodRating, MapleWalkWithDetails, UpdateMapleWalkInput } from '@/lib/types/maple.types'
import { formatWalkDistance, formatWalkDuration } from '@/lib/types/maple.types'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  Edit2,
  Flame,
  Heart,
  Loader2,
  MapPin,
  Mountain,
  Route,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { MapleMoodBadge, MapleMoodRatingSelector } from './maple-mood-rating'
import { MapleRouteMap } from './maple-route-map'

interface MapleWalkDetailProps {
  walkId: string
  onBack?: () => void
  onDeleted?: () => void
}

export function MapleWalkDetail({ walkId, onBack, onDeleted }: MapleWalkDetailProps) {
  const [walk, setWalk] = useState<MapleWalkWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editMood, setEditMood] = useState<MapleMoodRating | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Fetch walk details
  const fetchWalk = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiGet<MapleWalkWithDetails>(`/api/maple/walks/${walkId}`)
      if (response.success && response.data) {
        setWalk(response.data)
        setEditMood(response.data.moodRating)
        setEditNotes(response.data.notes || '')
      } else {
        setError('Failed to load walk details')
      }
    } catch (err) {
      console.error('Error fetching walk:', err)
      setError('Failed to load walk details')
    } finally {
      setLoading(false)
    }
  }, [walkId])

  useEffect(() => {
    fetchWalk()
  }, [fetchWalk])

  // Save handler
  const handleSave = async () => {
    if (!walk) return

    setSaving(true)
    try {
      const input: UpdateMapleWalkInput = {
        moodRating: editMood,
        notes: editNotes.trim() || null,
      }

      const response = await apiPut<MapleWalkWithDetails>(`/api/maple/walks/${walkId}`, input)
      if (response.success && response.data) {
        setWalk({ ...walk, ...response.data })
        setIsEditing(false)
      }
    } catch (err) {
      console.error('Error saving walk:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setShowDeleteDialog(false)
    setDeleting(true)
    try {
      const response = await apiDelete(`/api/maple/walks/${walkId}`)
      if (response.success) {
        onDeleted?.()
      }
    } catch (err) {
      console.error('Error deleting walk:', err)
    } finally {
      setDeleting(false)
    }
  }

  // Cancel edit
  const handleCancel = () => {
    if (walk) {
      setEditMood(walk.moodRating)
      setEditNotes(walk.notes || '')
    }
    setIsEditing(false)
  }

  if (loading) {
    return <MapleWalkDetailSkeleton />
  }

  if (error || !walk) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <MapPin className="mb-4 size-12 text-muted-foreground" />
        <p className="text-muted-foreground">{error || 'Walk not found'}</p>
        {onBack && (
          <Button variant="outline" className="mt-4" onClick={onBack}>
            <ArrowLeft className="mr-2 size-4" />
            Go Back
          </Button>
        )}
      </div>
    )
  }

  const workout = walk.workout
  const route = walk.route
  const date = parseISO(walk.date)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="size-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{walk.title || "Maple's Walk"}</h1>
            <p className="text-muted-foreground">
              {format(date, 'EEEE, MMMM d, yyyy')}
              {workout && ` • ${format(parseISO(workout.startDate), 'h:mm a')}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={handleCancel} disabled={saving}>
                <X className="mr-2 size-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 size-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 size-4" />
                )}
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Map */}
      <MapleRouteMap
        samples={route?.samples ?? []}
        hrSamples={walk.hrSamples}
        bathroomMarkers={walk.bathroomMarkers}
        walkStartTime={workout?.startDate}
        className="h-[280px]"
        colorByHeartRate
      />

      {/* Inline stats bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-4 py-2">
        <span className="flex items-center gap-1.5 text-sm">
          <Clock className="size-4 text-accent-azure" />
          <strong>{walk.duration ? formatWalkDuration(walk.duration) : '-'}</strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-1.5 text-sm">
          <Route className="size-4 text-accent-sage" />
          <strong>
            {walk.distanceMiles ? formatWalkDistance(walk.distanceMiles) : '-'}
          </strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-1.5 text-sm">
          <Flame className="size-4 text-accent-ember" />
          <strong>
            {workout?.activeCalories ? `${Math.round(workout.activeCalories)} cal` : '-'}
          </strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-1.5 text-sm">
          <Mountain className="size-4 text-accent-violet" />
          <strong>
            {workout?.elevationGainMeters
              ? `${Math.round(workout.elevationGainMeters * 3.28084)} ft`
              : '-'}
          </strong>
        </span>
      </div>

      {/* Bathroom Breaks - compact with collapsible timeline */}
      {walk.bathroomMarkers && walk.bathroomMarkers.length > 0 && (() => {
        const peeCt = walk.bathroomMarkers.filter((m) => m.type === 'pee').length
        const poopCt = walk.bathroomMarkers.filter((m) => m.type === 'poop').length
        return (
          <Card>
            <Collapsible>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <span className="text-base">🐾</span>
                    Bathroom Breaks
                    <span className="font-normal text-muted-foreground">
                      💧×{peeCt} {poopCt > 0 && `💩×${poopCt}`}
                    </span>
                  </CardTitle>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="group">
                      Timeline
                      <ChevronDown className="ml-1 size-4 transition-transform group-data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-1">
                    {walk.bathroomMarkers.map((marker) => {
                      const markerTime = parseISO(marker.timestamp)
                      const walkStart = workout?.startDate ? parseISO(workout.startDate) : null
                      const relativeMin = walkStart
                        ? Math.round((markerTime.getTime() - walkStart.getTime()) / 60000)
                        : null
                      return (
                        <div
                          key={marker.id}
                          className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1.5 text-sm"
                        >
                          <span>{marker.type === 'pee' ? '💧' : '💩'}</span>
                          <span className="text-muted-foreground">
                            {format(markerTime, 'h:mm a')}
                            {relativeMin != null && (
                              <span className="ml-1.5 text-xs">({relativeMin}m in)</span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })()}

      {/* Heart Rate and Mood Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Heart className="size-4 text-accent-rose" />
              Heart Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2">
            {workout?.hrAverage ? (
              <div className="space-y-3">
                <div className="flex items-end gap-3">
                  <div>
                    <p className="text-2xl font-bold">{Math.round(workout.hrAverage)}</p>
                    <p className="text-xs text-muted-foreground">avg bpm</p>
                  </div>
                  {workout.hrMin && (
                    <div className="text-muted-foreground text-sm">
                      <p className="font-medium">{workout.hrMin}</p>
                      <p className="text-xs">min</p>
                    </div>
                  )}
                  {workout.hrMax && (
                    <div className="text-accent-rose text-sm">
                      <p className="font-medium">{workout.hrMax}</p>
                      <p className="text-xs">max</p>
                    </div>
                  )}
                </div>
                {workout.hrZones && workout.hrZones.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="group -ml-2">
                        Time in Zones
                        <ChevronDown className="ml-1 size-4 transition-transform group-data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-1">
                        {workout.hrZones.map((zone) => (
                          <div key={zone.name} className="flex items-center gap-2">
                            <span className="w-14 text-xs text-muted-foreground capitalize">
                              {zone.name}
                            </span>
                            <div className="h-2 flex-1 rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  zone.name === 'rest' && 'bg-accent-slate',
                                  zone.name === 'warmup' && 'bg-accent-sage',
                                  zone.name === 'fatBurn' && 'bg-accent-gold',
                                  zone.name === 'cardio' && 'bg-accent-ember',
                                  zone.name === 'peak' && 'bg-accent-rose'
                                )}
                                style={{ width: `${zone.percentage}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs text-muted-foreground">
                              {Math.round(zone.percentage)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No heart rate data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="text-base">🐕</span>
              How was Maple?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 pt-2">
            {isEditing ? (
              <>
                <MapleMoodRatingSelector
                  value={editMood}
                  onChange={setEditMood}
                  size="md"
                  showLabels
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Any notes about the walk..."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                <MapleMoodBadge mood={walk.moodRating} size="md" showLabel />
                {walk.notes ? (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="whitespace-pre-wrap text-sm">{walk.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes added</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this walk?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this walk from Maple&apos;s history. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Skeleton loader
function MapleWalkDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <Skeleton className="h-[280px] w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  )
}
