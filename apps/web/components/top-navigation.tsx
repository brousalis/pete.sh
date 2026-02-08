'use client'

import {
  CommandPalette,
  useCommandPalette,
} from '@/components/command-palette'
import { useConnectivity } from '@/components/connectivity-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useIOSSync } from '@/hooks/use-ios-sync'
import { transitions } from '@/lib/animations'
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
  Ticket,
  Tv,
  User,
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

// All navigation items
const navItems: NavItem[] = [
  { href: '/fitness', label: 'Fitness', icon: Dumbbell, shortcut: '1' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: '2' },
  { href: '/transit', label: 'CTA', icon: Bus, shortcut: '3' },
  { href: '/concerts', label: 'Concerts', icon: Ticket, shortcut: '4' },
  { href: '/lights', label: 'Lights', icon: Lightbulb, shortcut: '5' },
  { href: '/music', label: 'Music', icon: Music, shortcut: '6' },
  { href: '/coffee', label: 'Coffee', icon: Coffee, shortcut: '7' },
  { href: '/cooking', label: 'Cooking', icon: ChefHat, shortcut: '8' },
  { href: '/maple', label: 'Maple', icon: Dog, shortcut: '9' },
  { href: '/me', label: 'Me', icon: User, shortcut: '0' },
]

// Mobile bottom nav items
const mobileBottomItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/transit', label: 'CTA', icon: Bus },
]

