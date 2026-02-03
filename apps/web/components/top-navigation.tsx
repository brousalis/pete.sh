'use client'

import { useConnectivity } from '@/components/connectivity-provider'
import { useIOSSync } from '@/hooks/use-ios-sync'
import { staggerItemVariants, transitions } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Bus,
    Calendar,
    ChefHat,
    Coffee,
    Command,
    Dumbbell,
    FileText,
    Grid3x3,
    Home,
    Lightbulb,
    Loader2,
    Menu,
    Music,
    RefreshCw,
    Settings,
    Wifi,
    WifiOff,
    X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
}

// Main navigation items (excludes Deck which has its own icon)
const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, shortcut: '1' },
  { href: '/lights', label: 'Lights', icon: Lightbulb, shortcut: '2' },
  { href: '/music', label: 'Music', icon: Music, shortcut: '3' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: '4' },
  { href: '/transit', label: 'Transit', icon: Bus, shortcut: '5' },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell, shortcut: '6' },
  { href: '/coffee', label: 'Coffee', icon: Coffee, shortcut: '7' },
  { href: '/cooking', label: 'Cooking', icon: ChefHat, shortcut: '8' },
  { href: '/posts', label: 'Blog', icon: FileText, shortcut: '9' },
]

// All items including Deck for keyboard shortcuts
const allNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, shortcut: '1' },
  { href: '/lights', label: 'Lights', icon: Lightbulb, shortcut: '2' },
  { href: '/music', label: 'Music', icon: Music, shortcut: '3' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: '4' },
  { href: '/transit', label: 'Transit', icon: Bus, shortcut: '5' },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell, shortcut: '6' },
  { href: '/coffee', label: 'Coffee', icon: Coffee, shortcut: '7' },
  { href: '/cooking', label: 'Cooking', icon: ChefHat, shortcut: '8' },
  { href: '/posts', label: 'Blog', icon: FileText, shortcut: '9' },
  { href: '/deck', label: 'Deck', icon: Grid3x3, shortcut: '0' },
]

