'use client'

import { useDashboardV3 } from '@/components/dashboard-v3/dashboard-v3-provider'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { addDays, format, isSameDay } from 'date-fns'
import {
  Calendar,
  CalendarCheck,
  Dumbbell,
  Moon,
  Sun,
  UtensilsCrossed,
} from 'lucide-react'
import { useMemo } from 'react'

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const {
    selectedDate,
    navigateToDay,
    goToToday,
    recipes,
    setActiveItem,
  } = useDashboardV3()

  const upcomingDays = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 14 }, (_, i) => addDays(today, i - 3))
  }, [])

  const close = () => onOpenChange(false)

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Jump to..."
      description="Navigate quickly between days, workouts, and recipes"
    >
      <CommandInput placeholder="Jump to day, recipe, or section..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          <CommandItem
            onSelect={() => {
              goToToday()
              close()
            }}
          >
            <CalendarCheck className="size-4" />
            <span>Go to today</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setActiveItem('workout')
              close()
            }}
          >
            <Dumbbell className="size-4" />
            <span>Focus main workout</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setActiveItem('morning')
              close()
            }}
          >
            <Sun className="size-4" />
            <span>Focus morning routine</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setActiveItem('night')
              close()
            }}
          >
            <Moon className="size-4" />
            <span>Focus night routine</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Jump to day">
          {upcomingDays.map(date => {
            const isToday = isSameDay(date, new Date())
            const isSelected = isSameDay(date, selectedDate)
            return (
              <CommandItem
                key={date.toISOString()}
                onSelect={() => {
                  const dir = date > selectedDate ? 'forward' : 'backward'
                  navigateToDay(date, dir)
                  close()
                }}
              >
                <Calendar className="size-4" />
                <span>{format(date, 'EEEE, MMM d')}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {isToday ? 'Today' : isSelected ? 'Selected' : ''}
                </span>
              </CommandItem>
            )
          })}
        </CommandGroup>

        {recipes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recipes">
              {recipes.slice(0, 20).map(recipe => (
                <CommandItem
                  key={recipe.id}
                  value={recipe.name}
                  onSelect={() => {
                    setActiveItem('dinner')
                    close()
                  }}
                >
                  <UtensilsCrossed className="size-4" />
                  <span>{recipe.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
