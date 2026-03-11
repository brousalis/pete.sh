'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateNavigatorProps {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onLabelClick?: () => void
  isAtToday?: boolean
  disableNext?: boolean
  disablePrev?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const sizeConfig = {
  sm: {
    button: 'h-7 w-7',
    icon: 'size-3.5',
    label: 'text-xs',
    today: 'h-6 px-2 text-[10px]',
    gap: 'gap-0.5',
    minLabel: 'min-w-[100px]',
  },
  md: {
    button: 'h-8 w-8',
    icon: 'size-4',
    label: 'text-sm',
    today: 'h-8 px-3 text-xs',
    gap: 'gap-1',
    minLabel: 'min-w-[120px]',
  },
} as const

export function DateNavigator({
  label,
  onPrev,
  onNext,
  onToday,
  onLabelClick,
  isAtToday = true,
  disableNext,
  disablePrev,
  size = 'md',
  className,
}: DateNavigatorProps) {
  const cfg = sizeConfig[size]
  const handleLabelClick = onLabelClick ?? (isAtToday ? undefined : onToday)

  return (
    <div className={cn('flex items-center', cfg.gap, className)}>
      <div className="flex items-center border border-border/50">
        <Button
          variant="ghost"
          size="icon"
          className={cn(cfg.button, 'rounded-r-none')}
          onClick={onPrev}
          disabled={disablePrev}
        >
          <ChevronLeft className={cfg.icon} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(cfg.button, 'rounded-l-none')}
          onClick={onNext}
          disabled={disableNext}
        >
          <ChevronRight className={cfg.icon} />
        </Button>
      </div>

      <button
        onClick={handleLabelClick}
        className={cn(
          'font-semibold tabular-nums transition-colors text-center',
          cfg.label,
          cfg.minLabel,
          onLabelClick
            ? 'text-foreground hover:text-foreground/80 cursor-pointer'
            : isAtToday
              ? 'text-foreground cursor-default'
              : 'text-accent-gold hover:text-accent-gold/80 cursor-pointer'
        )}
      >
        {label}
      </button>

      {!isAtToday && (
        <Button
          variant="outline"
          size="sm"
          className={cfg.today}
          onClick={onToday}
        >
          Today
        </Button>
      )}
    </div>
  )
}
