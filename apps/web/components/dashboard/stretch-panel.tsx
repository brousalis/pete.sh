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
import { FullscreenTimer } from "@/components/ui/fullscreen-timer"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import type { DailyRoutine, RoutineCompletion } from "@/lib/types/fitness.types"
import { cn } from "@/lib/utils"
import { Ban, Check, ChevronDown, ChevronUp, Clock, ExternalLink, Expand, Info, Moon, Play, Sun, Timer, Undo2 } from "lucide-react"
import { useState } from "react"

interface StretchPanelProps {
  /** The routine data (morning or night) */
  routine: DailyRoutine
  /** Type of routine for styling */
  type: "morning" | "night"
  /** Completion state for the day being viewed */
  completion?: RoutineCompletion
  /** Callback when routine is marked complete */
  onComplete: () => void
  /** Callback when routine is marked incomplete */
  onUncomplete: () => void
  /** Whether the complete action is in progress */
  isCompleting?: boolean
  /** Whether viewing in preview mode (another day) */
  isPreview?: boolean
  /** Custom class name */
  className?: string
  /** Callback when routine skip is undone */
  onUnskip?: () => void
  /** Whether the day's workout is skipped (inherits skipped state) */
  daySkipped?: boolean
  /** The reason the day was skipped */
  daySkippedReason?: string
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
  isPreview = false,
  className,
  onUnskip,
  daySkipped = false,
  daySkippedReason,
}: StretchPanelProps) {
  const [activeTimerIdx, setActiveTimerIdx] = useState<number | null>(null)
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set())
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null)
  const [videoModal, setVideoModal] = useState<{ videoId: string; title: string } | null>(null)
  // Fullscreen timer state
  const [fullscreenTimerOpen, setFullscreenTimerOpen] = useState(false)
  const [fullscreenTimerExercise, setFullscreenTimerExercise] = useState<{
    idx: number
    name: string
    duration: number
    action: string
  } | null>(null)

  const isCompleted = completion?.completed || false
  // Show as skipped if explicitly skipped OR if day workout is skipped and routine not completed
  const isExplicitlySkipped = completion?.skipped || false
  const isSkipped = isExplicitlySkipped || (daySkipped && !isCompleted)
  const skippedReason = completion?.skippedReason || daySkippedReason
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

  // Get YouTube video IDs for stretches
  const getVideoId = (exerciseName: string): string | undefined => {
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

  const openVideoModal = (videoId: string, title: string) => {
    setVideoModal({ videoId, title })
  }

  const closeVideoModal = () => {
    setVideoModal(null)
  }

  // Skipped view - shows skipped state with reason
  if (isSkipped && !isCompleted) {
    return (
      <Card className={cn(
        "flex flex-col py-0 opacity-60 md:h-full md:min-h-0 md:overflow-hidden",
        className
      )}>
        <CardContent className="flex flex-col p-0 md:min-h-0 md:flex-1 md:overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 p-2.5 sm:p-3 border-b border-border/30 bg-muted/10">
            <div className="rounded-md p-1.5 bg-muted/30">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate text-muted-foreground">{routine.name}</div>
              <div className="text-[11px] text-muted-foreground/60">{routine.duration}m</div>
            </div>
            <Badge className="bg-muted/50 text-muted-foreground border-0 text-[10px] h-5 shrink-0 gap-0.5 font-medium">
              <Ban className="size-2.5" />
              Skipped
            </Badge>
          </div>

          {/* Skipped Banner */}
          {skippedReason && (
            <div className="border-b border-border/20 bg-muted/10 px-2.5 sm:px-3 py-2">
              <p className="text-[11px] text-muted-foreground/70 italic">
                "{skippedReason}"
              </p>
            </div>
          )}

          {/* Skipped Exercise List */}
          <div className="md:flex-1 md:overflow-y-auto md:min-h-0">
            <div className="p-1.5 sm:p-2 space-y-0.5">
              {routine.exercises.map((exercise, idx) => {
                const videoId = getVideoId(exercise.name)

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2 py-2 sm:py-1.5 rounded"
                  >
                    <div className="size-4 sm:size-3 rounded-full border border-muted-foreground/20 shrink-0" />
                    <span className="text-xs text-muted-foreground/50 flex-1 min-w-0 truncate line-through">
                      {exercise.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">
                      {exercise.duration}s
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer with Undo Skip or Mark Done */}
          <div className="p-2 border-t border-border/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/50">Skipped</span>
              {isExplicitlySkipped && onUnskip ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 sm:h-5 px-2.5 sm:px-1.5 text-[11px] sm:text-[10px] text-muted-foreground/60 hover:text-foreground gap-1 touch-manipulation"
                  onClick={onUnskip}
                  disabled={isCompleting}
                >
                  <Undo2 className="size-3 sm:size-2.5" />
                  {isCompleting ? "..." : "Undo"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 sm:h-5 px-2.5 sm:px-1.5 text-[11px] sm:text-[10px] text-muted-foreground/60 hover:text-foreground gap-1 touch-manipulation"
                  onClick={onComplete}
                  disabled={isCompleting}
                >
                  <Check className="size-3 sm:size-2.5" />
                  {isCompleting ? "..." : "Done"}
                </Button>
              )}
            </div>
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

  // Completed view - still shows exercises but in a completed state
  if (isCompleted) {
    return (
      <Card className={cn(
        "flex flex-col py-0 md:h-full md:min-h-0 md:overflow-hidden",
        className
      )}>
        <CardContent className="flex flex-col p-0 md:min-h-0 md:flex-1 md:overflow-hidden">
          {/* Header - subtle completed styling */}
          <div className="flex items-center gap-2 p-2.5 sm:p-3 border-b border-border/30 bg-muted/20">
            <div className={cn("rounded-md p-1.5", themeColors.iconBg)}>
              <Icon className={cn("size-4", themeColors.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate text-foreground/80">{routine.name}</div>
              <div className="text-[11px] text-muted-foreground">{routine.duration}m</div>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] h-5 shrink-0 font-medium">
              Done
            </Badge>
          </div>

          {/* Completed Exercise List - Read only, muted */}
          <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-muted/5">
            <div className="p-1.5 sm:p-2 space-y-0.5">
              {routine.exercises.map((exercise, idx) => {
                const videoId = getVideoId(exercise.name)

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2 py-2 sm:py-1.5 rounded"
                  >
                    <Check className="size-4 sm:size-3 text-emerald-500/70 shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                      {exercise.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground/60">
                        {exercise.duration}s
                      </span>
                      {videoId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 sm:h-5 sm:w-5 p-0 opacity-50 hover:opacity-100 touch-manipulation"
                          onClick={() => openVideoModal(videoId, exercise.name)}
                        >
                          <Play className="size-3.5 sm:size-2.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer with Undo - subtle */}
          <div className="p-2 border-t border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60">Completed</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 sm:h-5 px-2.5 sm:px-1.5 text-[11px] sm:text-[10px] text-muted-foreground/60 hover:text-foreground gap-1 touch-manipulation"
                onClick={onUncomplete}
                disabled={isCompleting}
              >
                <Undo2 className="size-3 sm:size-2.5" />
                {isCompleting ? "..." : "Undo"}
              </Button>
            </div>
          </div>
        </CardContent>

        {/* Video Modal - same as non-completed state */}
        <Dialog open={!!videoModal} onOpenChange={(open) => !open && closeVideoModal()}>
          <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="text-base">{videoModal?.title}</DialogTitle>
            </DialogHeader>
            {videoModal && (
              <div className="px-4 pb-4">
                <div className="relative overflow-hidden rounded-lg border border-border/50 bg-black shadow-lg">
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

  // Fullscreen timer handlers
  const openFullscreenTimer = (idx: number) => {
    const exercise = routine.exercises[idx]
    if (!exercise) return
    setFullscreenTimerExercise({
      idx,
      name: exercise.name,
      duration: exercise.duration,
      action: exercise.action,
    })
    setFullscreenTimerOpen(true)
  }

  const handleFullscreenTimerComplete = () => {
    if (fullscreenTimerExercise) {
      setCompletedExercises((prev) => new Set(prev).add(fullscreenTimerExercise.idx))
      
      // Auto-advance to next exercise
      const nextIdx = fullscreenTimerExercise.idx + 1
      const nextExercise = routine.exercises[nextIdx]
      if (nextIdx < routine.exercises.length && nextExercise) {
        setFullscreenTimerExercise({
          idx: nextIdx,
          name: nextExercise.name,
          duration: nextExercise.duration,
          action: nextExercise.action,
        })
        setExpandedExercise(nextIdx)
      } else {
        // Close if no more exercises
        setFullscreenTimerOpen(false)
        setFullscreenTimerExercise(null)
      }
    }
  }

  const handleFullscreenTimerSkip = () => {
    if (fullscreenTimerExercise) {
      const nextIdx = fullscreenTimerExercise.idx + 1
      const nextExercise = routine.exercises[nextIdx]
      if (nextIdx < routine.exercises.length && nextExercise) {
        setFullscreenTimerExercise({
          idx: nextIdx,
          name: nextExercise.name,
          duration: nextExercise.duration,
          action: nextExercise.action,
        })
        setExpandedExercise(nextIdx)
      } else {
        setFullscreenTimerOpen(false)
        setFullscreenTimerExercise(null)
      }
    }
  }

  const closeFullscreenTimer = () => {
    setFullscreenTimerOpen(false)
    setFullscreenTimerExercise(null)
  }

  const toggleExerciseExpand = (idx: number) => {
    setExpandedExercise(expandedExercise === idx ? null : idx)
  }

  return (
    <Card className={cn(
      "flex flex-col py-0 md:h-full md:min-h-0 md:overflow-hidden",
      className
    )}>
      <CardContent className="flex flex-col p-0 md:min-h-0 md:flex-1 md:overflow-hidden">
        {/* Header */}
        <div className={cn(
          "flex items-center gap-2 p-2.5 sm:p-3 border-b",
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

        {/* Exercise List - Scrollable on desktop only */}
        <div className="md:flex-1 md:overflow-y-auto md:min-h-0">
          <div className="p-1.5 sm:p-2 space-y-1">
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
                      ? "bg-muted/30 border-transparent"
                      : "bg-muted/30 border-transparent",
                    isTimerActive && "ring-1 ring-blue-500/50"
                  )}
                >
                  {/* Exercise Row - larger touch target */}
                  <div className="flex items-start gap-2 p-2 sm:p-2">
                    {/* Completion indicator - larger touch target for mobile */}
                    <button
                      className="mt-0.5 shrink-0 p-1.5 -m-1 rounded-md active:bg-muted/50 transition-colors touch-manipulation"
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
                        <Check className="size-4 text-green-500" />
                      ) : (
                        <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </button>

                    {/* Exercise info */}
                    <div className="flex-1 min-w-0">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleExerciseExpand(idx)}>
                        <CollapsibleTrigger asChild>
                          <button className="w-full text-left py-0.5 touch-manipulation">
                            <div className="flex items-center gap-1">
                              <span className={cn(
                                "text-xs sm:text-[13px] font-medium truncate",
                                isExerciseCompleted && "text-muted-foreground line-through"
                              )}>
                                {exercise.name}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="size-3.5 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                              )}
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="mt-2 space-y-2">
                            {/* Why */}
                            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                              {exercise.why}
                            </p>
                            {/* How */}
                            <p className="text-[11px] sm:text-xs text-foreground/80 leading-relaxed">
                              {exercise.action}
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    {/* Info tooltip for collapsed state - hidden on mobile, tap to expand instead */}
                    {!isExpanded && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="shrink-0 p-1 hidden sm:block">
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

                  {/* Timer and Controls Row - larger buttons for touch */}
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
                      <>
                        {/* Inline timer button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 sm:h-6 px-2.5 sm:px-2 text-[11px] sm:text-[10px] gap-1 touch-manipulation"
                          onClick={() => handleStartTimer(idx)}
                          disabled={isExerciseCompleted}
                        >
                          <Clock className="size-3.5 sm:size-3" />
                          {exercise.duration}s
                        </Button>
                        {/* Fullscreen timer button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 sm:h-6 px-2 text-[11px] sm:text-[10px] gap-1 touch-manipulation",
                            type === "morning" 
                              ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" 
                              : "text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10"
                          )}
                          onClick={() => openFullscreenTimer(idx)}
                          disabled={isExerciseCompleted}
                        >
                          <Expand className="size-3.5 sm:size-3" />
                          <span className="hidden sm:inline">Focus</span>
                        </Button>
                      </>
                    )}

                    {/* Video button */}
                    {videoId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 sm:h-6 px-2.5 sm:px-2 text-[11px] sm:text-[10px] gap-1 touch-manipulation"
                        onClick={() => openVideoModal(videoId, exercise.name)}
                      >
                        <Play className="size-3.5 sm:size-3" />
                        Demo
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer - larger button for touch */}
        <div className={cn("p-2 border-t space-y-2", themeColors.borderColor)}>
          {isPreview ? (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Not completed</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 sm:h-6 px-3 sm:px-2 text-[11px] sm:text-[10px] text-muted-foreground hover:text-foreground gap-1 touch-manipulation"
                onClick={onComplete}
                disabled={isCompleting}
              >
                <Check className="size-3.5 sm:size-3" />
                {isCompleting ? "..." : "Mark Done"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* Start Routine in Fullscreen Timer */}
              <Button
                size="sm"
                className={cn(
                  "flex-1 h-10 sm:h-8 text-sm sm:text-xs touch-manipulation gap-1.5",
                  type === "morning"
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"
                )}
                onClick={() => openFullscreenTimer(0)}
              >
                <Timer className="size-4 sm:size-3.5" />
                Start Timer
              </Button>
              {/* Mark Complete */}
              <Button
                size="sm"
                variant="outline"
                className="h-10 sm:h-8 px-3 text-sm sm:text-xs touch-manipulation"
                onClick={onComplete}
                disabled={isCompleting}
              >
                {isCompleting ? "..." : "Done"}
              </Button>
            </div>
          )}
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

      {/* Fullscreen Timer Modal */}
      <FullscreenTimer
        isOpen={fullscreenTimerOpen}
        onClose={closeFullscreenTimer}
        duration={fullscreenTimerExercise?.duration ?? 30}
        exerciseName={fullscreenTimerExercise?.name ?? ""}
        subtitle={fullscreenTimerExercise?.action}
        onComplete={handleFullscreenTimerComplete}
        onSkip={fullscreenTimerExercise && fullscreenTimerExercise.idx < routine.exercises.length - 1 ? handleFullscreenTimerSkip : undefined}
        variant={type}
        autoStart
      />
    </Card>
  )
}
