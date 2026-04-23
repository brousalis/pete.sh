'use client'

import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Exercise } from '@/lib/types/fitness.types'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Check, ChevronDown, Play } from 'lucide-react'
import { useCallback, useState } from 'react'

interface ExerciseRowProps {
  exercise: Exercise
  completed: boolean
  onToggle: () => void
  index: number
  compact?: boolean
}

export function ExerciseRow({
  exercise,
  completed,
  onToggle,
  index,
  compact = false,
}: ExerciseRowProps) {
  const [flashGreen, setFlashGreen] = useState(false)

  const handleToggle = useCallback(() => {
    if (!completed) {
      setFlashGreen(true)
      setTimeout(() => setFlashGreen(false), 400)
    }
    onToggle()
  }, [completed, onToggle])

  const meta = [
    exercise.sets && exercise.reps
      ? `${exercise.sets} × ${exercise.reps}`
      : null,
    exercise.duration ? `${exercise.duration}s` : null,
    exercise.rest ? `${exercise.rest}s rest` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.18 }}
      className={cn(
        'flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0',
        'hover:bg-muted/10 transition-colors rounded-md -mx-1 px-1',
        completed && 'bg-accent-sage/5',
        flashGreen && 'bg-accent-sage/10',
        compact && 'py-2'
      )}
    >
      <motion.button
        onClick={handleToggle}
        whileTap={{ scale: 0.85 }}
        className={cn(
          'size-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors',
          completed
            ? 'bg-accent-sage border-accent-sage'
            : 'border-border/50 hover:border-accent-sage/50'
        )}
      >
        {completed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Check className="size-3 text-white" />
          </motion.div>
        )}
      </motion.button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            completed
              ? 'text-muted-foreground line-through'
              : 'text-foreground'
          )}
        >
          {exercise.name}
        </p>
        {meta && (
          <p className="text-[11px] text-muted-foreground">{meta}</p>
        )}
        {!compact && (exercise.notes || exercise.form) && (
          <p className="text-[11px] text-muted-foreground/50 mt-0.5 pl-2 border-l border-border/30">
            {exercise.notes || exercise.form}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {exercise.isElbowSafe && (
          <Badge className="h-4 px-1.5 text-[9px] bg-accent-sage/15 text-accent-sage border-0">
            Safe
          </Badge>
        )}
        {exercise.youtubeVideoId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://youtube.com/watch?v=${exercise.youtubeVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/40 hover:text-accent-rose transition-colors"
                >
                  <Play className="size-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Watch demo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </motion.div>
  )
}

interface ExerciseSectionProps {
  title: string
  icon: React.ReactNode
  exercises: Exercise[]
  completedIds: Set<string>
  onToggleExercise: (id: string) => void
  focusColor: string
  defaultOpen?: boolean
  compact?: boolean
}

export function ExerciseSection({
  title,
  icon,
  exercises,
  completedIds,
  onToggleExercise,
  focusColor,
  defaultOpen = true,
  compact = false,
}: ExerciseSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const completedCount = exercises.filter(e => completedIds.has(e.id)).length
  const progress =
    exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0

  if (exercises.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer border-b border-border/20">
        <span className={focusColor}>{icon}</span>
        <span className="text-sm font-semibold text-foreground flex-1 text-left">
          {title}
        </span>
        <div className="w-14 h-1 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent-sage"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {completedCount}/{exercises.length}
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4">
          {exercises.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              completed={completedIds.has(ex.id)}
              onToggle={() => onToggleExercise(ex.id)}
              index={i}
              compact={compact}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
