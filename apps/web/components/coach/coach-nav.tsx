'use client'

import {
  Activity,
  CalendarDays,
  HeartPulse,
  type LucideIcon,
  MessageSquare,
  Settings,
  Sun,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const ITEMS: NavItem[] = [
  { href: '/coach', label: 'Today', icon: Sun },
  { href: '/coach/plan', label: 'Plan', icon: CalendarDays },
  { href: '/coach/chat', label: 'Chat', icon: MessageSquare },
  { href: '/coach/analytics', label: 'Analytics', icon: Activity },
  { href: '/coach/injury', label: 'Body', icon: HeartPulse },
  { href: '/coach/gear', label: 'Gear', icon: Wrench },
  { href: '/coach/settings', label: 'Settings', icon: Settings },
]

/**
 * Mobile shows the five surfaces used before and after a session. Gear and
 * Settings are desktop-only in the bar; they are reachable by URL and are not
 * things you check at the trailhead.
 */
const MOBILE_ITEMS = ITEMS.filter((item) => !['/coach/gear', '/coach/settings'].includes(item.href))

export function CoachNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/coach' ? pathname === '/coach' : pathname.startsWith(href)

  return (
    <>
      {/* Desktop */}
      <header className="sticky top-0 z-30 hidden border-b border-border bg-background/95 backdrop-blur md:block">
        <nav className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2">
          <span className="mr-4 text-sm font-semibold">petehome</span>
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Mobile: bottom bar, since this is used one-handed before a session */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="flex items-stretch justify-around">
          {MOBILE_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
                  isActive(item.href) ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
