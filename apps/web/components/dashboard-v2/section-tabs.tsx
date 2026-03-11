'use client'

import { cn } from '@/lib/utils'
import { CalendarDays, ChefHat, Dumbbell } from 'lucide-react'

export type DashboardSection = 'fitness' | 'cooking' | 'calendar'

const SECTIONS: {
  key: DashboardSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: 'fitness', label: 'Fitness', icon: Dumbbell },
  { key: 'cooking', label: 'Cooking', icon: ChefHat },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
]

export function SectionTabs({
  activeSection,
  onSectionChange,
}: {
  activeSection: DashboardSection
  onSectionChange: (section: DashboardSection) => void
}) {
  return (
    <div className="shrink-0 border-b border-border bg-card/60">
      <div className="flex">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSectionChange(key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              activeSection === key
                ? 'border-b-2 border-primary text-foreground bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
