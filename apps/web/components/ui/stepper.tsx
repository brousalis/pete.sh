'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { transitions } from '@/lib/animations'

export interface StepperProps {
  steps: string[]
  currentStep: number
  onStepClick?: (index: number) => void
  className?: string
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  const reducedMotion = useReducedMotion()

  return (
    <nav
      className={cn('flex items-center gap-1', className)}
      aria-label="Progress"
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={steps.length}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isClickable = onStepClick != null && index <= currentStep

        return (
          <div key={index} className="flex flex-1 items-center min-w-0">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Step ${index + 1}: ${step}${isCompleted ? ' (completed)' : ''}`}
              className={cn(
                'flex items-center justify-center shrink-0 size-11 min-w-[44px] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                isCompleted && 'bg-primary text-primary-foreground',
                isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                isClickable && 'cursor-pointer hover:opacity-90',
                !isClickable && 'cursor-default'
              )}
            >
              <motion.span
                key={isCurrent ? 'current' : 'other'}
                initial={reducedMotion ? false : { scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={reducedMotion ? undefined : transitions.spring}
                className="font-semibold text-sm tabular-nums"
              >
                {isCompleted ? '✓' : index + 1}
              </motion.span>
            </button>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 min-w-[8px] rounded-full transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
                aria-hidden
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
