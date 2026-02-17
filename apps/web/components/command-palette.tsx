'use client'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { transitions } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Bus,
  Calendar,
  ChefHat,
  Dog,
  Dumbbell,
  Grid3x3,
  Home,
  Lightbulb,
  Music,
  NotebookPen,
  Settings,
  Sparkles,
  Ticket,
  User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

// Define NavItem type
export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  keywords: string[]
  shortcut?: string
}

// Define NavCategory type
type NavCategory = {
  id: string
  label: string
  items: NavItem[]
}

// Navigation categories with items
export const navCategories: NavCategory[] = [
  {
    id: 'quick',
    label: 'Quick Access',
    items: [
      { href: '/', label: 'Dashboard', icon: Home, keywords: ['home', 'main'] },
      { href: '/settings', label: 'Settings', icon: Settings, keywords: ['preferences', 'config'] },
    ],
  },
  {
    id: 'wellness',
    label: 'Wellness',
    items: [
      { href: '/fitness', label: 'Fitness', icon: Dumbbell, shortcut: '2', keywords: ['workout', 'exercise', 'gym'] },
      { href: '/maple', label: 'Maple', icon: Dog, shortcut: '3', keywords: ['dog', 'pet', 'walk'] },
    ],
  },
  {
    id: 'plan',
    label: 'Plan',
    items: [
      { href: '/calendar', label: 'Calendar', icon: Calendar, shortcut: '4', keywords: ['schedule', 'events', 'appointments'] },
      { href: '/transit', label: 'CTA', icon: Bus, shortcut: '6', keywords: ['bus', 'train', 'chicago', 'transport'] },
      { href: '/concerts', label: 'Concerts', icon: Ticket, keywords: ['events', 'shows', 'music', 'tickets'] },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    items: [
      { href: '/lights', label: 'Lights', icon: Lightbulb, shortcut: '5', keywords: ['hue', 'philips', 'lamps'] },
      // Coffee sunset – hidden from nav
      // { href: '/coffee', label: 'Coffee', icon: Coffee, shortcut: '8', keywords: ['espresso', 'brew'] },
      { href: '/cooking', label: 'Cooking', icon: ChefHat, keywords: ['recipes', 'food', 'kitchen'] },
      { href: '/cooking/chef', label: 'AI Chef', icon: Sparkles, keywords: ['ai chef', 'meal plan ai', 'cooking assistant', 'suggest meals'] },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    items: [
      { href: '/music', label: 'Music', icon: Music, shortcut: '7', keywords: ['sonos', 'spotify', 'songs'] },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    items: [
      { href: '/me', label: 'Me', icon: User, shortcut: '1', keywords: ['profile', 'account'] },
      { href: '/me?tab=vault', label: 'Vault', icon: NotebookPen, keywords: ['vault', 'notes', 'notebook', 'writing'] },
      { href: '/deck', label: 'Deck', icon: Grid3x3, shortcut: '9', keywords: ['grid', 'overview'] },
    ],
  },
]

// Flatten all items for search
export const allNavItems = navCategories.flatMap((cat) => cat.items)

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false)
      router.push(href)
    },
    [onOpenChange, router]
  )

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Navigate"
      description="Search and navigate to any page"
      showCloseButton={false}
      className="max-w-lg"
    >
      <CommandInput
        placeholder="Where would you like to go?"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty className="py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={transitions.spring}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-muted-foreground text-sm">No results found</span>
            <span className="text-muted-foreground/60 text-xs">Try a different search term</span>
          </motion.div>
        </CommandEmpty>

        {navCategories.map((category, categoryIndex) => (
          <CommandGroup key={category.id} heading={category.label}>
            {category.items.map((item, itemIndex) => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.keywords?.join(' ') || ''}`}
                  onSelect={() => handleSelect(item.href)}
                  className="group cursor-pointer"
                >
                  <motion.div
                    className="flex w-full items-center gap-3"
                    initial={false}
                    whileHover={{ x: 2 }}
                    transition={transitions.spring}
                  >
                    <motion.div
                      className={cn(
                        'flex size-8 items-center justify-center rounded-lg transition-colors',
                        'bg-muted group-data-[selected=true]:bg-brand/10'
                      )}
                      whileHover={{ scale: 1.05 }}
                      transition={transitions.spring}
                    >
                      <Icon
                        className={cn(
                          'size-4 transition-colors',
                          'text-muted-foreground group-data-[selected=true]:text-brand'
                        )}
                      />
                    </motion.div>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.shortcut && (
                      <kbd className="bg-muted text-muted-foreground pointer-events-none hidden rounded px-1.5 py-0.5 font-mono text-xs sm:inline">
                        ⌘{item.shortcut}
                      </kbd>
                    )}
                  </motion.div>
                </CommandItem>
              )
            })}
            {categoryIndex < navCategories.length - 1 && <CommandSeparator className="my-1" />}
          </CommandGroup>
        ))}
      </CommandList>

      {/* Footer hint */}
      <div className="border-border/50 text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            select
          </span>
        </div>
        <span className="flex items-center gap-1">
          <kbd className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">esc</kbd>
          close
        </span>
      </div>
    </CommandDialog>
  )
}

// Hook to manage command palette state globally
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { open, setOpen }
}
