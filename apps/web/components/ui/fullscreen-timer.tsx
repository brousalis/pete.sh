"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Play, Pause, RotateCcw, Volume2, VolumeX, X, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface FullscreenTimerProps {
  /** Whether the timer modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Duration in seconds */
  duration: number
  /** Exercise name for display */
  exerciseName: string
  /** Optional subtitle (e.g., exercise instructions) */
  subtitle?: string
  /** Callback when timer completes */
  onComplete?: () => void
  /** Whether to auto-start the timer when opened */
  autoStart?: boolean
  /** Optional callback to skip to next exercise */
  onSkip?: () => void
  /** Theme color variant */
  variant?: "morning" | "night" | "workout"
  /** Custom class name */
  className?: string
}

/**
 * FullscreenTimer - A beautiful, immersive modal timer for exercises.
 * 
 * Features:
 * - Large circular progress indicator with glow effect
 * - Audio cues: start beep, 10s warning, countdown beeps, completion chime
 * - Touch-friendly controls
 * - Theme variants for morning/night/workout
 * - Smooth animations
 */
export function FullscreenTimer({
  isOpen,
  onClose,
  duration,
  exerciseName,
  subtitle,
  onComplete,
  autoStart = true,
  onSkip,
  variant = "workout",
  className,
}: FullscreenTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration)
  const [isRunning, setIsRunning] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Theme configuration
  const themes = {
    morning: {
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      ring: "text-amber-500",
      ringGlow: "drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]",
      accent: "bg-amber-500 hover:bg-amber-600",
      badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    night: {
      gradient: "from-indigo-500/20 via-purple-500/10 to-transparent",
      ring: "text-indigo-500",
      ringGlow: "drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]",
      accent: "bg-indigo-500 hover:bg-indigo-600",
      badge: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    },
    workout: {
      gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
      ring: "text-blue-500",
      ringGlow: "drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]",
      accent: "bg-blue-500 hover:bg-blue-600",
      badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
  }

  const theme = themes[variant]

  // Initialize audio context on first user interaction
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // Play a beep sound with configurable parameters
  const playBeep = useCallback((frequency: number, beepDuration: number, type: OscillatorType = "sine", volume: number = 0.3) => {
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
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + beepDuration)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + beepDuration)
    } catch {
      // Audio not available, fail silently
    }
  }, [isMuted, initAudio])

  // Sound effects
  const playStartSound = useCallback(() => playBeep(880, 0.15, "sine", 0.25), [playBeep])
  const playWarningSound = useCallback(() => playBeep(660, 0.1, "sine", 0.2), [playBeep])
  const playTickSound = useCallback(() => playBeep(440, 0.05, "sine", 0.15), [playBeep])
  const playCompleteSound = useCallback(() => {
    playBeep(523.25, 0.15, "sine", 0.3) // C5
    setTimeout(() => playBeep(659.25, 0.15, "sine", 0.3), 150) // E5
    setTimeout(() => playBeep(783.99, 0.25, "sine", 0.3), 300) // G5
  }, [playBeep])

  // Reset state when modal opens/closes or duration changes
  useEffect(() => {
    if (isOpen) {
      setTimeRemaining(duration)
      setIsRunning(false)
      setHasStarted(false)
      setIsCompleted(false)
    }
  }, [isOpen, duration])

  // Auto-start when modal opens
  useEffect(() => {
    if (isOpen && autoStart && !hasStarted) {
      // Small delay for smooth animation
      const timeout = setTimeout(() => {
        handleStart()
      }, 300)
      return () => clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoStart])

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
          // Play tick beeps in last 5 seconds
          if (newTime <= 5 && newTime > 0) {
            playTickSound()
          }
          
          return newTime
        })
      }, 1000)
    } else if (timeRemaining === 0 && hasStarted && !isCompleted) {
      setIsCompleted(true)
      playCompleteSound()
      setIsRunning(false)
      // Auto-complete after a brief moment to show the completion state
      setTimeout(() => {
        onComplete?.()
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeRemaining, hasStarted, isCompleted, playWarningSound, playTickSound, playCompleteSound, onComplete])

  const handleStart = () => {
    initAudio() // Initialize audio on user interaction
    if (!hasStarted) {
      setHasStarted(true)
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
    setIsCompleted(false)
  }

  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

  const handleClose = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    onClose()
  }

  const handleSkip = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    onSkip?.()
  }

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`
    }
    return `${secs}`
  }

  // Calculate progress percentage
  const progress = ((duration - timeRemaining) / duration) * 100
  
  // SVG dimensions for large ring
  const size = 280
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Determine color based on state
  const getProgressColor = () => {
    if (isCompleted) return "text-emerald-500"
    if (timeRemaining <= 5) return "text-red-500"
    if (timeRemaining <= 10) return "text-orange-500"
    return theme.ring
  }

  const getGlowEffect = () => {
    if (isCompleted) return "drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]"
    if (timeRemaining <= 5) return "drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]"
    if (timeRemaining <= 10) return "drop-shadow-[0_0_25px_rgba(249,115,22,0.6)]"
    return theme.ringGlow
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className={cn(
          "max-w-full h-[100dvh] sm:max-w-full sm:h-[100dvh] p-0 border-0 gap-0",
          "bg-gradient-to-b from-background via-background to-background/95",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={handleClose}
      >
        {/* Accessibility */}
        <VisuallyHidden>
          <DialogTitle>Exercise Timer: {exerciseName}</DialogTitle>
        </VisuallyHidden>

        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-radial",
          theme.gradient,
          "pointer-events-none"
        )} />

        {/* Close button - top right */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-50 h-12 w-12 rounded-full bg-muted/50 hover:bg-muted"
          onClick={handleClose}
        >
          <X className="size-6" />
        </Button>

        {/* Mute button - top left */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 z-50 h-12 w-12 rounded-full bg-muted/50 hover:bg-muted"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="size-6 text-muted-foreground" />
          ) : (
            <Volume2 className="size-6" />
          )}
        </Button>

        {/* Main content - centered */}
        <div className="flex h-full flex-col items-center justify-center px-6 py-12">
          {/* Exercise name */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-foreground/90">
              {exerciseName}
            </h2>
            {subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Large circular progress */}
          <div className="relative mb-10">
            <svg 
              className={cn(
                "transform -rotate-90 transition-all duration-300",
                getGlowEffect()
              )} 
              width={size} 
              height={size}
            >
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/20"
              />
              {/* Progress ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  "transition-all duration-300 ease-out",
                  getProgressColor()
                )}
              />
            </svg>
            
            {/* Time display in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                "font-mono font-bold tabular-nums tracking-tight transition-all duration-300",
                timeRemaining <= 5 && isRunning ? "text-7xl sm:text-8xl scale-110" : "text-6xl sm:text-7xl",
                isCompleted ? "text-emerald-500" : "text-foreground"
              )}>
                {formatTime(timeRemaining)}
              </span>
              {isCompleted ? (
                <span className="mt-2 text-lg font-semibold text-emerald-500 animate-pulse">
                  Complete!
                </span>
              ) : (
                <span className="mt-2 text-sm text-muted-foreground">
                  {isRunning ? "seconds remaining" : hasStarted ? "paused" : "tap to start"}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Reset button */}
            <Button
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full border-2 bg-background/50 backdrop-blur-sm"
              onClick={handleReset}
              disabled={!hasStarted}
            >
              <RotateCcw className="size-6" />
            </Button>

            {/* Play/Pause button - primary action */}
            <Button
              size="icon"
              className={cn(
                "h-20 w-20 rounded-full text-white shadow-lg transition-all",
                isCompleted 
                  ? "bg-emerald-500 hover:bg-emerald-600" 
                  : isRunning
                    ? "bg-muted hover:bg-muted/80 text-foreground"
                    : theme.accent,
                !isRunning && !isCompleted && "animate-pulse"
              )}
              onClick={isRunning ? handlePause : handleStart}
              disabled={isCompleted}
            >
              {isRunning ? (
                <Pause className="size-8" />
              ) : (
                <Play className="size-8 ml-1" />
              )}
            </Button>

            {/* Skip button */}
            {onSkip && (
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full border-2 bg-background/50 backdrop-blur-sm"
                onClick={handleSkip}
              >
                <SkipForward className="size-6" />
              </Button>
            )}
          </div>

          {/* Duration indicator */}
          <div className="mt-8 text-center">
            <span className="text-xs text-muted-foreground/60">
              Total duration: {duration}s
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
