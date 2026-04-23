'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Check, Moon, Sun } from 'lucide-react'

export function RoutineDetail({ type }: { type: 'morning' | 'night' }) {
  const {
    routine,
    dayOfWeek,
    weekNumber,
    completeRoutine,
    uncompleteRoutine,
  } = useDashboardV3()

  const daily =
    type === 'morning'
      ? routine?.dailyRoutines.morning
      : routine?.dailyRoutines.night

  const week = routine?.weeks.find(w => w.weekNumber === weekNumber)
  const dayData = week?.days[dayOfWeek]
  const done =
    type === 'morning'
      ? dayData?.morningRoutine?.completed || false
      : dayData?.nightRoutine?.completed || false

  if (!daily) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-border/40 ring-inset">
        No {type} routine configured.
      </div>
    )
  }

  const accent =
    type === 'morning'
      ? {
          icon: Sun,
          color: 'text-accent-gold',
          bg: 'bg-accent-gold/10',
          border: 'border-accent-gold/20',
          gradient: 'from-accent-gold/10 via-accent-gold/5 to-transparent',
        }
      : {
          icon: Moon,
          color: 'text-accent-violet',
          bg: 'bg-accent-violet/10',
          border: 'border-accent-violet/20',
          gradient:
            'from-accent-violet/10 via-accent-violet/5 to-transparent',
        }
  const Icon = accent.icon

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset">
      <div
        className={cn(
          'px-5 py-3.5 bg-gradient-to-r border-b border-border',
          accent.gradient
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'size-8 rounded-full flex items-center justify-center',
              accent.bg
            )}
          >
            <Icon className={cn('size-4', accent.color)} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold">{daily.name}</h3>
            <p className="text-xs text-muted-foreground">
              {daily.duration} min · {daily.exercises.length} movements
            </p>
          </div>
          {done && (
            <div className="ml-auto flex items-center gap-1 text-accent-sage text-xs font-medium">
              <Check className="size-3.5" />
              Completed
            </div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-2">
        {daily.exercises.map((ex, i) => (
          <motion.div
            key={`${ex.name}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            className={cn(
              'flex items-start gap-3 py-2.5 px-3 rounded-md border border-border/30',
              'bg-muted/20 hover:bg-muted/40 transition-colors'
            )}
          >
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/60 mt-0.5 w-4 shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{ex.name}</span>
                <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0">
                  {ex.duration}s
                </span>
              </div>
              {ex.why && (
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {ex.why}
                </p>
              )}
              {ex.action && (
                <p className="text-[11px] text-muted-foreground/50 mt-0.5 pl-2 border-l border-border/40">
                  {ex.action}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="border-t border-border px-5 py-2.5 flex items-center justify-between bg-muted/20">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Keyboard: {type === 'morning' ? 'M' : 'N'} to toggle
        </span>
        <Button
          size="sm"
          onClick={() =>
            done ? uncompleteRoutine(type) : completeRoutine(type)
          }
          className={cn(
            'h-7 text-xs rounded-md px-3.5',
            done
              ? 'bg-muted text-muted-foreground hover:bg-muted/70'
              : 'bg-accent-sage text-white hover:bg-accent-sage/90'
          )}
        >
          {done ? 'Undo' : 'Mark complete'}
        </Button>
      </div>
    </div>
  )
}
