'use client'

import type { ReactNode } from 'react'

import { TermTip, type CoachTerm } from '@/components/coach/ui/term-tip'
import { toneClasses, type Tone } from '@/components/coach/ui/tone'
import { cn } from '@/lib/utils'

type MetricSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASS: Record<MetricSize, string> = {
  sm: 't-num-sm',
  md: 't-num-md',
  lg: 't-num-lg',
  xl: 't-num-xl',
}

/**
 * A number and what it means. petehome is a measurement instrument, so the
 * value outweighs its label — the previous UI rendered both at roughly the
 * same size, which flattened every readout into undifferentiated text.
 */
export function Metric({
  label,
  value,
  unit,
  size = 'md',
  tone = 'neutral',
  decimals = 0,
  signed = false,
  align = 'start',
  hint,
  tip,
  className,
}: {
  label: string
  value: number | string | null | undefined
  unit?: string
  size?: MetricSize
  tone?: Tone
  decimals?: number
  signed?: boolean
  align?: 'start' | 'center'
  hint?: string
  /** Glossary key — wraps the label in a dotted-underline TermTip. */
  tip?: CoachTerm
  className?: string
}) {
  const display =
    value == null
      ? '—'
      : typeof value === 'string'
        ? value
        : `${signed && value > 0 ? '+' : ''}${value.toFixed(decimals)}`

  const labelNode: ReactNode = tip ? (
    <TermTip term={tip} className="t-micro text-ink-3">
      {label}
    </TermTip>
  ) : (
    label
  )

  return (
    <div className={cn('min-w-0', align === 'center' && 'text-center', className)}>
      <p
        className={cn(
          't-num truncate',
          SIZE_CLASS[size],
          tone === 'neutral' ? 'text-ink-1' : toneClasses(tone).text
        )}
      >
        {display}
        {unit && value != null ? (
          <span className="ml-0.5 text-[0.6em] font-normal text-ink-3">{unit}</span>
        ) : null}
      </p>
      <div className="mt-1 t-micro text-ink-3">{labelNode}</div>
      {hint ? <p className="mt-0.5 t-label text-ink-3">{hint}</p> : null}
    </div>
  )
}

/**
 * Evenly divided metric strip. Hairline dividers give the row structure that
 * a bare grid was missing.
 */
export function MetricRow({
  children,
  stack = false,
  className,
}: {
  children: React.ReactNode
  stack?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid divide-line',
        stack
          ? 'grid-cols-2 gap-x-3 gap-y-4 sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none sm:gap-x-0 sm:gap-y-0 sm:divide-x sm:[&>*]:px-3 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0'
          : 'grid-flow-col auto-cols-fr divide-x [&>*]:px-3 [&>*:first-child]:pl-0 [&>*:last-child]:pr-0',
        className
      )}
    >
      {children}
    </div>
  )
}

/** Label / value / commentary row used by safety readouts. */
export function StatLine({
  label,
  value,
  tone = 'neutral',
  note,
  tip,
}: {
  label: string
  value: string
  tone?: Tone
  note?: string
  tip?: CoachTerm
}) {
  const t = toneClasses(tone)
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={cn('size-1.5 shrink-0 rounded-full', t.dot)} aria-hidden />
      <span className="t-label w-20 shrink-0 text-ink-2">
        {tip ? (
          <TermTip term={tip} className="t-label text-ink-2">
            {label}
          </TermTip>
        ) : (
          label
        )}
      </span>
      <span className={cn('t-num t-num-sm w-12 shrink-0', t.text)}>{value}</span>
      {note ? <span className="t-label min-w-0 flex-1 truncate text-ink-3">{note}</span> : null}
    </div>
  )
}
