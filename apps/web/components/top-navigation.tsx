'use client'

import { useConnectivity } from '@/components/connectivity-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useIOSSync } from '@/hooks/use-ios-sync'
import { staggerItemVariants, transitions } from '@/lib/animations'
import { apiGet, apiPost } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bus,
  Calendar,
  ChefHat,
  Coffee,
  Dog,
  Dumbbell,
  Grid3x3,
  Home,
  Lightbulb,
  Loader2,
  Menu,
  Monitor,
  MoreHorizontal,
  Music,
  RefreshCw,
  Settings,
  Tv,
  User,
  X
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
  { href: '/fitness', label: 'Fitness', icon: Dumbbell, shortcut: '2' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: '4' },
  { href: '/lights', label: 'Lights', icon: Lightbulb, shortcut: '5' },
  { href: '/transit', label: 'CTA', icon: Bus, shortcut: '6' },
  { href: '/music', label: 'Music', icon: Music, shortcut: '7' },
  { href: '/coffee', label: 'Coffee', icon: Coffee, shortcut: '8' },
  { href: '/cooking', label: 'Cooking', icon: ChefHat },
  { href: '/maple', label: 'Maple', icon: Dog, shortcut: '3' },
  { href: '/me', label: 'Me', icon: User, shortcut: '1' },
]

// All items including Deck for keyboard shortcuts
const allNavItems: NavItem[] = [
  { href: '/fitness', label: 'Fitness', icon: Dumbbell, shortcut: '2' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: '4' },
  { href: '/lights', label: 'Lights', icon: Lightbulb, shortcut: '5' },
  { href: '/transit', label: 'CTA', icon: Bus, shortcut: '6' },
  { href: '/music', label: 'Music', icon: Music, shortcut: '7' },
  { href: '/coffee', label: 'Coffee', icon: Coffee, shortcut: '8' },
  { href: '/cooking', label: 'Cooking', icon: ChefHat },
  { href: '/deck', label: 'Deck', icon: Grid3x3, shortcut: '9' },
  { href: '/maple', label: 'Maple', icon: Dog, shortcut: '3' },
  { href: '/me', label: 'Me', icon: User, shortcut: '1' },
]

// Mobile bottom nav - curated primary items for quick thumb access
const mobileBottomItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/transit', label: 'CTA', icon: Bus },
]

// Overflow items accessible via "More" in bottom nav
const mobileOverflowItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/lights', label: 'Lights', icon: Lightbulb },
  { href: '/music', label: 'Music', icon: Music },
  { href: '/coffee', label: 'Coffee', icon: Coffee },
  { href: '/cooking', label: 'Cooking', icon: ChefHat },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/maple', label: 'Maple', icon: Dog },
  { href: '/me', label: 'Me', icon: User },
]

