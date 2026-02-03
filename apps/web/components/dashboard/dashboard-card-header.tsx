'use client'

import { Button } from '@/components/ui/button'
import { ChevronRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export interface DashboardCardHeaderProps {
  /** Icon element (e.g. <Cloud className="size-5 text-sky-500" />) */
  icon: React.ReactNode
  /** Container class for the icon wrapper, e.g. "bg-sky-500/10" */
  iconContainerClassName?: string
  /** Card title */
  title: string
  /** Optional badge after title (e.g. CTA pill, count) */
  badge?: React.ReactNode
  /** If set, shows "View" / viewLabel link */
  viewHref?: string
  viewLabel?: string
  /** Refresh button */
  onRefresh?: () => void
  refreshing?: boolean
  /** Extra actions before View/Refresh (e.g. Rideshare button) */
  rightExtra?: React.ReactNode
}

const defaultIconContainer = 'bg-muted'

/**
 * Shared header for dashboard cards: left icon + title + optional badge,
 * right View link + optional extra actions + refresh.
 */
export function DashboardCardHeader({
  icon,
  iconContainerClassName = defaultIconContainer,
  title,
  badge,
  viewHref,
  viewLabel = 'View',
  onRefresh,
  refreshing = false,
  rightExtra,
}: DashboardCardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconContainerClassName}`}
        >
          {icon}
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-foreground text-sm font-semibold">{title}</h3>
          {badge}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightExtra}
        {viewHref && (
          <Link href={viewHref}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
            >
              {viewLabel}
              <ChevronRight className="size-3.5 opacity-70" />
            </Button>
          </Link>
        )}
        {onRefresh != null && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-7 min-h-[44px] w-7 min-w-[44px] touch-manipulation p-0"
          >
            <RefreshCw
              className={`size-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </Button>
        )}
      </div>
    </div>
  )
}
