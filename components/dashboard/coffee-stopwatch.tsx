'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CoffeeService } from '@/lib/services/coffee.service'
import type { BrewStep, CoffeeRoutine } from '@/lib/types/coffee.types'
import {
  Bell,
  BellOff,
  ChevronRight,
  Coffee,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const coffeeService = new CoffeeService()

type TimerState = 'idle' | 'running' | 'paused'

// Audio notification helper
const playAlertSound = () => {
  try {
    const audioContext = new (
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 880
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.4
    )

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.4)
  } catch (error) {
    console.warn('Audio notification failed', error)
  }
}

interface TimingCue {
  time: number
  title: string
  action?: string
  triggered: boolean
}

export function CoffeeStopwatch() {
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [selectedRoutine, setSelectedRoutine] = useState<CoffeeRoutine | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [timingCues, setTimingCues] = useState<TimingCue[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const triggeredAlertsRef = useRef<Set<number>>(new Set())

  const routines = coffeeService.getRoutines()

  // Initialize with recommended routine
  useEffect(() => {
    const recommended = coffeeService.getRecommendedRoutine()
    if (recommended) {
      const routine = coffeeService.getRoutineByType(recommended)
      if (routine) {
        setSelectedRoutine(routine)
      }
    }
  }, [])

  // Build timing cues when routine changes
  useEffect(() => {
    if (selectedRoutine) {
      const cues: TimingCue[] = []
      selectedRoutine.steps.forEach((step) => {
        if (step.timing?.alert || step.timing?.start !== undefined) {
          cues.push({
            time: step.timing.start,
            title: step.title,
            action: step.action,
            triggered: false,
          })
        }
      })
      // Sort by time
      cues.sort((a, b) => a.time - b.time)
      setTimingCues(cues)
    } else {
      setTimingCues([])
    }
  }, [selectedRoutine])

  // Timer logic
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => {
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
  }, [timerState])

  const checkTimingAlerts = (time: number) => {
    timingCues.forEach((cue) => {
      if (cue.time === time && !triggeredAlertsRef.current.has(cue.time)) {
        triggeredAlertsRef.current.add(cue.time)
        if (soundEnabled) {
          playAlertSound()
        }
        toast.info(`⏰ ${cue.title}`, {
          description: cue.action,
          duration: 5000,
        })
        // Update cue as triggered
        setTimingCues((prev) =>
          prev.map((c) => (c.time === cue.time ? { ...c, triggered: true } : c))
        )
      }
    })
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeDetailed = (seconds: number): { mins: string; secs: string; ms: string } => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return {
      mins: mins.toString().padStart(2, '0'),
      secs: secs.toString().padStart(2, '0'),
      ms: '00',
    }
  }

  const startTimer = () => {
    setTimerState('running')
    if (elapsedTime === 0) {
      triggeredAlertsRef.current.clear()
      setTimingCues((prev) => prev.map((c) => ({ ...c, triggered: false })))
    }
  }

  const pauseTimer = () => {
    setTimerState('paused')
  }

  const resetTimer = () => {
    setTimerState('idle')
    setElapsedTime(0)
    triggeredAlertsRef.current.clear()
    setTimingCues((prev) => prev.map((c) => ({ ...c, triggered: false })))
  }

  const getNextCue = (): TimingCue | null => {
    return timingCues.find((cue) => cue.time > elapsedTime) || null
  }

  const getCurrentCue = (): TimingCue | null => {
    // Find the most recent cue that has been triggered
    const triggeredCues = timingCues.filter((cue) => cue.time <= elapsedTime)
    return triggeredCues[triggeredCues.length - 1] || null
  }

  const nextCue = getNextCue()
  const currentCue = getCurrentCue()
  const timeDetailed = formatTimeDetailed(elapsedTime)

  // Fullscreen view
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Coffee className="size-6 text-amber-600 sm:size-8 dark:text-amber-400" />
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">
                {selectedRoutine?.name || 'Stopwatch'}
              </h2>
              {selectedRoutine && (
                <p className="text-muted-foreground text-sm">
                  {selectedRoutine.coffee}g : {selectedRoutine.water}g ({selectedRoutine.ratio})
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="size-10 sm:size-12"
            >
              {soundEnabled ? (
                <Bell className="size-5 sm:size-6" />
              ) : (
                <BellOff className="size-5 sm:size-6" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(false)}
              className="size-10 sm:size-12"
            >
              <Minimize2 className="size-5 sm:size-6" />
            </Button>
          </div>
        </div>

        {/* Main Timer Display */}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          {/* Current/Next Cue Display */}
          {timerState !== 'idle' && selectedRoutine && (
            <div className="mb-8 text-center sm:mb-12">
              {currentCue && (
                <div className="mb-2">
                  <Badge variant="secondary" className="text-sm sm:text-base">
                    Current: {currentCue.title}
                  </Badge>
                </div>
              )}
              {nextCue && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <span className="text-sm sm:text-lg">Next:</span>
                  <span className="font-medium text-foreground text-sm sm:text-lg">
                    {nextCue.title}
                  </span>
                  <span className="text-sm sm:text-lg">at {formatTime(nextCue.time)}</span>
                  {nextCue.time - elapsedTime <= 10 && nextCue.time - elapsedTime > 0 && (
                    <Badge variant="default" className="animate-pulse">
                      in {nextCue.time - elapsedTime}s
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Giant Timer */}
          <div className="mb-8 sm:mb-12">
            <div className="font-mono text-[80px] font-bold tracking-tight sm:text-[120px] md:text-[160px] lg:text-[200px]">
              <span>{timeDetailed.mins}</span>
              <span className="text-muted-foreground animate-pulse">:</span>
              <span>{timeDetailed.secs}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 sm:gap-6">
            {timerState === 'idle' && (
              <Button
                onClick={startTimer}
                size="lg"
                className="h-16 w-40 gap-3 bg-amber-600 text-xl hover:bg-amber-700 sm:h-20 sm:w-48 sm:text-2xl"
              >
                <Play className="size-6 sm:size-8" />
                Start
              </Button>
            )}
            {timerState === 'running' && (
              <>
                <Button
                  onClick={pauseTimer}
                  variant="outline"
                  size="lg"
                  className="h-16 w-32 gap-3 text-lg sm:h-20 sm:w-40 sm:text-xl"
                >
                  <Pause className="size-6 sm:size-8" />
                  Pause
                </Button>
                <Button
                  onClick={resetTimer}
                  variant="outline"
                  size="lg"
                  className="h-16 w-32 gap-3 text-lg sm:h-20 sm:w-40 sm:text-xl"
                >
                  <RotateCcw className="size-6 sm:size-8" />
                  Reset
                </Button>
              </>
            )}
            {timerState === 'paused' && (
              <>
                <Button
                  onClick={startTimer}
                  size="lg"
                  className="h-16 w-32 gap-3 bg-amber-600 text-lg hover:bg-amber-700 sm:h-20 sm:w-40 sm:text-xl"
                >
                  <Play className="size-6 sm:size-8" />
                  Resume
                </Button>
                <Button
                  onClick={resetTimer}
                  variant="outline"
                  size="lg"
                  className="h-16 w-32 gap-3 text-lg sm:h-20 sm:w-40 sm:text-xl"
                >
                  <RotateCcw className="size-6 sm:size-8" />
                  Reset
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Timing Cues Bar */}
        {selectedRoutine && timingCues.length > 0 && (
          <div className="border-t bg-muted/30 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
              {timingCues.map((cue, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all sm:px-4 sm:py-3 sm:text-base ${
                    cue.triggered
                      ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
                      : cue.time === nextCue?.time
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-border bg-background'
                  }`}
                >
                  <span className="font-mono font-semibold">{formatTime(cue.time)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{cue.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Regular card view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="size-5 text-amber-600 dark:text-amber-400" />
            <div>
              <CardTitle className="text-lg">Brew Stopwatch</CardTitle>
              <CardDescription>Timer with routine alerts</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="size-8"
              title={soundEnabled ? 'Mute alerts' : 'Enable alerts'}
            >
              {soundEnabled ? (
                <Bell className="size-4" />
              ) : (
                <BellOff className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(true)}
              className="size-8"
              title="Fullscreen"
            >
              <Maximize2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Routine Selector */}
        <div className="flex items-center gap-3">
          <Select
            value={selectedRoutine?.id || ''}
            onValueChange={(value) => {
              const routine = routines.find((r) => r.id === value)
              setSelectedRoutine(routine || null)
              resetTimer()
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a routine for timing cues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No routine (plain stopwatch)</SelectItem>
              {routines.map((routine) => (
                <SelectItem key={routine.id} value={routine.id}>
                  {routine.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timer Display */}
        <div className="rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-6 text-center dark:from-amber-950/30 dark:to-orange-950/20">
          <div className="font-mono text-5xl font-bold tracking-tight sm:text-6xl">
            <span>{timeDetailed.mins}</span>
            <span className={`text-muted-foreground ${timerState === 'running' ? 'animate-pulse' : ''}`}>:</span>
            <span>{timeDetailed.secs}</span>
          </div>

          {/* Current/Next Cue */}
          {timerState !== 'idle' && selectedRoutine && nextCue && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Next:</span>
              <span className="font-medium">{nextCue.title}</span>
              <span className="text-muted-foreground">at {formatTime(nextCue.time)}</span>
              {nextCue.time - elapsedTime <= 10 && nextCue.time - elapsedTime > 0 && (
                <Badge variant="default" className="animate-pulse text-xs">
                  {nextCue.time - elapsedTime}s
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-3">
          {timerState === 'idle' && (
            <Button
              onClick={startTimer}
              size="lg"
              className="h-12 flex-1 gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <Play className="size-5" />
              Start
            </Button>
          )}
          {timerState === 'running' && (
            <>
              <Button
                onClick={pauseTimer}
                variant="outline"
                size="lg"
                className="h-12 flex-1 gap-2"
              >
                <Pause className="size-5" />
                Pause
              </Button>
              <Button
                onClick={resetTimer}
                variant="outline"
                size="lg"
                className="h-12 gap-2"
              >
                <RotateCcw className="size-5" />
              </Button>
            </>
          )}
          {timerState === 'paused' && (
            <>
              <Button
                onClick={startTimer}
                size="lg"
                className="h-12 flex-1 gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <Play className="size-5" />
                Resume
              </Button>
              <Button
                onClick={resetTimer}
                variant="outline"
                size="lg"
                className="h-12 gap-2"
              >
                <RotateCcw className="size-5" />
              </Button>
            </>
          )}
        </div>

        {/* Timing Cues Preview */}
        {selectedRoutine && timingCues.length > 0 && (
          <div className="space-y-2">
            <div className="text-muted-foreground text-xs font-medium">
              Timing Cues
            </div>
            <div className="flex flex-wrap gap-2">
              {timingCues.slice(0, 6).map((cue, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-all ${
                    cue.triggered
                      ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
                      : cue.time === nextCue?.time
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-border bg-muted/30'
                  }`}
                >
                  <span className="font-mono font-semibold">{formatTime(cue.time)}</span>
                  <ChevronRight className="size-3 text-muted-foreground" />
                  <span className="truncate max-w-[100px]">{cue.title}</span>
                </div>
              ))}
              {timingCues.length > 6 && (
                <div className="flex items-center text-muted-foreground text-xs">
                  +{timingCues.length - 6} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fullscreen hint */}
        <div className="text-center">
          <Button
            variant="link"
            size="sm"
            onClick={() => setIsFullscreen(true)}
            className="text-muted-foreground text-xs"
          >
            <Maximize2 className="mr-1 size-3" />
            Open fullscreen for easier viewing while brewing
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
