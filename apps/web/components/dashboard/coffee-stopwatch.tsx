'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TimingCue } from '@/lib/types/coffee.types'
import {
  Bell,
  BellOff,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

type TimerState = 'idle' | 'running' | 'paused'

// Audio notification helper
const playAlertSound = () => {
  try {
    const audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 880
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.4)
  } catch (error) {
    console.warn('Audio notification failed', error)
  }
}

interface CoffeeStopwatchProps {
  timingCues?: TimingCue[]
  onFullscreenChange?: (isFullscreen: boolean) => void
}

export function CoffeeStopwatch({ timingCues = [], onFullscreenChange }: CoffeeStopwatchProps) {
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [triggeredCues, setTriggeredCues] = useState<Set<number>>(new Set())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Timer logic
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
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

  // Check timing cues
  useEffect(() => {
    if (timerState !== 'running') return

    timingCues.forEach((cue) => {
      if (cue.time === elapsedTime && !triggeredCues.has(cue.time)) {
        setTriggeredCues((prev) => new Set(prev).add(cue.time))
        if (soundEnabled) {
          playAlertSound()
        }
        toast.info(`⏰ ${cue.label}`, {
          description: cue.action,
          duration: 5000,
        })
      }
    })
  }, [elapsedTime, timerState, timingCues, soundEnabled, triggeredCues])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeDetailed = () => {
    const mins = Math.floor(elapsedTime / 60)
    const secs = elapsedTime % 60
    return {
      mins: mins.toString().padStart(2, '0'),
      secs: secs.toString().padStart(2, '0'),
    }
  }

  const startTimer = () => {
    setTimerState('running')
    if (elapsedTime === 0) {
      setTriggeredCues(new Set())
    }
  }

  const pauseTimer = () => {
    setTimerState('paused')
  }

  const resetTimer = () => {
    setTimerState('idle')
    setElapsedTime(0)
    setTriggeredCues(new Set())
  }

  const toggleFullscreen = () => {
    const newState = !isFullscreen
    setIsFullscreen(newState)
    onFullscreenChange?.(newState)
  }

  const getNextCue = (): TimingCue | null => {
    return timingCues.find((cue) => cue.time > elapsedTime) || null
  }

  const nextCue = getNextCue()
  const timeDetailed = formatTimeDetailed()

  // Fullscreen view
  if (isFullscreen) {
    return (
      <div className="bg-background fixed inset-0 z-50 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Timer className="size-6 text-amber-600 sm:size-8 dark:text-amber-400" />
            <h2 className="text-lg font-semibold sm:text-xl">Brew Timer</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="size-10 sm:size-12"
            >
              {soundEnabled ? <Bell className="size-5 sm:size-6" /> : <BellOff className="size-5 sm:size-6" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="size-10 sm:size-12">
              <Minimize2 className="size-5 sm:size-6" />
            </Button>
          </div>
        </div>

        {/* Main Timer Display */}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          {/* Next Cue Display */}
          {timerState !== 'idle' && nextCue && (
            <div className="text-muted-foreground mb-8 flex items-center justify-center gap-2 sm:mb-12">
              <span className="text-sm sm:text-lg">Next:</span>
              <span className="text-foreground text-sm font-medium sm:text-lg">{nextCue.label}</span>
              <span className="text-sm sm:text-lg">at {formatTime(nextCue.time)}</span>
              {nextCue.time - elapsedTime <= 10 && nextCue.time - elapsedTime > 0 && (
                <Badge variant="default" className="animate-pulse">
                  in {nextCue.time - elapsedTime}s
                </Badge>
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
                <Button onClick={pauseTimer} variant="outline" size="lg" className="h-16 w-32 gap-3 text-lg sm:h-20 sm:w-40 sm:text-xl">
                  <Pause className="size-6 sm:size-8" />
                  Pause
                </Button>
                <Button onClick={resetTimer} variant="outline" size="lg" className="h-16 w-32 gap-3 text-lg sm:h-20 sm:w-40 sm:text-xl">
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
                <Button onClick={resetTimer} variant="outline" size="lg" className="h-16 w-32 gap-3 text-lg sm:h-20 sm:w-40 sm:text-xl">
                  <RotateCcw className="size-6 sm:size-8" />
                  Reset
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Timing Cues Bar */}
        {timingCues.length > 0 && (
          <div className="bg-muted/30 border-t p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
              {timingCues.map((cue, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all sm:px-4 sm:py-3 sm:text-base ${
                    triggeredCues.has(cue.time)
                      ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
                      : cue.time === nextCue?.time
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-border bg-background'
                  }`}
                >
                  <span className="font-mono font-semibold">{formatTime(cue.time)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{cue.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Compact card view
  return (
    <div className="space-y-2">
      {/* Timer Display */}
      <div className="rounded-lg border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 px-4 py-3 dark:from-amber-950/30 dark:to-orange-950/20">
        <div className="flex items-center justify-between">
          <div className="font-mono text-4xl font-bold tracking-tight">
            <span>{timeDetailed.mins}</span>
            <span className={`text-muted-foreground ${timerState === 'running' ? 'animate-pulse' : ''}`}>:</span>
            <span>{timeDetailed.secs}</span>
          </div>
          
          {/* Control Buttons - Inline */}
          <div className="flex items-center gap-1.5">
            {timerState === 'idle' && (
              <Button onClick={startTimer} className="h-9 gap-1.5 bg-amber-600 hover:bg-amber-700 px-4">
                <Play className="size-4" />
                Start
              </Button>
            )}
            {timerState === 'running' && (
              <>
                <Button onClick={pauseTimer} variant="outline" className="h-9 gap-1.5 px-3">
                  <Pause className="size-4" />
                  Pause
                </Button>
                <Button onClick={resetTimer} variant="outline" size="icon" className="h-9 w-9">
                  <RotateCcw className="size-4" />
                </Button>
              </>
            )}
            {timerState === 'paused' && (
              <>
                <Button onClick={startTimer} className="h-9 gap-1.5 bg-amber-600 hover:bg-amber-700 px-3">
                  <Play className="size-4" />
                </Button>
                <Button onClick={resetTimer} variant="outline" size="icon" className="h-9 w-9">
                  <RotateCcw className="size-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-9 w-9"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-9 w-9" title="Fullscreen">
              <Maximize2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* Next Cue Indicator - Only show when running */}
        {timerState !== 'idle' && nextCue && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs border-t border-amber-500/20 pt-1.5">
            <span className="text-muted-foreground">Next:</span>
            <span className="font-medium">{nextCue.label}</span>
            <span className="text-muted-foreground">at {formatTime(nextCue.time)}</span>
            {nextCue.time - elapsedTime <= 10 && nextCue.time - elapsedTime > 0 && (
              <Badge variant="default" className="animate-pulse text-[10px] px-1.5 py-0">
                {nextCue.time - elapsedTime}s
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Timing Cues Preview - Compact horizontal scroll */}
      {timingCues.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {timingCues.map((cue, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] whitespace-nowrap transition-all shrink-0 ${
                triggeredCues.has(cue.time)
                  ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
                  : cue.time === nextCue?.time
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'bg-muted/30 border-border'
              }`}
            >
              <span className="font-mono font-semibold">{formatTime(cue.time)}</span>
              <ChevronRight className="text-muted-foreground size-2.5" />
              <span>{cue.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
