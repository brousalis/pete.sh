"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExerciseTimer } from "@/components/ui/exercise-timer"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { DailyRoutine, RoutineCompletion } from "@/lib/types/fitness.types"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, ChevronUp, Clock, ExternalLink, Info, Moon, Play, Sun } from "lucide-react"
import { useState } from "react"

interface StretchPanelProps {
  /** The routine data (morning or night) */
  routine: DailyRoutine
  /** Type of routine for styling */
  type: "morning" | "night"
  /** Completion state for today */
  completion?: RoutineCompletion
  /** Callback when routine is marked complete */
  onComplete: () => void
  /** Callback when routine is marked incomplete */
  onUncomplete: () => void
  /** Whether the complete action is in progress */
  isCompleting?: boolean
  /** Custom class name */
  className?: string
}

interface StretchExercise {
  name: string
  duration: number
  description: string
  why: string
  action: string
  youtubeVideoId?: string
}

/**
 * StretchPanel - A compact vertical panel for morning/night stretch routines.
 *
 * Features:
 * - Collapsible exercise details
 * - Integrated countdown timers with audio
 * - Inline video expansion
 * - Completion tracking
 */
export function StretchPanel({
  routine,
  type,
  completion,
  onComplete,
  onUncomplete,
  isCompleting = false,
  className,
}: StretchPanelProps) {
  const [activeTimerIdx, setActiveTimerIdx] = useState<number | null>(null)
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set())
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null)
  const [videoModal, setVideoModal] = useState<{ videoId: string; title: string } | null>(null)

  const isCompleted = completion?.completed || false
  const Icon = type === "morning" ? Sun : Moon

  const themeColors = type === "morning"
    ? {
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-500",
        borderColor: "border-amber-500/20",
        accentBg: "bg-amber-500/5",
      }
    : {
        iconBg: "bg-indigo-500/10",
        iconColor: "text-indigo-500",
        borderColor: "border-indigo-500/20",
        accentBg: "bg-indigo-500/5",
      }

  // Compact completed view
  if (isCompleted) {
    return (
      <Card className={cn(
        "flex flex-col overflow-hidden bg-green-500/5 border-green-500/20 py-0",
        className
      )}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className={cn("rounded-md p-1.5", "bg-green-500/10")}>
              <Icon className={cn("size-4", "text-green-500")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{routine.name}</div>
              <div className="text-[11px] text-muted-foreground">{routine.duration}m</div>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px] h-5 shrink-0">
              Done
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-7 text-[11px] mt-2 text-muted-foreground hover:text-foreground"
            onClick={onUncomplete}
            disabled={isCompleting}
          >
            {isCompleting ? "..." : "Undo"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const handleTimerComplete = (idx: number) => {
    setCompletedExercises((prev) => new Set(prev).add(idx))
    setActiveTimerIdx(null)

    // Auto-advance to next exercise if available
    const nextIdx = idx + 1
    if (nextIdx < routine.exercises.length) {
      setTimeout(() => {
        setActiveTimerIdx(nextIdx)
        setExpandedExercise(nextIdx)
      }, 500)
    }
  }

  const handleStartTimer = (idx: number) => {
    setActiveTimerIdx(idx)
    setExpandedExercise(idx)
  }

  const toggleExerciseExpand = (idx: number) => {
    setExpandedExercise(expandedExercise === idx ? null : idx)
  }

  const openVideoModal = (videoId: string, title: string) => {
    setVideoModal({ videoId, title })
  }

  const closeVideoModal = () => {
    setVideoModal(null)
  }

  // Get YouTube video IDs for stretches (these aren't in the data, but we can add them)
  const getVideoId = (exerciseName: string): string | undefined => {
    // Map exercise names to YouTube video IDs
    const videoMap: Record<string, string> = {
      "Deep Squat Hold": "M9z8Z7aY4Kk",
      "Thoracic Openers / T-Spine Rotation": "vuyUwtHl694",
      "Dead Hang": "HoE-C85ZlCE",
      "Couch Stretch": "eoPmgjyj9-Q",
      "Doorway Pec Stretch": "CEQMx4zFwYs",
      "Child's Pose with Side Reach": "YTAwpiX2Dsg",
    }
    return videoMap[exerciseName]
  }

  return (
    <Card className={cn(
      "flex flex-col h-full min-h-0 overflow-hidden py-0",
      className
    )}>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        {/* Header */}
        <div className={cn(
          "flex items-center gap-2 p-3 border-b",
          themeColors.accentBg,
          themeColors.borderColor
        )}>
          <div className={cn("rounded-md p-1.5", themeColors.iconBg)}>
            <Icon className={cn("size-4", themeColors.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{routine.name}</div>
            <div className="text-[11px] text-muted-foreground">{routine.duration}m</div>
          </div>
        </div>

        {/* Exercise List - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-2 space-y-1">
            {routine.exercises.map((exercise, idx) => {
              const isExerciseCompleted = completedExercises.has(idx)
              const isTimerActive = activeTimerIdx === idx
              const isExpanded = expandedExercise === idx
              const videoId = getVideoId(exercise.name)

              return (
                <div
                  key={idx}
                  className={cn(
                    "rounded-md border transition-colors",
                    isExerciseCompleted
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-muted/30 border-transparent",
                    isTimerActive && "ring-1 ring-blue-500/50"
                  )}
                >
                  {/* Exercise Row */}
                  <div className="flex items-start gap-2 p-2">
                    {/* Completion indicator - clickable */}
                    <button
                      className="mt-0.5 shrink-0 p-0.5 -m-0.5 rounded hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setCompletedExercises((prev) => {
                          const newSet = new Set(prev)
                          if (newSet.has(idx)) {
                            newSet.delete(idx)
                          } else {
                            newSet.add(idx)
                          }
                          return newSet
                        })
                      }}
                      aria-label={isExerciseCompleted ? "Mark as incomplete" : "Mark as complete"}
                    >
                      {isExerciseCompleted ? (
                        <Check className="size-3.5 text-green-500" />
                      ) : (
                        <div className="size-3.5 rounded-full border border-muted-foreground/30 hover:border-green-500/50" />
                      )}
                    </button>

                    {/* Exercise info */}
                    <div className="flex-1 min-w-0">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleExerciseExpand(idx)}>
                        <CollapsibleTrigger asChild>
                          <button className="w-full text-left">
                            <div className="flex items-center gap-1">
                              <span className={cn(
                                "text-xs font-medium truncate",
                                isExerciseCompleted && "text-muted-foreground line-through"
                              )}>
                                {exercise.name}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="size-3 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                              )}
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="mt-2 space-y-2">
                            {/* Why */}
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {exercise.why}
                            </p>
                            {/* How */}
                            <p className="text-[11px] text-foreground/80 leading-relaxed">
                              {exercise.action}
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    {/* Info tooltip for collapsed state */}
                    {!isExpanded && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="shrink-0 p-0.5">
                              <Info className="size-3 text-muted-foreground/50 hover:text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[200px]">
                            <p className="text-xs font-medium mb-1">{exercise.why}</p>
                            <p className="text-xs text-muted-foreground">{exercise.action}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {/* Timer and Controls Row */}
                  <div className="flex items-center gap-1.5 px-2 pb-2">
                    {isTimerActive ? (
                      <ExerciseTimer
                        duration={exercise.duration}
                        onComplete={() => handleTimerComplete(idx)}
                        autoStart
                        compact
                        className="flex-1"
                      />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => handleStartTimer(idx)}
                        disabled={isExerciseCompleted}
                      >
                        <Clock className="size-3" />
                        {exercise.duration}s
                      </Button>
                    )}

                    {/* Video button */}
                    {videoId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => openVideoModal(videoId, exercise.name)}
                      >
                        <Play className="size-3" />
                        Demo
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={cn("p-2 border-t", themeColors.borderColor)}>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            onClick={onComplete}
            disabled={isCompleting}
          >
            {isCompleting ? "Completing..." : "Complete Routine"}
          </Button>
        </div>
      </CardContent>

      {/* Video Modal */}
      <Dialog open={!!videoModal} onOpenChange={(open) => !open && closeVideoModal()}>
        <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-base">{videoModal?.title}</DialogTitle>
          </DialogHeader>
          {videoModal && (
            <div className="px-4 pb-4">
              <div className="relative overflow-hidden rounded-lg border border-border/50 bg-black shadow-lg">
                {/* 16:9 Aspect Ratio Container */}
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 size-full"
                    src={`https://www.youtube.com/embed/${videoModal.videoId}?rel=0&modestbranding=1&autoplay=1`}
                    title={videoModal.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
              {/* YouTube link */}
              <div className="mt-2 flex items-center justify-end">
                <a
                  href={`https://www.youtube.com/watch?v=${videoModal.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span>Open on YouTube</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
