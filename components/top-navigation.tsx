'use client'

import type React from 'react'
import {
  Bus,
  Calendar,
  Coffee,
  Dumbbell,
  Grid3x3,
  Home,
  Lightbulb,
  Music,
  Bell,
  Settings,
  Menu,
  X,
  Command,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { ColorThemePicker } from '@/components/color-theme'
import { cn } from '@/lib/utils'
import { transitions, staggerItemVariants } from '@/lib/animations'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
}

// Main navigation items (excludes Deck which has its own icon)
const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home, shortcut: '1' },
  { href: '/lights', label: 'Lights', icon: Lightbulb, shortcut: '2' },
  { href: '/music', label: 'Music', icon: Music, shortcut: '3' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: '4' },
  { href: '/transit', label: 'Transit', icon: Bus, shortcut: '5' },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell, shortcut: '6' },
  { href: '/coffee', label: 'Coffee', icon: Coffee, shortcut: '7' },
]

// All items including Deck for keyboard shortcuts
const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home, shortcut: '1' },
  { href: '/lights', label: 'Lights', icon: Lightbulb, shortcut: '2' },
  { href: '/music', label: 'Music', icon: Music, shortcut: '3' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: '4' },
  { href: '/transit', label: 'Transit', icon: Bus, shortcut: '5' },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell, shortcut: '6' },
  { href: '/coffee', label: 'Coffee', icon: Coffee, shortcut: '7' },
  { href: '/deck', label: 'Deck', icon: Grid3x3, shortcut: '8' },
]

export function TopNavigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileMenuOpen])

  // Handle escape key and keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
      
      // Keyboard navigation shortcuts (Cmd/Ctrl + number)
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        const num = parseInt(event.key)
        if (num >= 1 && num <= allNavItems.length) {
          event.preventDefault()
          window.location.href = allNavItems[num - 1].href
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname?.startsWith(href))

  return (
    <header ref={headerRef} className="bg-card border-border/50 sticky top-0 z-50 border-b">
      <div className="mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 md:gap-4 md:px-5 lg:px-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="group relative flex shrink-0 items-center"
          aria-label="Go to dashboard"
        >
          <span className="text-brand text-lg font-bold sm:text-xl">
            petehome
          </span>
          {/* Keyboard shortcut indicator */}
          <span className="ml-2 hidden items-center gap-0.5 rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground xl:flex">
            <Command className="size-2.5" />K
          </span>
        </Link>

        {/* Desktop Navigation - visible on tablet (768px+) */}
        <nav className="hidden flex-1 items-center justify-center md:flex" aria-label="Primary navigation">
          <div className="flex items-center gap-0.5 rounded-xl bg-muted/40 p-1 lg:gap-1">
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
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                      active ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground'
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
          {/* Notifications */}
          <DropdownMenu>
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
          </DropdownMenu>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring/50">
              <Settings className="size-5 text-muted-foreground" aria-hidden />
              <span className="sr-only">Open settings</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <button className="w-full text-left">Manage users</button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <button className="w-full text-left">Network</button>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <ThemeToggle />
              </div>
              <div className="px-2 pb-2">
                <ColorThemePicker />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Deck Mode - quick access to dashboard grid view */}
          <Link
            href="/deck"
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50',
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
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring/50 md:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="size-5 text-muted-foreground" />
            ) : (
              <Menu className="size-5 text-muted-foreground" />
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
            className="overflow-hidden border-t border-border/50 md:hidden"
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
                    <motion.li
                      key={href}
                      variants={staggerItemVariants}
                    >
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
                          className={cn('size-5 shrink-0', active && 'text-brand')}
                        />
                        <span
                          className={cn(
                            'text-[11px] font-medium leading-tight',
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
      className="bg-card/98 border-border/50 fixed bottom-0 left-0 right-0 z-50 border-t shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden"
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
                  active
                    ? 'text-brand'
                    : 'text-muted-foreground'
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
      </ul>
    </nav>
  )
}
