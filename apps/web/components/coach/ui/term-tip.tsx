'use client'

import type { ReactNode } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** Short glossary for coach metrics — aimed at someone new to training load. */
export const COACH_TERMS = {
  tss: 'Training Stress Score — how hard a session was for you. Roughly 100 for an hour at threshold effort.',
  ctl: 'Chronic Training Load (Fitness) — fitness built from the last ~6 weeks of training. Higher means a bigger engine.',
  atl: 'Acute Training Load (Fatigue) — recent fatigue from the last ~7 days. Spikes after hard blocks.',
  tsb: 'Training Stress Balance (Form) — Fitness minus Fatigue. Positive = fresh; negative = still carrying fatigue.',
  acwr: 'Acute:Chronic Workload Ratio (Ramp) — how fast recent load is rising vs your usual baseline. Safe band is about 0.8–1.3.',
  monotony: 'How similar your training days are. High monotony means too little easy/hard contrast — make easy days easier.',
  pmc: 'Performance Management Chart — Fitness, Fatigue, and Form over time. The story of how load is landing.',
} as const

export type CoachTerm = keyof typeof COACH_TERMS

/**
 * Inline label with a dotted underline that reveals a plain-language definition.
 * Use for acronyms and metrics a new athlete would not know cold.
 */
export function TermTip({
  term,
  children,
  className,
  side = 'top',
}: {
  term: CoachTerm | string
  children: ReactNode
  className?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  const text = term in COACH_TERMS ? COACH_TERMS[term as CoachTerm] : term

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'cursor-help underline decoration-dotted decoration-ink-3/60 underline-offset-2 transition-colors hover:text-ink-1 hover:decoration-ink-2',
            className
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={6}
        className="max-w-[16rem] text-left leading-snug"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
