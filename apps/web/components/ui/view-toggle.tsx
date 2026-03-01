'use client'

import { cn } from '@/lib/utils'

interface ViewToggleOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface ViewToggleProps<T extends string> {
  options: ViewToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  hideLabelsOnMobile?: boolean
  className?: string
}

export function ViewToggle<T extends string>({
  options,
  value,
  onChange,
  hideLabelsOnMobile = false,
  className,
}: ViewToggleProps<T>) {
  return (
    <div className={cn('flex rounded-md border border-border/50 bg-muted/30 p-0.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          disabled={option.value === value}
          className={cn(
            'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
            option.value === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {/* {option.icon} */}
          <span className={cn(hideLabelsOnMobile && 'hidden sm:inline')}>
            {option.label}
          </span>
        </button>
      ))}
    </div>
  )
}
