'use client'

import type React from 'react'

import {
  Bus,
  Calendar,
  ChevronFirst,
  ChevronLast,
  Coffee,
  Dumbbell,
  Grid3x3,
  Home,
  Lightbulb,
  Music,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Item = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const items: Item[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/deck', label: 'Deck', icon: Grid3x3 },
  { href: '/lights', label: 'Lights', icon: Lightbulb },
  { href: '/music', label: 'Music', icon: Music },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/transit', label: 'Transit', icon: Bus },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell },
  { href: '/coffee', label: 'Coffee', icon: Coffee },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  useEffect(() => {
    // On mobile, always keep sidebar open (it's hidden by default via transform)
    // On desktop, respect saved preference
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      const saved = localStorage.getItem('sidebar-open')
      if (saved) setOpen(saved === '1')
    } else {
      setOpen(true) // Always open on mobile when visible
    }
  }, [])

  useEffect(() => {
    // Only save preference on desktop
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      localStorage.setItem('sidebar-open', open ? '1' : '0')
    }
  }, [open])

  // Close sidebar on mobile when navigating
  const handleLinkClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose?.()
    }
  }

  return (
    <aside
      className={`bg-sidebar border-sidebar-border text-sidebar-foreground flex h-full flex-col rounded-l-3xl border-r transition-[width] duration-300 ${
        open ? 'w-52 lg:w-52' : 'w-20 lg:w-20'
      }`}
      aria-label="Primary navigation"
    >
      <div
        className={`border-sidebar-border flex items-center justify-between gap-2 overflow-hidden border-b transition-all ${
          open ? 'px-4 py-0 lg:py-0' : 'px-3 py-4 lg:py-5'
        }`}
      >
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-lg p-1.5 transition-colors lg:hidden"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
        <Link
          href="/"
          onClick={handleLinkClick}
          className={`group relative flex items-center ${open ? 'min-w-0 flex-1 justify-start' : 'w-full justify-center'} ${onClose ? 'lg:flex-1' : ''}`}
          aria-label="Go to dashboard"
        >
          {/* Expanded Logo - Full "Petehome" */}
          <div
            className={`relative transition-all duration-300 ${
              open
                ? 'max-w-[200px] opacity-100'
                : 'pointer-events-none absolute max-w-0 opacity-0'
            }`}
          >
            <span className="relative inline-block pl-2 text-lg font-bold whitespace-nowrap">
              <span className="text-brand relative inline-block py-3">
                {/* Animated shimmer overlay */}
                <span className="absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-[.25]" />
                {/* Letter-by-letter animation */}
                <span className="relative inline-flex items-baseline">
                  <span
                    className="inline-block animate-[fadeInUp_0.5s_ease-out] transition-transform duration-200 hover:scale-110"
                    style={{ transformOrigin: 'bottom' }}
                  >
                    p
                  </span>
                  <span
                    className="inline-block animate-[fadeInUp_0.5s_ease-out_0.05s_both] transition-transform duration-200 hover:scale-110"
                    style={{ transformOrigin: 'bottom' }}
                  >
                    e
                  </span>
                  <span
                    className="inline-block animate-[fadeInUp_0.5s_ease-out_0.1s_both] transition-transform duration-200 hover:scale-110"
                    style={{ transformOrigin: 'bottom' }}
                  >
                    t
                  </span>
                  <span
                    className="inline-block animate-[fadeInUp_0.5s_ease-out_0.15s_both] transition-transform duration-200 hover:scale-110"
                    style={{ transformOrigin: 'bottom' }}
                  >
                    e
                  </span>
                  <span
                    className="inline-block animate-[fadeInUp_0.5s_ease-out_0.2s_both] transition-transform duration-200 hover:scale-110"
                    style={{ transformOrigin: 'bottom' }}
                  >
                    h
                  </span>
                  <span
                    className="inline-block animate-[fadeInUp_0.5s_ease-out_0.25s_both] transition-transform duration-200 hover:scale-110"
                    style={{ transformOrigin: 'bottom' }}
                  >
                    o
                  </span>
                  <span
                    className="inline-block animate-[fadeInUp_0.5s_ease-out_0.3s_both] transition-transform duration-200 hover:scale-110"
                    style={{ transformOrigin: 'bottom' }}
                  >
                    m
                  </span>
                  <span
                    className="inline-block animate-[fadeInUp_0.5s_ease-out_0.35s_both] transition-transform duration-200 hover:scale-110"
                    style={{ transformOrigin: 'bottom' }}
                  >
                    e
                  </span>
                </span>
              </span>
              {/* Glow effect on hover */}
              {/* <span className="bg-brand/20 absolute inset-0 -z-10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" /> */}
            </span>
          </div>

          {/* Collapsed Logo - Stylized "PH" */}
          <div
            className={`relative flex w-full items-center justify-center transition-all duration-300 ${
              open
                ? 'pointer-events-none absolute max-w-0 opacity-0'
                : 'opacity-100'
            }`}
          >
            <span className="relative inline-block text-xl font-bold whitespace-nowrap">
              <span className="text-brand relative inline-block">
                {/* Animated shimmer overlay */}
                {/* <span className="absolute inset-0 animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50" /> */}
                {/* Stylized PH with vertical stacking */}
                <span className="relative inline-flex flex-col items-center leading-none">
                  <span
                    className="inline-block animate-[fadeInUp_0.4s_ease-out] transition-transform duration-200 hover:scale-110"
                    style={{ transformOrigin: 'center' }}
                  >
                    P
                  </span>
                </span>
              </span>
              {/* Glow effect on hover */}
              {/* <span className="bg-brand/20 absolute inset-0 -z-10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" /> */}
            </span>
          </div>
        </Link>
        <button
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          onClick={() => setOpen(v => !v)}
          className={`text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hidden shrink-0 rounded-lg transition-colors lg:flex ${
            open ? 'p-1.5' : 'mx-auto p-1.5'
          }`}
        >
          {open ? (
            <ChevronFirst className="size-5" />
          ) : (
            <ChevronLast className="size-5" />
          )}
        </button>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto">
        <ul className={`flex flex-col gap-1 ${open ? 'px-3' : 'px-2'} pb-4`}>
          {items.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== '/' && pathname?.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={handleLinkClick}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center rounded-xl transition-all ${
                    open ? 'gap-3 px-3 py-3' : 'justify-center px-2 py-3'
                  } ${
                    active
                      ? 'bg-brand/15 text-brand shadow-brand/20 shadow-sm'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                >
                  {/* Active indicator - subtle background glow */}
                  {active && (
                    <span className="bg-brand/10 absolute inset-0 -z-10 rounded-xl" />
                  )}
                  <Icon
                    className={`size-5 shrink-0 transition-colors ${
                      active
                        ? 'text-brand'
                        : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground'
                    }`}
                  />
                  <span
                    className={`${open ? 'block' : 'hidden'} text-sm font-medium transition-colors ${
                      active ? 'text-brand font-semibold' : ''
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
