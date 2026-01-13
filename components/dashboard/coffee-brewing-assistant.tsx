'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CoffeeService } from '@/lib/services/coffee.service'
import type { BrewStep, CoffeeRoutine } from '@/lib/types/coffee.types'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Coffee,
  Info,
  List,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const coffeeService = new CoffeeService()

type TimerState = 'idle' | 'running' | 'paused'
type ViewMode = 'guided' | 'overview'

// Audio notification helper
const playAlertSound = () => {
  try {
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.3
    )

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    // Fallback: just use toast if audio fails
    console.warn('Audio notification failed', error)
  }
}

export function CoffeeBrewingAssistant() {
  const [selectedRoutine, setSelectedRoutine] = useState<CoffeeRoutine | null>(
    null
  )
  const [viewMode, setViewMode] = useState<ViewMode>('guided')
  const [guidedStepIndex, setGuidedStepIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const alertShownRef = useRef<Set<number>>(new Set())
  const timerStartedForStepRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const recommended = coffeeService.getRecommendedRoutine()
    if (recommended) {
      const routine = coffeeService.getRoutineByType(recommended)
      if (routine) {
        setSelectedRoutine(routine)
      }
    }
  }, [])

  // Handle timer when guided step changes - stop timer if step doesn't have timing
  useEffect(() => {
    if (viewMode === 'guided' && selectedRoutine) {
      const currentStepData = selectedRoutine.steps[guidedStepIndex]

      // If current step doesn't have timing, stop timer
      if (!currentStepData?.timing && timerState === 'running') {
        setTimerState('idle')
        setElapsedTime(0)
      }
    }
  }, [guidedStepIndex, viewMode, selectedRoutine])

  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1
          checkTimingAlerts(newTime)
          return newTime
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerState, selectedRoutine])

  const checkTimingAlerts = (time: number) => {
    if (!selectedRoutine) return

    selectedRoutine.steps.forEach((step, idx) => {
      if (
        step.timing?.alert &&
        step.timing.start === time &&
        !alertShownRef.current.has(idx)
      ) {
        playAlertSound()
        toast.info(`⏰ ${step.title}`, {
          description: step.description,
          duration: 5000,
        })
        alertShownRef.current.add(idx)

        // If in guided mode and this is the current step, highlight it
        if (viewMode === 'guided' && idx === guidedStepIndex) {
          // Step is now active
        }
      }
    })
  }

  const startBrew = () => {
    if (!selectedRoutine) return
    setTimerState('running')
    setElapsedTime(0)
    setCurrentStep(0)
    setGuidedStepIndex(0)
    setCompletedSteps(new Set())
    alertShownRef.current.clear()
    timerStartedForStepRef.current.clear()
    toast.success('Brew started!', { description: selectedRoutine.name })
  }

  const startGuidedBrew = () => {
    if (!selectedRoutine) return
    setViewMode('guided')
    setGuidedStepIndex(0)
    setCompletedSteps(new Set())
    alertShownRef.current.clear()
    timerStartedForStepRef.current.clear()
    setTimerState('idle')
    setElapsedTime(0)

    toast.success('Guided brew started!', { description: selectedRoutine.name })
  }

  const startTimerForCurrentStep = () => {
    if (!selectedRoutine) return
    const currentStepData = selectedRoutine.steps[guidedStepIndex]

    if (currentStepData?.timing) {
      setTimerState('running')
      setElapsedTime(0)
      timerStartedForStepRef.current.add(guidedStepIndex)
      alertShownRef.current.clear()
      toast.success('Timer started!')
    }
  }

  const pauseBrew = () => {
    setTimerState('paused')
  }

  const resumeBrew = () => {
    setTimerState('running')
  }

  const resetBrew = () => {
    setTimerState('idle')
    setElapsedTime(0)
    setCurrentStep(0)
    setGuidedStepIndex(0)
    setCompletedSteps(new Set())
    alertShownRef.current.clear()
    timerStartedForStepRef.current.clear()
  }

  const nextStep = () => {
    if (!selectedRoutine) return
    const nextIndex = guidedStepIndex + 1
    if (nextIndex < selectedRoutine.steps.length) {
      setGuidedStepIndex(nextIndex)

      const nextStepData = selectedRoutine.steps[nextIndex]

      // If next step doesn't have timing, stop timer
      if (!nextStepData?.timing) {
        setTimerState('idle')
        setElapsedTime(0)
      }
      // Timer will remain in current state - user must manually start it for steps with timing
    }
  }

  const previousStep = () => {
    if (guidedStepIndex > 0) {
      const prevIndex = guidedStepIndex - 1
      setGuidedStepIndex(prevIndex)

      if (selectedRoutine) {
        const prevStepData = selectedRoutine.steps[prevIndex]

        // If previous step doesn't have timing, stop timer
        if (!prevStepData?.timing) {
          setTimerState('idle')
          setElapsedTime(0)
        }
        // Timer will remain in current state - user must manually start it for steps with timing
      }
    }
  }

  const completeCurrentStep = () => {
    setCompletedSteps(prev => new Set(prev).add(guidedStepIndex))
    nextStep()
  }

  const completeStep = (stepIndex: number) => {
    setCompletedSteps(prev => new Set(prev).add(stepIndex))
    if (stepIndex < (selectedRoutine?.steps.length || 0) - 1) {
      setCurrentStep(stepIndex + 1)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentStepInfo = (): {
    step: BrewStep | null
    isActive: boolean
    isUpcoming: boolean
  } => {
    if (!selectedRoutine)
      return { step: null, isActive: false, isUpcoming: false }

    const activeStep = selectedRoutine.steps.find(step => {
      if (!step.timing) return false
      const start = step.timing.start
      const end = start + (step.timing.duration || 0)
      return elapsedTime >= start && (end === start || elapsedTime <= end)
    })

    if (activeStep) {
      return { step: activeStep, isActive: true, isUpcoming: false }
    }

    const nextStep = selectedRoutine.steps.find(
      step => step.timing && step.timing.start > elapsedTime
    )
    return { step: nextStep || null, isActive: false, isUpcoming: !!nextStep }
  }

  const routines = coffeeService.getRoutines()
  const recommendedType = coffeeService.getRecommendedRoutine()
  const { step: currentActiveStep, isActive } = getCurrentStepInfo()

  if (!selectedRoutine) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coffee className="size-5 text-amber-600 dark:text-amber-400" />
            <CardTitle>Coffee Brewing Assistant</CardTitle>
          </div>
          <CardDescription>
            Select a brewing routine to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {routines.map(routine => (
            <button
              key={routine.id}
              onClick={() => setSelectedRoutine(routine)}
              className="hover:bg-muted/50 w-full rounded-lg border p-4 text-left transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{routine.name}</h4>
                    {recommendedType === routine.type && (
                      <Badge variant="default" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {routine.description}
                  </p>
                  <div className="text-muted-foreground mt-2 flex gap-2 text-xs">
                    <span>{routine.batchSize}</span>
                    <span>•</span>
                    <span>{routine.coffee}g coffee</span>
                    <span>•</span>
                    <span>{routine.water}g water</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    )
  }

  const progress =
    selectedRoutine.steps.length > 0
      ? (completedSteps.size / selectedRoutine.steps.length) * 100
      : 0

  const currentGuidedStep = selectedRoutine?.steps[guidedStepIndex]
  const isLastStep =
    guidedStepIndex === (selectedRoutine?.steps.length || 0) - 1
  const isFirstStep = guidedStepIndex === 0
  const allStepsCompleted =
    selectedRoutine && completedSteps.size === selectedRoutine.steps.length

  // Completion Screen
  if (viewMode === 'guided' && allStepsCompleted) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Coffee className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0">
                <CardTitle className="truncate text-lg sm:text-xl">
                  {selectedRoutine.name}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Brew Complete!
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('overview')}
                className="gap-1.5 text-xs sm:gap-2 sm:text-sm"
              >
                <List className="size-3.5 sm:size-4" />
                <span className="xs:inline hidden">Overview</span>
                <span className="xs:hidden">View</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRoutine(null)}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Change Routine</span>
                <span className="sm:hidden">Change</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Completion Celebration */}
          <div className="space-y-4 rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/80 via-amber-100/40 to-orange-50/60 p-6 text-center sm:space-y-6 sm:p-12 dark:border-amber-500/20 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-orange-950/30">
            <div className="space-y-4 sm:space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="rounded-full bg-gradient-to-br from-amber-500 to-orange-600 p-4 shadow-lg shadow-amber-500/30 sm:p-6">
                  <CheckCircle2 className="size-12 text-white sm:size-16" />
                </div>
              </div>

              {/* Title */}
              <div>
                <h2 className="mb-2 bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl dark:from-amber-400 dark:to-orange-400">
                  Brew Complete! ☕
                </h2>
                <p className="px-2 text-sm text-amber-900/80 sm:text-base md:text-lg dark:text-amber-200/80">
                  You've successfully completed all{' '}
                  {selectedRoutine.steps.length} steps
                </p>
              </div>

              {/* Summary Stats */}
              <div className="mx-auto grid max-w-md grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-lg border border-amber-200/50 bg-white/60 p-3 shadow-sm sm:p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
                  <div className="text-xl font-bold text-amber-700 sm:text-2xl dark:text-amber-400">
                    {selectedRoutine.steps.length}
                  </div>
                  <div className="text-xs text-amber-600/80 sm:text-sm dark:text-amber-300/80">
                    Steps
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200/50 bg-white/60 p-3 shadow-sm sm:p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
                  <div className="text-xl font-bold text-amber-700 sm:text-2xl dark:text-amber-400">
                    {selectedRoutine.batchSize}
                  </div>
                  <div className="text-xs text-amber-600/80 sm:text-sm dark:text-amber-300/80">
                    Batch Size
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col flex-wrap items-stretch justify-center gap-3 pt-4 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  onClick={() => {
                    setCompletedSteps(new Set())
                    setGuidedStepIndex(0)
                    setTimerState('idle')
                    setElapsedTime(0)
                    timerStartedForStepRef.current.clear()
                    alertShownRef.current.clear()
                  }}
                  size="lg"
                  className="w-full gap-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:from-amber-700 hover:to-orange-700 sm:w-auto sm:min-w-[160px]"
                >
                  <RotateCcw className="size-5" />
                  Start New Brew
                </Button>
                <Button
                  onClick={() => setViewMode('overview')}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 border-amber-300/50 hover:bg-amber-50 sm:w-auto sm:min-w-[160px] dark:border-amber-700/50 dark:hover:bg-amber-950/30"
                >
                  <List className="size-5" />
                  View Overview
                </Button>
                <Button
                  onClick={() => setSelectedRoutine(null)}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 border-amber-300/50 hover:bg-amber-50 sm:w-auto sm:min-w-[160px] dark:border-amber-700/50 dark:hover:bg-amber-950/30"
                >
                  <Coffee className="size-5" />
                  Change Routine
                </Button>
              </div>
            </div>
          </div>

          {/* All Steps Completed Indicator */}
          <div className="rounded-lg border border-amber-200/30 bg-gradient-to-br from-amber-50/40 to-orange-50/30 p-3 sm:p-4 dark:border-amber-800/30 dark:from-amber-950/20 dark:to-orange-950/20">
            <div className="mb-2 text-center text-xs font-medium text-amber-700/80 sm:mb-3 dark:text-amber-300/80">
              All Steps Completed
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {selectedRoutine.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="rounded-lg border border-amber-200/50 bg-white/70 p-2 text-left text-xs shadow-sm dark:border-amber-800/50 dark:bg-amber-900/30"
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="truncate font-medium text-amber-800 dark:text-amber-200">
                      {step.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Guided Mode View
  if (viewMode === 'guided' && currentGuidedStep) {
    const isCompleted = completedSteps.has(guidedStepIndex)
    const hasTiming = currentGuidedStep.timing !== undefined

    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Coffee className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0">
                <CardTitle className="truncate text-lg sm:text-xl">
                  {selectedRoutine.name}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Step {guidedStepIndex + 1} of {selectedRoutine.steps.length}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('overview')}
                className="gap-1.5 text-xs sm:gap-2 sm:text-sm"
              >
                <List className="size-3.5 sm:size-4" />
                <span className="xs:inline hidden">Overview</span>
                <span className="xs:hidden">View</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRoutine(null)}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Change Routine</span>
                <span className="sm:hidden">Change</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Step - Large Focused View */}
          <div className="space-y-4 rounded-xl border-2 border-amber-500/50 bg-amber-50/50 p-4 text-center sm:space-y-6 sm:p-6 md:p-8 dark:bg-amber-950/20">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {isCompleted ? (
                  <CheckCircle2 className="size-8 shrink-0 text-green-500 sm:size-10 md:size-12" />
                ) : (
                  <Circle className="size-8 shrink-0 text-amber-600 sm:size-10 md:size-12 dark:text-amber-400" />
                )}
                <h2 className="text-xl font-bold sm:text-2xl md:text-3xl">
                  {currentGuidedStep.title}
                </h2>
              </div>

              <p className="text-foreground mx-auto max-w-2xl px-2 text-base leading-relaxed font-medium sm:text-lg md:text-xl">
                {currentGuidedStep.description}
              </p>

              {currentGuidedStep.action && (
                <div className="bg-muted/40 border-border/50 rounded-lg border p-3">
                  <p className="text-muted-foreground text-sm">
                    → {currentGuidedStep.action}
                  </p>
                </div>
              )}

              {currentGuidedStep.tips && currentGuidedStep.tips.length > 0 && (
                <div className="bg-muted/50 flex items-start justify-center gap-2 rounded-lg p-3">
                  <Info className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-muted-foreground text-left text-sm">
                    {currentGuidedStep.tips[0]}
                  </p>
                </div>
              )}

              {/* Timer Display for Steps with Timing */}
              {hasTiming && (
                <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
                  <div className="bg-background w-full max-w-sm rounded-lg border-2 border-amber-500 p-4 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Timer className="size-6 shrink-0 text-amber-600 sm:size-8 dark:text-amber-400" />
                      <div className="min-w-0 flex-1">
                        <div className="text-muted-foreground text-xs">
                          Timer
                        </div>
                        <div className="font-mono text-2xl font-bold sm:text-3xl md:text-4xl">
                          {formatTime(elapsedTime)}
                        </div>
                        {currentGuidedStep.timing?.alert && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            Alert at{' '}
                            {formatTime(currentGuidedStep.timing.start)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {timerState === 'idle' && (
                    <Button
                      onClick={startTimerForCurrentStep}
                      size="lg"
                      className="gap-2 bg-amber-600 hover:bg-amber-700"
                    >
                      <Play className="size-5" />
                      Start Timer
                    </Button>
                  )}
                  {timerState === 'running' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={pauseBrew}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Pause className="size-4" />
                        Pause
                      </Button>
                      <Button
                        onClick={() => {
                          setTimerState('idle')
                          setElapsedTime(0)
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <RotateCcw className="size-4" />
                        Reset
                      </Button>
                    </div>
                  )}
                  {timerState === 'paused' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={resumeBrew}
                        size="sm"
                        className="gap-2 bg-amber-600 hover:bg-amber-700"
                      >
                        <Play className="size-4" />
                        Resume
                      </Button>
                      <Button
                        onClick={() => {
                          setTimerState('idle')
                          setElapsedTime(0)
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <RotateCcw className="size-4" />
                        Reset
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col flex-wrap items-stretch justify-center gap-3 pt-4 sm:flex-row sm:items-center sm:gap-4 sm:pt-6">
              <Button
                onClick={previousStep}
                disabled={isFirstStep}
                variant="outline"
                size="lg"
                className="w-full gap-2 sm:w-auto sm:min-w-[120px]"
              >
                <ChevronLeft className="size-5" />
                Previous
              </Button>

              {!isCompleted ? (
                <Button
                  onClick={completeCurrentStep}
                  size="lg"
                  className="h-12 w-full gap-2 bg-amber-600 text-base font-semibold text-white shadow-lg hover:bg-amber-700 sm:w-auto sm:min-w-[180px]"
                >
                  <CheckCircle2 className="size-5" />
                  Complete
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={isLastStep}
                  size="lg"
                  className="w-full gap-2 sm:w-auto sm:min-w-[120px]"
                >
                  Next
                  <ChevronRight className="size-5" />
                </Button>
              )}

              {!isLastStep && !isCompleted && (
                <Button
                  onClick={nextStep}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 sm:w-auto sm:min-w-[120px]"
                >
                  Skip
                  <ChevronRight className="size-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-semibold">
                {completedSteps.size} / {selectedRoutine.steps.length} steps
                completed
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step List Preview */}
          <div className="bg-muted/30 rounded-lg border p-3 sm:p-4">
            <div className="text-muted-foreground mb-2 text-xs font-medium sm:mb-3">
              All Steps
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {selectedRoutine.steps.map((step, idx) => {
                const stepCompleted = completedSteps.has(idx)
                const isCurrent = idx === guidedStepIndex
                return (
                  <button
                    key={step.id}
                    onClick={() => setGuidedStepIndex(idx)}
                    className={`rounded-lg p-2 text-left text-xs transition-all ${
                      isCurrent
                        ? 'bg-amber-500 text-white ring-2 ring-amber-500'
                        : stepCompleted
                          ? 'border border-green-500/30 bg-green-500/20 text-green-700 dark:text-green-400'
                          : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {stepCompleted ? (
                        <CheckCircle2 className="size-3 shrink-0" />
                      ) : (
                        <Circle className="size-3 shrink-0" />
                      )}
                      <span className="truncate font-medium">{step.title}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Overview Mode View
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Coffee className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <CardTitle className="truncate text-lg sm:text-xl">
                {selectedRoutine.name}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {selectedRoutine.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={startGuidedBrew}
              className="flex-1 gap-1.5 bg-amber-600 text-xs hover:bg-amber-700 sm:flex-initial sm:gap-2 sm:text-sm"
            >
              <Navigation className="size-3.5 sm:size-4" />
              <span className="xs:inline hidden">Start Guided</span>
              <span className="xs:hidden">Start</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRoutine(null)}
              className="text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Change Routine</span>
              <span className="sm:hidden">Change</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Reference */}
        <div className="bg-muted/30 rounded-lg border p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-muted-foreground">Coffee:</span>
                <span className="ml-2 font-semibold">
                  {selectedRoutine.coffee}g
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Water:</span>
                <span className="ml-2 font-semibold">
                  {selectedRoutine.water}g
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Grinder:</span>
                <span className="ml-2 font-semibold">
                  {selectedRoutine.grinder === 'ode' ? 'Ode' : 'S3'} @{' '}
                  {selectedRoutine.grinderSetting}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Filter:</span>
                <span className="ml-2 font-semibold">
                  {selectedRoutine.filter}
                </span>
              </div>
            </div>
            {selectedRoutine.waterTemp && (
              <Badge variant="secondary">
                <span className="text-muted-foreground">Temp:</span>
                <span className="ml-1">{selectedRoutine.waterTemp}°F</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <Timer className="size-4 shrink-0 text-amber-600 sm:size-5 dark:text-amber-400" />
              <span className="font-mono text-xl font-bold sm:text-2xl">
                {formatTime(elapsedTime)}
              </span>
            </div>
            {currentActiveStep && isActive && (
              <Badge variant="default" className="animate-pulse">
                {currentActiveStep.title}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {timerState === 'idle' && (
              <Button onClick={startBrew} size="sm" className="gap-2">
                <Play className="size-4" />
                Start Brew
              </Button>
            )}
            {timerState === 'running' && (
              <Button
                onClick={pauseBrew}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Pause className="size-4" />
                Pause
              </Button>
            )}
            {timerState === 'paused' && (
              <>
                <Button onClick={resumeBrew} size="sm" className="gap-2">
                  <Play className="size-4" />
                  Resume
                </Button>
                <Button
                  onClick={resetBrew}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress */}
        {timerState !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">
                {completedSteps.size} / {selectedRoutine.steps.length} steps
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Steps */}
        <div className="space-y-2">
          {selectedRoutine.steps.map((step, idx) => {
            const isCompleted = completedSteps.has(idx)
            const isCurrent = idx === currentStep
            const hasTiming = step.timing !== undefined
            const timingPassed =
              hasTiming && elapsedTime >= (step.timing?.start || 0)
            const isActiveStep = currentActiveStep?.id === step.id

            return (
              <div
                key={step.id}
                className={`rounded-lg border p-3 transition-all ${
                  isActiveStep && timerState === 'running'
                    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 dark:bg-amber-950/20'
                    : isCompleted
                      ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/10'
                      : isCurrent
                        ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/10'
                        : 'bg-muted/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-3">
                    <button
                      onClick={() =>
                        !isCompleted &&
                        timerState !== 'idle' &&
                        completeStep(idx)
                      }
                      className="mt-0.5 cursor-pointer transition-all hover:scale-110 active:scale-95"
                      disabled={isCompleted || timerState === 'idle'}
                      aria-label={
                        isCompleted ? 'Step completed' : 'Mark step as complete'
                      }
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="size-6 text-green-500" />
                      ) : (
                        <Circle
                          className={`size-6 ${timerState !== 'idle' ? 'text-muted-foreground hover:text-foreground cursor-pointer' : 'text-muted-foreground'}`}
                        />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">{step.title}</h4>
                        {hasTiming && (
                          <Badge variant="outline" className="text-xs">
                            {formatTime(step.timing?.start || 0)}
                            {step.timing?.duration &&
                              ` - ${formatTime((step.timing.start || 0) + (step.timing.duration || 0))}`}
                          </Badge>
                        )}
                        {isActiveStep && timerState === 'running' && (
                          <Badge
                            variant="default"
                            className="animate-pulse text-xs"
                          >
                            Now
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {step.description}
                      </p>
                      {step.action && (
                        <p className="text-foreground mt-1.5 text-xs font-medium">
                          → {step.action}
                        </p>
                      )}
                      {step.tips && step.tips.length > 0 && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <p className="text-muted-foreground text-xs">
                            {step.tips[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {!isCompleted && timerState !== 'idle' && (
                    <Button
                      onClick={() => completeStep(idx)}
                      size="default"
                      variant="outline"
                      className="min-w-[100px] shrink-0"
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tips */}
        {selectedRoutine.tips && selectedRoutine.tips.length > 0 && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertDescription>
              <div className="space-y-1">
                {selectedRoutine.tips.map((tip, idx) => (
                  <p key={idx} className="text-sm">
                    {tip}
                  </p>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