export function TopNavigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [displaySwitching, setDisplaySwitching] = useState<
    'hdmi' | 'displayport' | null
  >(null)
  const [currentInput, setCurrentInput] = useState<
    'hdmi' | 'displayport' | 'unknown' | null
  >(null)
  const headerRef = useRef<HTMLElement>(null)
  const { isLocalAvailable, isInitialized } = useConnectivity()
  const { isIOSApp, isSyncing, openSyncSheet } = useIOSSync()
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette()

  // Fetch current display input when local is available
  useEffect(() => {
    if (!isLocalAvailable) {
      setCurrentInput(null)
      return
    }

    const fetchCurrentInput = async () => {
      try {
        const response = await apiGet<{
          currentInput: 'hdmi' | 'displayport' | 'unknown'
        }>('/api/desktop/kvm')
        if (response.success && response.data) {
          setCurrentInput(response.data.currentInput ?? 'unknown')
        }
      } catch (error) {
        console.error('Failed to fetch display input:', error)
      }
    }

    fetchCurrentInput()
  }, [isLocalAvailable])

  // Display input switch handler
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

  // Prevent hydration mismatch
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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }

      // Number shortcuts
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        const navItem = navItems.find((item) => item.shortcut === event.key)
        if (navItem) {
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
    <>
      <header
        ref={headerRef}
        className="bg-card border-border/50 sticky top-0 z-50 border-b"
      >
        <div className="mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 md:gap-4 md:px-5 lg:px-6">
          {/* Logo */}
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
                  idle: { scale: 1, y: 0 },
                  hover: { scale: 1.03, y: -1 },
                  tap: { scale: 0.98 },
                  active: { scale: 1, y: 0 },
                }}
                transition={transitions.spring}
              >
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

                <motion.span className="relative flex items-baseline text-lg font-bold transition-all sm:text-xl">
                  <motion.span
                    variants={{
                      idle: {
                        color:
                          'color-mix(in oklab, var(--foreground) 70%, transparent)',
                      },
                      tap: { color: 'var(--foreground)' },
                      active: { color: 'var(--brand)' },
                    }}
                    transition={{ duration: 0.25 }}
                  >
                    pete
                  </motion.span>
                  <motion.span
                    variants={{
                      idle: {
                        color:
                          'color-mix(in oklab, var(--foreground) 70%, transparent)',
                      },
                      hover: { color: 'var(--foreground)' },
                      tap: { color: 'var(--foreground)' },
                      active: { color: 'var(--foreground)' },
                    }}
                    transition={{ duration: 0.25 }}
                  >
                    home
                  </motion.span>
                </motion.span>

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

            {/* Local Mode Indicator */}
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
                {isLocalAvailable ? <span>local</span> : <span>live</span>}
              </motion.div>
            )}
          </div>

          {/* Desktop Navigation - Icon dock with hover labels */}
          <nav
            className="hidden flex-1 items-center justify-center md:flex"
            aria-label="Primary navigation"
          >
            <div className="bg-muted/40 flex items-center rounded-xl">
              {navItems.map(({ href, label, icon: Icon, shortcut }) => {
                const active = isActive(href)
                return (
                  <NavItemWithLabel
                    key={href}
                    href={href}
                    label={label}
                    icon={Icon}
                    shortcut={shortcut}
                    active={active}
                  />
                )
              })}
            </div>
          </nav>

          {/* Right side actions */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {/* iOS Sync Button */}
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

            {/* Display Input Switch Buttons */}
            {mounted && isLocalAvailable && (
              <div className="hidden lg:flex">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleDisplaySwitch('hdmi')}
                      disabled={
                        displaySwitching !== null || currentInput === 'hdmi'
                      }
                      className={cn(
                        'focus:ring-ring/50 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none',
                        currentInput === 'hdmi'
                          ? 'bg-brand/10 text-brand'
                          : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground',
                        displaySwitching === 'hdmi' &&
                          'cursor-not-allowed opacity-50'
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
                      disabled={
                        displaySwitching !== null ||
                        currentInput === 'displayport'
                      }
                      className={cn(
                        'focus:ring-ring/50 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none',
                        currentInput === 'displayport'
                          ? 'bg-brand/10 text-brand'
                          : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground',
                        displaySwitching === 'displayport' &&
                          'cursor-not-allowed opacity-50'
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

            {/* Deck Mode */}
            {isIOSApp && (
              <Link
                href="/deck"
                className={cn(
                  'focus:ring-ring/50 hidden h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none md:flex',
                  isActive('/deck')
                    ? 'bg-brand/10 text-brand'
                    : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                )}
                title="Deck Mode (⌘9)"
                aria-label="Open Deck Mode"
              >
                <Grid3x3 className="size-5" aria-hidden />
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hover:bg-muted/80 focus:ring-ring/50 flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:ring-2 focus:outline-none md:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              <motion.div
                animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
                transition={transitions.spring}
              >
                {mobileMenuOpen ? (
                  <X className="text-muted-foreground size-5" />
                ) : (
                  <Menu className="text-muted-foreground size-5" />
                )}
              </motion.div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={transitions.smooth}
              className="border-border/50 overflow-hidden border-t md:hidden"
            >
              <nav className="bg-card p-3" aria-label="Mobile navigation">
                <motion.ul
                  className="grid grid-cols-5 gap-1"
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
                      <motion.li
                        key={href}
                        variants={{
                          hidden: { opacity: 0, y: 8 },
                          visible: { opacity: 1, y: 0 },
                        }}
                      >
                        <Link
                          href={href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex flex-col items-center justify-center gap-1 rounded-xl p-2 transition-colors',
                            'min-h-[56px] touch-manipulation active:scale-95',
                            active
                              ? 'bg-brand/10 text-brand'
                              : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground active:bg-muted'
                          )}
                        >
                          <motion.div
                            whileTap={{ scale: 0.9 }}
                            transition={transitions.spring}
                          >
                            <Icon
                              className={cn(
                                'size-5 shrink-0',
                                active && 'text-brand'
                              )}
                            />
                          </motion.div>
                          <span
                            className={cn(
                              'text-[10px] font-medium leading-tight',
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

      {/* Command Palette - accessible via ⌘K */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}

/**
 * Nav item with smooth animated inline label
 * Uses GPU-accelerated transforms for buttery smooth animations
 */
function NavItemWithLabel({
  href,
  label,
  icon: Icon,
  shortcut,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
  active: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const labelRef = useRef<HTMLSpanElement>(null)
  const [labelWidth, setLabelWidth] = useState(0)

  // Measure label width once on mount for smooth width animation
  useEffect(() => {
    if (labelRef.current) {
      setLabelWidth(labelRef.current.offsetWidth)
    }
  }, [label])

  // Smooth easing curves
  const smoothTransition = {
    duration: 0.35,
    ease: [0.25, 0.1, 0.25, 1],
  }

  const springTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 28,
    mass: 0.8,
  }

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center justify-center rounded-lg',
        'h-[40px] px-3',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${label}${shortcut ? ` (⌘${shortcut})` : ''}`}
    >
      {/* Background - only on hover */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        initial={false}
        animate={{
          backgroundColor: isHovered
            ? 'hsl(var(--card))'
            : 'hsla(var(--card) / 0)',
          boxShadow: isHovered
            ? '0 4px 20px -4px hsl(var(--brand) / 0.2), 0 0 0 1px hsl(var(--brand) / 0.08)'
            : '0 0 0 0 transparent',
        }}
        transition={smoothTransition}
      />

      {/* Content container */}
      <div className="relative z-10 flex items-center">
        {/* Icon container */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={false}
          animate={{
            scale: isHovered ? 1.1 : 1,
          }}
          transition={springTransition}
        >
          {/* Icon glow on hover */}
          <motion.div
            className="bg-brand/25 pointer-events-none absolute size-6 rounded-full blur-md"
            initial={false}
            animate={{
              opacity: isHovered ? 1 : 0,
              scale: isHovered ? 1.5 : 0.8,
            }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
          />

          <Icon
            className={cn(
              'relative size-[18px] shrink-0 transition-colors duration-200',
              active
                ? 'text-brand'
                : isHovered
                  ? 'text-foreground'
                  : 'text-muted-foreground'
            )}
          />
        </motion.div>

        {/* Hidden label for measurement */}
        <span
          ref={labelRef}
          className="pointer-events-none absolute whitespace-nowrap text-sm font-medium opacity-0"
          aria-hidden
        >
          {label}
        </span>

        {/* Animated label container */}
        <motion.div
          className="overflow-hidden"
          initial={false}
          animate={{
            width: isHovered ? labelWidth + 16 : 0,
            opacity: isHovered ? 1 : 0,
          }}
          transition={{
            width: smoothTransition,
            opacity: {
              duration: isHovered ? 0.2 : 0.1,
              delay: isHovered ? 0.05 : 0,
              ease: [0.4, 0, 0.2, 1],
            },
          }}
        >
          <motion.span
            className="text-foreground block whitespace-nowrap px-2 text-sm font-medium"
            initial={false}
            animate={{
              x: isHovered ? 0 : -8,
              filter: isHovered ? 'blur(0px)' : 'blur(3px)',
            }}
            transition={{
              x: smoothTransition,
              filter: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
            }}
          >
            {label}
          </motion.span>
        </motion.div>
      </div>
    </Link>
  )
}

/**
 * Mobile Bottom Navigation
 */
export function MobileBottomNavigation() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette()

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname?.startsWith(href))

  // Check if an overflow page is active
  const isOverflowActive = navItems.some(
    (item) =>
      isActive(item.href) && !mobileBottomItems.some((b) => b.href === item.href)
  )

  // Close overlay on route change
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  // Dismiss overlay on outside click
  useEffect(() => {
    if (!moreOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [moreOpen])

  return (
    <>
      <div ref={containerRef} className="relative shrink-0 md:hidden">
        {/* More Overlay */}
        <AnimatePresence>
          {moreOpen && (
            <>
              {/* Scrim */}
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
                <motion.div
                  className="grid grid-cols-5 gap-1"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.02, delayChildren: 0.05 },
                    },
                  }}
                >
                  {navItems.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href)
                    return (
                      <motion.div
                        key={href}
                        variants={{
                          hidden: { opacity: 0, scale: 0.9 },
                          visible: { opacity: 1, scale: 1 },
                        }}
                      >
                        <Link
                          href={href}
                          className={cn(
                            'flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors',
                            'touch-manipulation active:scale-95',
                            active
                              ? 'bg-brand/10 text-brand'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <motion.div
                            whileTap={{ scale: 0.9 }}
                            transition={transitions.spring}
                          >
                            <Icon
                              className={cn(
                                'size-5 shrink-0',
                                active && 'text-brand'
                              )}
                            />
                          </motion.div>
                          <span
                            className={cn(
                              'text-[10px] font-medium leading-tight',
                              active && 'font-semibold'
                            )}
                          >
                            {label}
                          </span>
                        </Link>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom Tab Bar */}
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
                        className={cn(
                          'size-[21px] shrink-0',
                          active && 'text-brand'
                        )}
                      />
                    </motion.span>
                    <span
                      className={cn(
                        'w-full truncate text-center text-[10px] font-medium leading-tight',
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
                    'w-full truncate text-center text-[10px] font-medium leading-tight',
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

      {/* Command Palette for mobile */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}
