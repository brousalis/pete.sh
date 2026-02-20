'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { apiDelete, apiGet, apiPut } from '@/lib/api/client'
import type { MapleMoodRating, MapleWalkWithDetails, UpdateMapleWalkInput } from '@/lib/types/maple.types'
import { formatWalkDistance, formatWalkDuration } from '@/lib/types/maple.types'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import {
    ArrowLeft,
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
    X
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

  // Delete handler
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this walk?')) return

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
    <div className="space-y-6">
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
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
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
      {route && route.samples.length > 0 && (
        <MapleRouteMap
          samples={route.samples}
          hrSamples={walk.hrSamples}
          bathroomMarkers={walk.bathroomMarkers}
          walkStartTime={workout?.startDate}
          className="h-[400px]"
          colorByHeartRate
        />
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Duration */}
        <StatCard
          icon={Clock}
          label="Duration"
          value={walk.duration ? formatWalkDuration(walk.duration) : '-'}
          iconColor="text-blue-500"
        />

        {/* Distance */}
        <StatCard
          icon={Route}
          label="Distance"
          value={walk.distanceMiles ? formatWalkDistance(walk.distanceMiles) : '-'}
          iconColor="text-green-500"
        />

        {/* Calories */}
        <StatCard
          icon={Flame}
          label="Calories"
          value={workout?.activeCalories ? `${Math.round(workout.activeCalories)} cal` : '-'}
          iconColor="text-orange-500"
        />

        {/* Elevation */}
        <StatCard
          icon={Mountain}
          label="Elevation"
          value={
            workout?.elevationGainMeters
              ? `${Math.round(workout.elevationGainMeters * 3.28084)} ft`
              : '-'
          }
          iconColor="text-purple-500"
        />
      </div>

      {/* Bathroom Breaks */}
      {walk.bathroomMarkers && walk.bathroomMarkers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">🐾</span>
              Bathroom Breaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary counts */}
              <div className="flex items-center gap-6">
                {(() => {
                  const peeCt = walk.bathroomMarkers!.filter(m => m.type === 'pee').length
                  const poopCt = walk.bathroomMarkers!.filter(m => m.type === 'poop').length
                  return (
                    <>
                      {peeCt > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">💧</span>
                          <span className="text-2xl font-bold">x{peeCt}</span>
                        </div>
                      )}
                      {poopCt > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">💩</span>
                          <span className="text-2xl font-bold">x{poopCt}</span>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                {walk.bathroomMarkers!.map((marker) => {
                  const markerTime = parseISO(marker.timestamp)
                  const walkStart = workout?.startDate ? parseISO(workout.startDate) : null
                  const relativeMin = walkStart
                    ? Math.round((markerTime.getTime() - walkStart.getTime()) / 60000)
                    : null
                  return (
                    <div
                      key={marker.id}
                      className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <span className="text-lg">
                        {marker.type === 'pee' ? '💧' : '💩'}
                      </span>
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          {format(markerTime, 'h:mm a')}
                        </span>
                        {relativeMin != null && (
                          <span className="ml-2 text-xs text-muted-foreground/70">
                            {relativeMin} min into walk
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heart Rate and Mood Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Heart Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="size-4 text-red-500" />
              Heart Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workout?.hrAverage ? (
              <div className="space-y-4">
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-3xl font-bold">{Math.round(workout.hrAverage)}</p>
                    <p className="text-sm text-muted-foreground">avg bpm</p>
                  </div>
                  {workout.hrMin && (
                    <div className="text-muted-foreground">
                      <p className="text-lg font-medium">{workout.hrMin}</p>
                      <p className="text-xs">min</p>
                    </div>
                  )}
                  {workout.hrMax && (
                    <div className="text-red-400">
                      <p className="text-lg font-medium">{workout.hrMax}</p>
                      <p className="text-xs">max</p>
                    </div>
                  )}
                </div>

                {/* HR Zones */}
                {workout.hrZones && workout.hrZones.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Time in Zones</p>
                    <div className="space-y-1">
                      {workout.hrZones.map((zone) => (
                        <div key={zone.name} className="flex items-center gap-2">
                          <span className="w-16 text-xs text-muted-foreground capitalize">
                            {zone.name}
                          </span>
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                zone.name === 'rest' && 'bg-gray-400',
                                zone.name === 'warmup' && 'bg-green-400',
                                zone.name === 'fatBurn' && 'bg-yellow-400',
                                zone.name === 'cardio' && 'bg-orange-400',
                                zone.name === 'peak' && 'bg-red-400'
                              )}
                              style={{ width: `${zone.percentage}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-xs text-muted-foreground">
                            {Math.round(zone.percentage)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No heart rate data available</p>
            )}
          </CardContent>
        </Card>

        {/* Mood and Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-lg">🐕</span>
              How was Maple?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <MapleMoodRatingSelector
                  value={editMood}
                  onChange={setEditMood}
                  size="lg"
                  showLabels
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Any notes about the walk..."
                    rows={4}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <MapleMoodBadge mood={walk.moodRating} size="lg" showLabel />
                </div>
                {walk.notes ? (
                  <div className="rounded-lg bg-muted/50 p-4">
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
    </div>
  )
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: typeof Clock
  label: string
  value: string
  iconColor: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn('rounded-lg bg-muted p-2', iconColor)}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton loader
function MapleWalkDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Map */}
      <Skeleton className="h-[400px] w-full rounded-xl" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
