"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { YouTubePlayer } from "@/components/ui/youtube-player"
import { apiGet, apiPost } from "@/lib/api/client"
import type { DayOfWeek, Exercise, Workout } from "@/lib/types/fitness.types"
import { cn } from "@/lib/utils"
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock, PersonStanding, RotateCcw, StretchVertical, Video, VideoOff } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface WorkoutDetailViewProps {
  day: DayOfWeek
  onComplete?: () => void
}

export function WorkoutDetailView({ day, onComplete }: WorkoutDetailViewProps) {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [isCompleting, setIsCompleting] = useState(false)
  const [openVideos, setOpenVideos] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["exercises"]))

  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        const response = await apiGet<Workout>(`/api/fitness/workout/${day}`)
        if (response.success && response.data) {
          setWorkout(response.data)
        }
      } catch (error) {
        console.error("Failed to fetch workout", error)
      } finally {
        setLoading(false)
      }
    }
    fetchWorkout()
  }, [day])

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }
      return next
    })
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const response = await apiPost(`/api/fitness/workout/${day}/complete`, {
        exercisesCompleted: Array.from(completedExercises)
      })
      if (!response.success) throw new Error("Failed to mark workout complete")
      toast.success("Workout completed!")
      onComplete?.()
    } catch (error) {
      toast.error("Failed to complete workout")
    } finally {
      setIsCompleting(false)
    }
  }

  const toggleVideo = (exerciseId: string) => {
    setOpenVideos(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }
      return next
    })
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const getAllVideoIds = (): string[] => {
    if (!workout) return []
    const ids: string[] = []
    workout.warmup?.exercises.forEach(ex => { if (ex.youtubeVideoId) ids.push(ex.id) })
    workout.exercises.forEach(ex => {
      if (ex.youtubeVideoId) ids.push(ex.id)
      if (ex.alternative?.youtubeVideoId) ids.push(`${ex.id}-alt`)
    })
    workout.finisher?.forEach(ex => { if (ex.youtubeVideoId) ids.push(ex.id) })
    workout.metabolicFlush?.exercises.forEach(ex => { if (ex.youtubeVideoId) ids.push(ex.id) })
    workout.mobility?.exercises.forEach(ex => { if (ex.youtubeVideoId) ids.push(ex.id) })
    return ids
  }

  const toggleAllVideos = () => {
    const allIds = getAllVideoIds()
    if (openVideos.size > 0) {
      setOpenVideos(new Set())
    } else {
      setOpenVideos(new Set(allIds))
    }
  }

  if (loading) {
    return <Card><CardContent className="py-6 text-sm text-muted-foreground">Loading...</CardContent></Card>
  }

  if (!workout) {
    return <Card><CardContent className="py-6 text-sm text-muted-foreground">No workout found</CardContent></Card>
  }

  const hasElbowSafe = workout.exercises.some((ex) => ex.isElbowSafe === false && ex.alternative)

  // Compact Exercise Row Component
  const ExerciseRow = ({
    exercise,
    showCheckbox = false,
    isCompleted = false,
    onClick,
    className
  }: {
    exercise: Exercise
    showCheckbox?: boolean
    isCompleted?: boolean
    onClick?: () => void
    className?: string
  }) => {
    const shouldUseAlt = exercise.isElbowSafe === false && exercise.alternative
    const display = shouldUseAlt ? exercise.alternative! : exercise
    const videoId = shouldUseAlt ? display.youtubeVideoId : exercise.youtubeVideoId
    const isVideoOpen = openVideos.has(exercise.id)

    return (
      <div
        className={cn(
          "flex items-start gap-2 p-2 rounded-md transition-colors",
          showCheckbox && "cursor-pointer hover:bg-muted/50",
          isCompleted && "bg-green-500/10",
          className
        )}
        onClick={onClick}
      >
        {showCheckbox && (
          <div className="mt-0.5 shrink-0">
            {isCompleted ? (
              <CheckCircle2 className="size-4 text-green-500" />
            ) : (
              <Circle className="size-4 text-muted-foreground" />
            )}
          </div>
        )}

        <div className={cn("flex-1 min-w-0", isVideoOpen && videoId && "w-[50%]")}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-medium", isCompleted && "line-through text-muted-foreground")}>
              {display.name}
            </span>
            {shouldUseAlt && (
              <Badge variant="outline" className="text-[10px] py-0 h-4">Alt</Badge>
            )}
            {display.sets && display.reps && (
              <Badge variant="secondary" className="text-[10px] py-0 h-4">
                {display.sets}×{display.reps}
              </Badge>
            )}
            {exercise.duration && !shouldUseAlt && (
              <Badge variant="secondary" className="text-[10px] py-0 h-4">
                {exercise.duration}s
              </Badge>
            )}
          </div>
          {display.form && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{display.form}</p>
          )}
        </div>

        {videoId && (
          <div
            className={cn(
              "shrink-0 transition-all",
              isVideoOpen ? "flex-1 max-w-[50%]" : "w-28"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <YouTubePlayer
              videoId={videoId}
              title={`${display.name} demo`}
              isOpen={isVideoOpen}
              onToggle={() => toggleVideo(exercise.id)}
              compact
            />
          </div>
        )}
      </div>
    )
  }

  // Section Header Component
  const SectionHeader = ({
    id,
    title,
    icon: Icon,
    iconColor,
    duration,
    count,
    bgColor
  }: {
    id: string
    title: string
    icon: React.ElementType
    iconColor: string
    duration?: number
    count?: number
    bgColor?: string
  }) => {
    const isExpanded = expandedSections.has(id)
    return (
      <button
        onClick={() => toggleSection(id)}
        className={cn(
          "flex items-center gap-2 w-full p-2 rounded-md text-left transition-colors hover:bg-muted/50",
          bgColor
        )}
      >
        <Icon className={cn("size-4 shrink-0", iconColor)} />
        <span className="font-medium text-sm flex-1">{title}</span>
        {duration && <span className="text-xs text-muted-foreground">{duration}m</span>}
        {count && <span className="text-xs text-muted-foreground">{count} ex</span>}
        {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header Card */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold truncate">{workout.name}</h2>
                {hasElbowSafe && (
                  <Badge variant="destructive" className="text-[10px] py-0 h-4 gap-0.5">
                    <AlertTriangle className="size-3" />
                    Injury
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{workout.goal}</p>
            </div>
            <Button
              variant={openVideos.size > 0 ? "default" : "outline"}
              size="sm"
              onClick={toggleAllVideos}
              className="shrink-0 h-7 text-xs gap-1"
            >
              {openVideos.size > 0 ? <VideoOff className="size-3" /> : <Video className="size-3" />}
              <span className="hidden sm:inline">{openVideos.size > 0 ? "Hide" : "Videos"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warmup Section */}
      {workout.warmup && workout.warmup.exercises.length > 0 && (
        <Card>
          <CardContent className="p-2">
            <Collapsible open={expandedSections.has("warmup")} onOpenChange={() => toggleSection("warmup")}>
              <CollapsibleTrigger asChild>
                <SectionHeader
                  id="warmup"
                  title={workout.warmup.name}
                  icon={RotateCcw}
                  iconColor="text-blue-500"
                  duration={workout.warmup.duration}
                  count={workout.warmup.exercises.length}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 space-y-0.5">
                  {workout.warmup.exercises.map((ex) => (
                    <ExerciseRow key={ex.id} exercise={ex} className="bg-muted/30" />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Main Exercises */}
      <Card>
        <CardContent className="p-2">
          <Collapsible open={expandedSections.has("exercises")} onOpenChange={() => toggleSection("exercises")}>
            <CollapsibleTrigger asChild>
              <SectionHeader
                id="exercises"
                title="Exercises"
                icon={Circle}
                iconColor="text-foreground"
                count={workout.exercises.length}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-0.5">
                {workout.exercises.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    showCheckbox
                    isCompleted={completedExercises.has(ex.id)}
                    onClick={() => toggleExercise(ex.id)}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Finisher */}
      {workout.finisher && workout.finisher.length > 0 && (
        <Card>
          <CardContent className="p-2">
            <Collapsible open={expandedSections.has("finisher")} onOpenChange={() => toggleSection("finisher")}>
              <CollapsibleTrigger asChild>
                <SectionHeader
                  id="finisher"
                  title="Finisher"
                  icon={Clock}
                  iconColor="text-red-500"
                  count={workout.finisher.length}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 space-y-0.5">
                  {workout.finisher.map((ex) => (
                    <ExerciseRow key={ex.id} exercise={ex} className="bg-red-500/5" />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Metabolic Flush */}
      {workout.metabolicFlush && workout.metabolicFlush.exercises.length > 0 && (
        <Card>
          <CardContent className="p-2">
            <Collapsible open={expandedSections.has("metabolic")} onOpenChange={() => toggleSection("metabolic")}>
              <CollapsibleTrigger asChild>
                <SectionHeader
                  id="metabolic"
                  title={workout.metabolicFlush.name}
                  icon={PersonStanding}
                  iconColor="text-orange-500"
                  duration={workout.metabolicFlush.duration}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 space-y-0.5">
                  {workout.metabolicFlush.exercises.map((ex) => (
                    <ExerciseRow key={ex.id} exercise={ex} className="bg-orange-500/5" />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Mobility */}
      {workout.mobility && workout.mobility.exercises.length > 0 && (
        <Card>
          <CardContent className="p-2">
            <Collapsible open={expandedSections.has("mobility")} onOpenChange={() => toggleSection("mobility")}>
              <CollapsibleTrigger asChild>
                <SectionHeader
                  id="mobility"
                  title={workout.mobility.name}
                  icon={StretchVertical}
                  iconColor="text-purple-500"
                  duration={workout.mobility.duration}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 space-y-0.5">
                  {workout.mobility.exercises.map((ex) => (
                    <ExerciseRow key={ex.id} exercise={ex} className="bg-purple-500/5" />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Complete Button */}
      <Card>
        <CardContent className="p-3">
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full"
            size="sm"
          >
            {isCompleting ? "Completing..." : "Complete Workout"}
          </Button>
          {completedExercises.size > 0 && (
            <p className="text-center text-xs text-muted-foreground mt-1">
              {completedExercises.size}/{workout.exercises.length} done
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
