'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ChefHat,
  List,
  Check,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { RecipeWithIngredients, RecipeStep } from '@/lib/types/cooking.types'

interface CookingModeProps {
  recipe: RecipeWithIngredients
  open: boolean
  onClose: () => void
}

export function CookingMode({ recipe, open, onClose }: CookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showIngredients, setShowIngredients] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerComplete, setTimerComplete] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const steps = recipe.instructions || []
  const step = steps[currentStep]
  const totalSteps = steps.length
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0

  // Wake Lock API
  useEffect(() => {
    if (!open) return
    let wakeLock: WakeLockSentinel | null = null
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake Lock not supported or denied
      }
    }
    requestWakeLock()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      wakeLock?.release()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [open])

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerSeconds !== null && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev === null || prev <= 1) {
            setTimerRunning(false)
            setTimerComplete(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timerRunning, timerSeconds])

  // Reset timer when step changes
  useEffect(() => {
    setTimerRunning(false)
    setTimerComplete(false)
    if (step?.duration) {
      setTimerSeconds(step.duration * 60)
    } else {
      setTimerSeconds(null)
    }
  }, [currentStep, step?.duration])

  const handlePrevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  const handleNextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1))
  }, [totalSteps])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevStep()
      if (e.key === 'ArrowRight') handleNextStep()
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' && timerSeconds !== null) {
        e.preventDefault()
        setTimerRunning((r) => !r)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handlePrevStep, handleNextStep, onClose, timerSeconds])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const resetTimer = () => {
    setTimerRunning(false)
    setTimerComplete(false)
    if (step?.duration) {
      setTimerSeconds(step.duration * 60)
    }
  }

  if (!open) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <ChefHat className="size-5 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate">{recipe.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setShowIngredients(!showIngredients)}
          >
            <List className="size-4 mr-1.5" />
            Ingredients
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-1 rounded-none" />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        <AnimatePresence mode="wait">
          {showIngredients ? (
            <motion.div
              key="ingredients"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-lg px-6"
            >
              <h2 className="text-lg font-semibold mb-4 text-center">
                Ingredients
              </h2>
              <ScrollArea className="max-h-[60vh]">
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="size-5 rounded-full border-2 shrink-0" />
                      <span className="text-base font-medium">{ing.name}</span>
                      {(ing.amount || ing.unit) && (
                        <span className="text-sm text-muted-foreground ml-auto">
                          {ing.amount} {ing.unit}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </motion.div>
          ) : step ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl px-6 text-center"
            >
              {/* Step counter */}
              <Badge variant="secondary" className="mb-6 text-sm">
                Step {currentStep + 1} of {totalSteps}
              </Badge>

              {/* Step text */}
              <p className="text-2xl sm:text-3xl md:text-4xl font-medium leading-relaxed">
                {step.instruction}
              </p>

              {/* Timer */}
              {step.duration && (
                <div className="mt-8">
                  <div
                    className={cn(
                      'inline-flex flex-col items-center gap-3 rounded-2xl border p-6',
                      timerComplete
                        ? 'border-green-500/50 bg-green-500/5'
                        : 'bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Clock
                        className={cn(
                          'size-5',
                          timerComplete
                            ? 'text-green-500'
                            : 'text-muted-foreground'
                        )}
                      />
                      <span
                        className={cn(
                          'text-4xl font-bold tabular-nums',
                          timerComplete && 'text-green-600'
                        )}
                      >
                        {timerSeconds !== null
                          ? formatTime(timerSeconds)
                          : `${step.duration}:00`}
                      </span>
                    </div>
                    {timerComplete ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="size-5" />
                        <span className="text-sm font-medium">Timer complete!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-10 rounded-full"
                          onClick={resetTimer}
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="size-12 rounded-full"
                          onClick={() => setTimerRunning(!timerRunning)}
                        >
                          {timerRunning ? (
                            <Pause className="size-5" />
                          ) : (
                            <Play className="size-5 ml-0.5" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-center text-muted-foreground">
              <ChefHat className="size-12 mx-auto mb-3 opacity-30" />
              <p>No instructions available</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t px-6 py-4 shrink-0">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrevStep}
          disabled={currentStep === 0}
          className="min-w-[120px]"
        >
          <ChevronLeft className="size-5 mr-1" />
          Previous
        </Button>

        {/* Step dots */}
        <div className="hidden sm:flex items-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={cn(
                'size-2.5 rounded-full transition-colors',
                i === currentStep
                  ? 'bg-primary'
                  : i < currentStep
                    ? 'bg-primary/30'
                    : 'bg-muted-foreground/20'
              )}
            />
          ))}
        </div>

        {currentStep === totalSteps - 1 ? (
          <Button size="lg" onClick={onClose} className="min-w-[120px]">
            <Check className="size-5 mr-1" />
            Done
          </Button>
        ) : (
          <Button size="lg" onClick={handleNextStep} className="min-w-[120px]">
            Next
            <ChevronRight className="size-5 ml-1" />
          </Button>
        )}
      </div>
    </motion.div>
  )
}
