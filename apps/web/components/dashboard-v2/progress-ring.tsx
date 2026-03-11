'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface Segment {
  label: string
  completed: boolean
  color: string
}

interface ProgressRingProps {
  segments: Segment[]
  size?: number
  strokeWidth?: number
  className?: string
}

export function ProgressRing({
  segments,
  size = 64,
  strokeWidth = 4,
  className,
}: ProgressRingProps) {
  const center = size / 2
  const radius = center - strokeWidth - 1
  const circumference = 2 * Math.PI * radius
  const gap = 5
  const segmentArc = (circumference - gap * segments.length) / segments.length

  const completedCount = segments.filter(s => s.completed).length
  const allDone = completedCount === segments.length && segments.length > 0

  return (
    <div
      className={cn(
        'rounded-xl px-4 py-3 border border-border bg-card shadow-sm ring-1 ring-border/40 ring-inset',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            className={cn(
              'transition-all duration-500',
              allDone && 'drop-shadow-[0_0_10px_rgba(77,186,138,0.2)]'
            )}
            style={{ transform: 'rotate(-90deg)' }}
          >
            {segments.map((seg, i) => {
              const offset = i * (segmentArc + gap)
              return (
                <circle
                  key={`bg-${seg.label}`}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  className="stroke-border"
                  strokeDasharray={`${segmentArc} ${circumference - segmentArc}`}
                  strokeDashoffset={-offset}
                />
              )
            })}
            {segments.map((seg, i) => {
              const offset = i * (segmentArc + gap)
              return (
                <motion.circle
                  key={seg.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  className={seg.completed ? seg.color : 'stroke-transparent'}
                  strokeDasharray={`${segmentArc} ${circumference - segmentArc}`}
                  strokeDashoffset={-offset}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: seg.completed ? 1 : 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 25,
                    delay: i * 0.12,
                  }}
                />
              )
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {allDone ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Check className="size-5 text-accent-sage" />
              </motion.div>
            ) : (
              <span className="text-base font-bold tabular-nums text-foreground" title={`${completedCount} of ${segments.length} completed`}>
                {completedCount}/{segments.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground mb-1.5">
            {allDone ? 'All done today' : 'Today\'s progress'}
          </p>
          <div className="space-y-1">
            {segments.map(seg => (
              <div key={seg.label} className="flex items-center gap-2">
                <div
                  className={cn(
                    'size-[6px] rounded-full',
                    seg.completed
                      ? seg.color.replace('stroke-', 'bg-')
                      : 'bg-muted'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px]',
                    seg.completed
                      ? 'text-muted-foreground line-through'
                      : 'text-muted-foreground'
                  )}
                >
                  {seg.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
