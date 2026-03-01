'use client'

import { cn } from '@/lib/utils'

interface PageHeaderProps {
  children: React.ReactNode
  secondaryRow?: React.ReactNode
  secondaryRowClassName?: string
  className?: string
}

export function PageHeader({ children, secondaryRow, secondaryRowClassName, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-3 shrink-0', className)}>
      <div className="bg-card/40 rounded-xl border border-border/50">
        {children}
        {secondaryRow && (
          <div className={cn('border-t border-border/30', secondaryRowClassName)}>
            {secondaryRow}
          </div>
        )}
      </div>
    </header>
  )
}

export function PageHeaderRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 px-3 py-2', className)}>
      {children}
    </div>
  )
}