export function TopNavigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [displaySwitching, setDisplaySwitching] = useState<'hdmi' | 'displayport' | null>(null)
  const [currentInput, setCurrentInput] = useState<'hdmi' | 'displayport' | 'unknown' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const { isLocalAvailable, isInitialized } = useConnectivity()
  const { isIOSApp, isSyncing, openSyncSheet } = useIOSSync()

  // Fetch current display input when local is available (uses apiBaseUrl so production + local hits local)
  useEffect(() => {
    if (!isLocalAvailable) {
      setCurrentInput(null)
      return
    }

    const fetchCurrentInput = async () => {
      try {
        const response = await apiGet<{ currentInput: 'hdmi' | 'displayport' | 'unknown' }>(
          '/api/desktop/kvm'
        )
        if (response.success && response.data) {
          setCurrentInput(response.data.currentInput ?? 'unknown')
        }
      } catch (error) {
        console.error('Failed to fetch display input:', error)
      }
    }

    fetchCurrentInput()
  }, [isLocalAvailable])

  // Display input switch handler (uses apiBaseUrl so production + local hits local)
  const handleDisplaySwitch = async (target: 'hdmi' | 'displayport') => {
    if (displaySwitching) return
    setDisplaySwitching(target)
    try {
      const response = await apiPost<{ success: boolean; target: string }>(
        '/api/desktop/kvm',
        { target }
      )
      if (response.success) {
        setCurrentInput(target)
      } else {
        console.error('Display switch failed:', response.error)
      }
    } catch (error) {
      console.error('Display switch error:', error)
    } finally {
      setDisplaySwitching(null)
    }
  }

  // Prevent hydration mismatch by only showing dynamic content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

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
        {/* Logo - acts as home button with animated states */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className="group relative flex items-center focus:outline-none"
            aria-label="Go to dashboard"
            aria-current={isActive('/') ? 'page' : undefined}
          >
            <motion.div
              className="relative flex items-center rounded-lg px-2.5 py-1.5"
              initial={false}
              animate={isActive('/') ? 'active' : 'idle'}
              whileHover="hover"
              whileTap="tap"
              variants={{
                idle: {
                  scale: 1,
                  y: 0,
                },
                hover: {
                  scale: 1.03,
                  y: -1,
                },
                tap: {
                  scale: 0.98,
                },
                active: {
                  scale: 1,
                  y: 0,
                },
              }}
              transition={transitions.spring}
              style={{
                // Glow effect on hover/active via CSS custom property
              }}
            >
              {/* Glow background layer */}
              <motion.div
                className="absolute inset-0 rounded-lg"
                variants={{
                  idle: {
                    opacity: 0,
                    boxShadow: '0 0 0px 0px hsl(var(--brand) / 0)',
                  },
                  hover: {
                    opacity: 1,
                    boxShadow: '0 0 20px 2px hsl(var(--brand) / 0.15)',
                  },
                  tap: {
                    opacity: 0.8,
                    boxShadow: '0 0 12px 1px hsl(var(--brand) / 0.2)',
                  },
                  active: {
                    opacity: 1,
                    boxShadow: '0 0 24px 4px hsl(var(--brand) / 0.2)',
                  },
                }}
                transition={{ duration: 0.25 }}
              />

              {/* Background fill for active state */}
              <motion.div
                className="bg-brand/10 absolute inset-0 rounded-lg"
                variants={{
                  idle: { opacity: 0 },
                  hover: { opacity: 0.5 },
                  tap: { opacity: 0.7 },
                  active: { opacity: 1 },
                }}
                transition={{ duration: 0.2 }}
              />

              {/* Logo text with split styling */}
              <motion.span className="relative flex items-baseline text-lg font-bold sm:text-xl transition-all">
                <motion.span
                  variants={{
                    idle: {
                      color: 'color-mix(in oklab, var(--foreground) 70%, transparent)',
                    },
                    tap: {
                      color: 'var(--foreground)',
                    },
                    active: {
                      color: 'var(--brand)',
                    },
                  }}
                  transition={{ duration: 0.25 }}
                >
                  pete
                </motion.span>
                <motion.span
                  variants={{
                    idle: {
                      color: 'color-mix(in oklab, var(--foreground) 70%, transparent)',
                    },
                    hover: {
                      color: 'var(--foreground)',
                    },
                    tap: {
                      color: 'var(--foreground)',
                    },
                    active: {
                      color: 'var(--foreground)',
                    },
                  }}
                  transition={{ duration: 0.25 }}
                >
                  home
                </motion.span>
              </motion.span>


              {/* Subtle pulse animation for active state */}
              {isActive('/') && (
                <motion.div
                  className="bg-brand/20 pointer-events-none absolute inset-0 rounded-lg"
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{
                    opacity: [0.3, 0, 0.3],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </motion.div>
          </Link>

          {/* Local Mode Indicator - shows when in production but connected to local */}
          {mounted && isInitialized && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
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
                  <span>local</span>
                </>
              ) : (
                <>
                  <span>live</span>
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
          <div className="bg-muted/40 flex items-center gap-0.5 rounded-xl p-1 xl:gap-1">
            {navItems.map(({ href, label, icon: Icon, shortcut }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  title={`${label} (⌘${shortcut})`}
                  className={cn(
                    'group relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors xl:gap-2 xl:px-3',
                    'min-h-[40px] min-w-[40px] justify-center xl:min-w-0 xl:justify-start', // Touch-friendly minimum
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
                  {/* Labels visible at 1280px+ */}
                  <span className="relative hidden xl:inline">{label}</span>
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

          {/* Display Input Switch Buttons - only visible when connected locally */}
          {mounted && isLocalAvailable && (
            <div className="hidden lg:flex">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleDisplaySwitch('hdmi')}
                    disabled={displaySwitching !== null || currentInput === 'hdmi'}
                    className={cn(
                      'focus:ring-ring/50 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none',
                      currentInput === 'hdmi'
                        ? 'bg-brand/10 text-brand'
                        : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground',
                      displaySwitching === 'hdmi' && 'cursor-not-allowed opacity-50'
                    )}
                    aria-label="Switch display to HDMI"
                  >
                    {displaySwitching === 'hdmi' ? (
                      <Loader2 className="size-5 animate-spin" aria-hidden />
                    ) : (
                      <Tv className="size-5" aria-hidden />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {currentInput === 'hdmi' ? 'HDMI (active)' : 'Switch to HDMI'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleDisplaySwitch('displayport')}
                    disabled={displaySwitching !== null || currentInput === 'displayport'}
                    className={cn(
                      'focus:ring-ring/50 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none',
                      currentInput === 'displayport'
                        ? 'bg-brand/10 text-brand'
                        : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground',
                      displaySwitching === 'displayport' && 'cursor-not-allowed opacity-50'
                    )}
                    aria-label="Switch display to DisplayPort"
                  >
                    {displaySwitching === 'displayport' ? (
                      <Loader2 className="size-5 animate-spin" aria-hidden />
                    ) : (
                      <Monitor className="size-5" aria-hidden />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {currentInput === 'displayport'
                    ? 'DisplayPort (active)'
                    : 'Switch to DisplayPort'}
                </TooltipContent>
              </Tooltip>
            </div>
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
          {isIOSApp && (<Link
            href="/deck"
            className={cn(
              'focus:ring-ring/50 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none hidden md:flex',
              isActive('/deck')
                ? 'bg-brand/10 text-brand'
                : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            )}
            title="Deck Mode (⌘8)"
            aria-label="Open Deck Mode"
          >
            <Grid3x3 className="size-5" aria-hidden />
          </Link>)}

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
 * Provides a native app-like persistent bottom tab bar on small screens.
 * Sits inside the dashboard card layout (not fixed-position).
 *
 * Design:
 * - 4 primary items + "More" overflow (5 total — ideal for thumb reach)
 * - 44px+ touch targets (Apple HIG compliant)
 * - Animated indicator bar slides between active items
 * - "More" reveals a compact overlay grid for remaining pages
 */
export function MobileBottomNavigation() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname?.startsWith(href))

  // Highlight "More" when current page is an overflow item
  const isOverflowActive = mobileOverflowItems.some((item) => isActive(item.href))

  // Close More overlay on route change
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  // Dismiss overlay on outside click
  useEffect(() => {
    if (!moreOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [moreOpen])

  return (
    <div ref={containerRef} className="relative shrink-0 md:hidden">
      {/* ── More Overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Scrim behind overlay to darken content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 bottom-full z-10 h-screen bg-black/20"
              onClick={() => setMoreOpen(false)}
              aria-hidden
            />

            {/* Overlay panel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={transitions.snappy}
              className="border-border/40 bg-card absolute inset-x-0 bottom-full z-20 rounded-t-2xl border-t p-3 shadow-lg"
            >
              <div className="grid grid-cols-3 gap-1.5">
                {mobileOverflowItems.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 transition-colors',
                        'touch-manipulation active:scale-95',
                        active
                          ? 'bg-brand/10 text-brand'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className={cn('size-5 shrink-0', active && 'text-brand')} />
                      <span
                        className={cn(
                          'text-[11px] leading-tight font-medium',
                          active && 'font-semibold'
                        )}
                      >
                        {label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bottom Tab Bar ────────────────────────────────────────── */}
      <nav
        className="border-border/30 bg-muted border-t"
        aria-label="Mobile navigation"
      >
        <ul className="flex h-14 items-stretch justify-around px-1">
          {/* Primary nav items */}
          {mobileBottomItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <li key={href} className="flex min-w-0 flex-1">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex w-full flex-col items-center justify-center gap-0.5 transition-colors',
                    'touch-manipulation active:opacity-70',
                    active ? 'text-brand' : 'text-muted-foreground'
                  )}
                >
                  {/* Sliding indicator bar */}
                  {active && (
                    <motion.span
                      layoutId="mobile-bottom-indicator"
                      className="bg-brand absolute top-0 left-1/2 h-[2px] w-7 -translate-x-1/2 rounded-full"
                      transition={transitions.springGentle}
                    />
                  )}
                  <motion.span
                    animate={{ scale: active ? 1.1 : 1 }}
                    transition={transitions.spring}
                  >
                    <Icon
                      className={cn('size-[21px] shrink-0', active && 'text-brand')}
                    />
                  </motion.span>
                  <span
                    className={cn(
                      'w-full truncate text-center text-[10px] leading-tight font-medium',
                      active ? 'text-brand font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            )
          })}

          {/* More button */}
          <li className="flex min-w-0 flex-1">
            <button
              onClick={() => setMoreOpen((prev) => !prev)}
              className={cn(
                'relative flex w-full flex-col items-center justify-center gap-0.5 transition-colors',
                'touch-manipulation active:opacity-70',
                moreOpen || isOverflowActive
                  ? 'text-brand'
                  : 'text-muted-foreground'
              )}
              aria-label={moreOpen ? 'Close menu' : 'More navigation options'}
              aria-expanded={moreOpen}
            >
              {/* Indicator when overflow page is active */}
              {isOverflowActive && !moreOpen && (
                <motion.span
                  layoutId="mobile-bottom-indicator"
                  className="bg-brand absolute top-0 left-1/2 h-[2px] w-7 -translate-x-1/2 rounded-full"
                  transition={transitions.springGentle}
                />
              )}
              <motion.span
                animate={{
                  scale: moreOpen || isOverflowActive ? 1.1 : 1,
                  rotate: moreOpen ? 90 : 0,
                }}
                transition={transitions.spring}
              >
                {moreOpen ? (
                  <X className="size-[21px] shrink-0" />
                ) : (
                  <MoreHorizontal
                    className={cn(
                      'size-[21px] shrink-0',
                      isOverflowActive && 'text-brand'
                    )}
                  />
                )}
              </motion.span>
              <span
                className={cn(
                  'w-full truncate text-center text-[10px] leading-tight font-medium',
                  moreOpen || isOverflowActive
                    ? 'text-brand font-semibold'
                    : 'text-muted-foreground'
                )}
              >
                More
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
