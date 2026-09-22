import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-line bg-surface-2 text-ink-1 placeholder:text-ink-3 selection:bg-primary selection:text-primary-foreground',
        'flex h-11 w-full min-w-0 rounded-control border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none',
        'file:text-foreground file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        'touch-manipulation sm:text-sm',
        className
      )}
      {...props}
    />
  )
}

export { Input }