export function TopNavigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const { isLocalAvailable, isInitialized } = useConnectivity()
  const { isIOSApp, isSyncing, openSyncSheet } = useIOSSync()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileMenuOpen])

  // Handle escape key and keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }

      // Keyboard navigation shortcuts (Cmd/Ctrl + number)
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        const num = parseInt(event.key)
        const navItem = allNavItems[num - 1]
        if (num >= 1 && num <= allNavItems.length && navItem) {
          event.preventDefault()
          window.location.href = navItem.href
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname?.startsWith(href))

  return (
    <header
      ref={headerRef}
      className="bg-card border-border/50 sticky top-0 z-50 border-b"
    >
      <div className="mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 md:gap-4 md:px-5 lg:px-6">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className="group relative flex items-center"
            aria-label="Go to dashboard"
          >
            <span className="text-brand text-lg font-bold sm:text-xl">
              petehome
            </span>
            {/* Keyboard shortcut indicator */}
            <span className="border-border/60 bg-muted/50 text-muted-foreground ml-2 hidden items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] xl:flex">
              <Command className="size-2.5" />K
            </span>
          </Link>

          {/* Local Mode Indicator - shows when in production but connected to local */}
          {isInitialized && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:flex',
                isLocalAvailable
                  ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              )}
              title={
                isLocalAvailable
                  ? 'Connected to local services'
                  : 'Read-only mode (cached data)'
              }
            >
              {isLocalAvailable ? (
                <>
                  <Wifi className="size-3" />
                  <span>Local</span>
                </>
              ) : (
                <>
                  <WifiOff className="size-3" />
                  <span>Live</span>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Desktop Navigation - visible on tablet (768px+) */}
        <nav
          className="hidden flex-1 items-center justify-center md:flex"
          aria-label="Primary navigation"
        >
          <div className="bg-muted/40 flex items-center gap-0.5 rounded-xl p-1 lg:gap-1">
            {navItems.map(({ href, label, icon: Icon, shortcut }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  title={`${label} (⌘${shortcut})`}
                  className={cn(
                    'group relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors lg:gap-2 lg:px-3',
                    'min-h-[40px] min-w-[40px] justify-center lg:min-w-0 lg:justify-start', // Touch-friendly minimum
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    active
                      ? 'text-brand'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {/* Animated background */}
                  {active && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="bg-card absolute inset-0 rounded-lg shadow-sm"
                      transition={transitions.springGentle}
                    />
                  )}
                  <Icon
                    className={cn(
                      'relative size-4 shrink-0 transition-colors',
                      active
                        ? 'text-brand'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  {/* Labels visible at 1024px+ (iPad Mini landscape and up) */}
                  <span className="relative hidden lg:inline">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Right side actions */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {/* <DropdownMenu>
            <DropdownMenuTrigger className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring/50">
              <Bell className="size-5 text-muted-foreground" aria-hidden />
              <span className="sr-only">Open notifications</span>
              <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white shadow-sm">
                3
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Washer cycle completed</DropdownMenuItem>
              <DropdownMenuItem>Front door locked</DropdownMenuItem>
              <DropdownMenuItem>HVAC filter reminder</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground">
                View all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}

          {/* iOS Sync Button - only visible in iOS app */}
          {isIOSApp && (
            <button
              onClick={openSyncSheet}
              disabled={isSyncing}
              className={cn(
                'focus:ring-ring/50 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none',
                'hover:bg-muted/80 text-muted-foreground hover:text-foreground',
                isSyncing && 'cursor-not-allowed opacity-50'
              )}
              title="Sync with HealthKit"
              aria-label="Sync with HealthKit"
            >
              {isSyncing ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-5" aria-hidden />
              )}
            </button>
          )}

          {/* Settings Link */}
          <Link
            href="/settings"
            className={cn(
              'focus:ring-ring/50 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none',
              isActive('/settings')
                ? 'bg-brand/10 text-brand'
                : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            )}
            title="Settings"
            aria-label="Open Settings"
          >
            <Settings className="size-5" aria-hidden />
          </Link>

          {/* Deck Mode - quick access to dashboard grid view */}
          <Link
            href="/deck"
            className={cn(
              'focus:ring-ring/50 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none',
              isActive('/deck')
                ? 'bg-brand/10 text-brand'
                : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            )}
            title="Deck Mode (⌘8)"
            aria-label="Open Deck Mode"
          >
            <Grid3x3 className="size-5" aria-hidden />
          </Link>

          {/* Mobile menu button - visible below tablet (768px) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="hover:bg-muted/80 focus:ring-ring/50 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none md:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="text-muted-foreground size-5" />
            ) : (
              <Menu className="text-muted-foreground size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu - animated */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transitions.smooth}
            className="border-border/50 overflow-hidden border-t md:hidden"
          >
            <nav className="bg-card" aria-label="Mobile navigation">
              <motion.ul
                className="grid grid-cols-4 gap-1.5 p-3"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.03, delayChildren: 0.05 },
                  },
                }}
              >
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href)
                  return (
                    <motion.li key={href} variants={staggerItemVariants}>
                      <Link
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-colors',
                          'min-h-[64px] touch-manipulation active:scale-95', // Touch-friendly 64px height
                          active
                            ? 'bg-brand/10 text-brand'
                            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground active:bg-muted'
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-5 shrink-0',
                            active && 'text-brand'
                          )}
                        />
                        <span
                          className={cn(
                            'text-[11px] leading-tight font-medium',
                            active && 'font-semibold'
                          )}
                        >
                          {label}
                        </span>
                      </Link>
                    </motion.li>
                  )
                })}
              </motion.ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

/**
 * Mobile Bottom Navigation - Optimized for iPhone 13 (390x844) and similar devices
 * Provides a native app-like persistent footer navigation on small screens
 *
 * Design considerations:
 * - 44px minimum touch targets (Apple HIG)
 * - Safe area padding for notched devices
 * - Visual feedback on touch
 * - Clear active state indication
 */
export function MobileBottomNavigation() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname?.startsWith(href))

  // Primary mobile nav items - 7 items for iPhone width
  // Deck is accessed via the icon in the top bar
  return (
    <nav
      className="bg-card/98 border-border/50 fixed right-0 bottom-0 left-0 z-50 border-t shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex h-[60px] items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <li key={href} className="flex min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex w-full flex-col items-center justify-center gap-0.5 transition-colors',
                  'touch-manipulation active:opacity-70', // Native feel on press
                  active ? 'text-brand' : 'text-muted-foreground'
                )}
              >
                {/* Animated active indicator bar */}
                {active && (
                  <motion.span
                    layoutId="mobile-nav-indicator"
                    className="bg-brand absolute top-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full"
                    transition={transitions.springGentle}
                  />
                )}
                {/* Icon with animated scale */}
                <motion.span
                  animate={{ scale: active ? 1.05 : 1 }}
                  transition={transitions.spring}
                >
                  <Icon
                    className={cn(
                      'size-[22px] shrink-0',
                      active && 'text-brand'
                    )}
                  />
                </motion.span>
                {/* Label */}
                <span
                  className={cn(
                    'w-full truncate text-center text-[10px] leading-tight font-medium',
                    active
                      ? 'text-brand font-semibold'
                      : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
