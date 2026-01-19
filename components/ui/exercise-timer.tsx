"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ExerciseTimerProps {
  /** Duration in seconds */
  duration: number
  /** Exercise name for display */
  exerciseName?: string
  /** Callback when timer completes */
  onComplete?: () => void
  /** Callback when timer starts */
  onStart?: () => void
  /** Whether to auto-start the timer */
  autoStart?: boolean
  /** Compact mode for narrow panels */
  compact?: boolean
  /** Show inline (horizontal) vs stacked (vertical) layout */
  inline?: boolean
  /** Custom class name */
  className?: string
}

/**
 * ExerciseTimer - A countdown timer with visual progress and audio cues.
 * 
 * Features:
 * - Circular progress indicator
 * - Audio cues: start beep, 10s warning, completion chime
 * - Play/pause/reset controls
 * - Compact mode for narrow layouts
 */
export function ExerciseTimer({
  duration,
  exerciseName,
  onComplete,
  onStart,
  autoStart = false,
  compact = false,
  inline = false,
  className,
}: ExerciseTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration)
  const [isRunning, setIsRunning] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize audio context on first user interaction
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // Play a beep sound
  const playBeep = useCallback((frequency: number, duration: number, type: OscillatorType = "sine") => {
    if (isMuted) return
    
    try {
      const ctx = initAudio()
      if (ctx.state === "suspended") {
        ctx.resume()
      }
      
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = type
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch {
      // Audio not available, fail silently
    }
  }, [isMuted, initAudio])

  // Sound effects
  const playStartSound = useCallback(() => playBeep(880, 0.15), [playBeep])
  const playWarningSound = useCallback(() => playBeep(660, 0.1), [playBeep])
  const playCompleteSound = useCallback(() => {
    playBeep(523, 0.15) // C5
    setTimeout(() => playBeep(659, 0.15), 150) // E5
    setTimeout(() => playBeep(784, 0.3), 300) // G5
  }, [playBeep])

  // Timer logic
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1
          
          // Play warning sound at 10 seconds
          if (newTime === 10) {
            playWarningSound()
          }
          // Play warning beeps in last 3 seconds
          if (newTime <= 3 && newTime > 0) {
            playWarningSound()
          }
          
          return newTime
        })
      }, 1000)
    } else if (timeRemaining === 0 && hasStarted) {
      playCompleteSound()
      setIsRunning(false)
      onComplete?.()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeRemaining, hasStarted, playWarningSound, playCompleteSound, onComplete])

  // Auto-start
  useEffect(() => {
    if (autoStart && !hasStarted) {
      handleStart()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  const handleStart = () => {
    initAudio() // Initialize audio on user interaction
    if (!hasStarted) {
      setHasStarted(true)
      onStart?.()
    }
    setIsRunning(true)
    playStartSound()
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setTimeRemaining(duration)
    setHasStarted(false)
  }

  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

  // Format time as MM:SS or just SS for short durations
  const formatTime = (seconds: number): string => {
    if (duration < 60) {
      return `${seconds}s`
    }
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Calculate progress percentage
  const progress = ((duration - timeRemaining) / duration) * 100
  const circumference = 2 * Math.PI * 18 // radius = 18
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Determine color based on state
  const getProgressColor = () => {
    if (timeRemaining === 0) return "text-green-500"
    if (timeRemaining <= 10) return "text-orange-500"
    return "text-blue-500"
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {/* Compact circular progress */}
        <div className="relative size-8 shrink-0">
          <svg className="size-8 -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/30"
            />
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn("transition-all duration-300", getProgressColor())}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-medium">
            {timeRemaining}
          </span>
        </div>
        
        {/* Compact controls */}
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={isRunning ? handlePause : handleStart}
        >
          {isRunning ? (
            <Pause className="size-3" />
          ) : (
            <Play className="size-3" />
          )}
        </Button>
      </div>
    )
  }

  if (inline) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Inline circular progress */}
        <div className="relative size-10 shrink-0">
          <svg className="size-10 -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/30"
            />
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn("transition-all duration-300", getProgressColor())}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-medium">
            {formatTime(timeRemaining)}
          </span>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={isRunning ? handlePause : handleStart}
          >
            {isRunning ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleReset}
            disabled={!hasStarted}
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="size-3.5" />
            ) : (
              <Volume2 className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Full stacked layout
  return (
    <div className={cn("flex flex-col items-center gap-3 p-3", className)}>
      {exerciseName && (
        <div className="text-sm font-medium text-center truncate max-w-full">
          {exerciseName}
        </div>
      )}
      
      {/* Circular progress */}
      <div className="relative size-20">
        <svg className="size-20 -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-muted/30"
          />
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-300", getProgressColor())}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-mono font-bold">
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          onClick={handleReset}
          disabled={!hasStarted}
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          variant={isRunning ? "secondary" : "default"}
          size="icon"
          className="size-12"
          onClick={isRunning ? handlePause : handleStart}
        >
          {isRunning ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5 ml-0.5" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="size-4" />
          ) : (
            <Volume2 className="size-4" />
          )}
        </Button>
      </div>

      {/* Status text */}
      {timeRemaining === 0 && (
        <div className="text-sm font-medium text-green-500">Complete!</div>
      )}
    </div>
  )
}
