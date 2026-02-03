'use client'

import { cn } from '@/lib/utils'
import {
  Bus,
  Calendar,
  Coffee,
  Dumbbell,
  Home,
  Lightbulb,
  Music,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// Mobile nav items - excluding Deck for single-row layout
const mobileNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/lights', label: 'Lights', icon: Lightbulb },
  { href: '/music', label: 'Music', icon: Music },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/transit', label: 'Transit', icon: Bus },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell },
  { href: '/coffee', label: 'Coffee', icon: Coffee },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-card/95 border-border/50 fixed right-0 bottom-0 left-0 z-50 border-t shadow-lg backdrop-blur-md lg:hidden">
      <div className="safe-area-inset-bottom flex h-16 items-center justify-between overflow-x-hidden px-1">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== '/' && pathname?.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex min-w-0 flex-1 flex-shrink-0 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-t-lg pt-1 pb-1 transition-all',
                active
                  ? 'text-brand bg-brand/10'
                  : 'text-muted-foreground active:text-foreground active:bg-muted/30'
              )}
            >
              {active && (
                <span className="bg-brand absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" />
              )}
              <Icon className={cn('size-4 shrink-0', active && 'text-brand')} />
              <span
                className={cn(
                  'w-full truncate px-0.5 text-center text-[9px] leading-tight font-medium',
                  active && 'font-semibold'
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
