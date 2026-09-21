'use client'

import { ChevronDown } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'

import { toneClasses, type Tone } from '@/components/coach/ui/tone'
import { cn } from '@/lib/utils'

/**
 * The one container in the coach UI. Elevation carries the grouping, so panels
 * are filled rather than outlined — a hairline border on near-black reads as
 * neither a surface nor a clean list.
 */
export function Panel({
  tone = 'default',
  inset = true,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  tone?: 'default' | 'raised' | Tone
  inset?: boolean
}) {
  const statusTone =
    tone === 'default' || tone === 'raised' ? null : toneClasses(tone as Tone)

  return (
    <div
      className={cn(
        'rounded-panel',
        tone === 'raised' ? 'bg-surface-2' : 'bg-surface-1',
        statusTone && [statusTone.bg, 'border', statusTone.border],
        inset && 'px-4 py-3.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** Eyebrow row for a panel: quiet label on the left, optional action right. */
export function PanelHeader({
  label,
  action,
  className,
}: {
  label: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <p className="t-micro text-ink-3">{label}</p>
      {action}
    </div>
  )
}

/** Page-level section: heading plus consistent vertical rhythm underneath. */
export function Section({
  title,
  action,
  className,
  children,
}: {
  title?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('space-y-2.5', className)}>
      {title ? (
        <div className="flex items-baseline justify-between gap-3 px-0.5">
          <h2 className="t-micro text-ink-3">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/**
 * Progressive disclosure with a real affordance. The old pattern was bare grey
 * text, which gave no signal that anything was clickable.
 */
export function Disclosure({
  label,
  openLabel,
  defaultOpen = false,
  className,
  children,
}: {
  label: string
  openLabel?: string
  defaultOpen?: boolean
  className?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="group flex items-center gap-1 rounded-chip py-1 text-ink-3 transition-colors hover:text-ink-1"
      >
        <span className="t-label font-medium">{open ? (openLabel ?? label) : label}</span>
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="animate-fade-in-up pt-2">{children}</div> : null}
    </div>
  )
}

/** Small status pill. Used for verdicts, gates, and readiness flags. */
export function Chip({
  tone = 'neutral',
  icon,
  className,
  children,
}: {
  tone?: Tone
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const t = toneClasses(tone)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip px-2 py-1 t-label font-medium',
        t.bg,
        t.text,
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/** Thin quantitative bar, shared by spend, fuelling, gear life, and year progress. */
export function Track({
  pct,
  tone = 'neutral',
  className,
}: {
  pct: number
  tone?: Tone
  className?: string
}) {
  const t = toneClasses(tone)
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-surface-3', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', t.dot)}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-center t-label text-ink-3">{children}</p>
}
