'use client'

import { cn } from '@/lib/utils'

export function PtCountdownRing({
  remainingMs,
  totalMs,
  label,
  size = 'lg',
}: {
  remainingMs: number
  totalMs: number
  label?: string
  size?: 'lg' | 'md'
}) {
  const total = Math.max(1, totalMs)
  const left = Math.max(0, remainingMs)
  const progress = Math.min(1, left / total)
  const seconds = Math.ceil(left / 1000)
  const radius = size === 'lg' ? 110 : 72
  const stroke = size === 'lg' ? 10 : 8
  const dim = (radius + stroke) * 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <div className="relative grid place-items-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/10"
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-[stroke-dashoffset] duration-200 ease-linear',
            seconds <= 3 ? 'text-accent-ember' : 'text-white'
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'font-semibold tabular-nums tracking-tight text-white',
            size === 'lg' ? 'text-7xl md:text-8xl' : 'text-5xl'
          )}
        >
          {seconds}
        </span>
        {label ? <span className="mt-1 text-sm uppercase tracking-[0.2em] text-white/55">{label}</span> : null}
      </div>
    </div>
  )
}
