'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WeeklySchedule, DayOfWeek } from '@/lib/types/fitness.types'

interface ScheduleEditorProps {
  schedule?: WeeklySchedule
  onUpdate: (schedule: WeeklySchedule) => void
}

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { focus: 'Strength', goal: '' },
  tuesday: { focus: 'Core', goal: '' },
  wednesday: { focus: 'Cardio', goal: '' },
  thursday: { focus: 'Endurance', goal: '' },
  friday: { focus: 'Circuit', goal: '' },
  saturday: { focus: 'HIIT', goal: '' },
  sunday: { focus: 'Rest', goal: '' },
}

const DAY_FULL: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const FOCUS_OPTIONS = [
  'Strength',
  'Core',
  'Cardio',
  'HIIT',
  'Recovery',
  'Conditioning',
  'Hybrid',
  'Endurance',
  'Circuit',
  'Rest',
]

const FOCUS_COLORS: Record<string, string> = {
  strength: 'bg-accent-ember/15 text-accent-ember border-accent-ember/30',
  core: 'bg-accent-azure/15 text-accent-azure border-accent-azure/30',
  cardio: 'bg-accent-azure/15 text-accent-azure border-accent-azure/30',
  hiit: 'bg-accent-gold/15 text-accent-gold border-accent-gold/30',
  recovery: 'bg-accent-teal/15 text-accent-teal border-accent-teal/30',
  conditioning: 'bg-accent-teal/15 text-accent-teal border-accent-teal/30',
  hybrid: 'bg-accent-violet/15 text-accent-violet border-accent-violet/30',
  endurance: 'bg-accent-rose/15 text-accent-rose border-accent-rose/30',
  rest: 'bg-accent-slate/15 text-accent-slate border-accent-slate/30',
  circuit: 'bg-accent-sage/15 text-accent-sage border-accent-sage/30',
}

function getFocusColor(focus: string): string {
  const lowerFocus = focus.toLowerCase()
  for (const [key, value] of Object.entries(FOCUS_COLORS)) {
    if (lowerFocus.includes(key)) return value
  }
  return 'bg-accent-slate/15 text-accent-slate border-accent-slate/30'
}

export function ScheduleEditor({ schedule, onUpdate }: ScheduleEditorProps) {
  const currentSchedule = schedule ?? DEFAULT_SCHEDULE

  const handleDayUpdate = (day: DayOfWeek, field: 'focus' | 'goal', value: string) => {
    onUpdate({
      ...currentSchedule,
      [day]: { ...currentSchedule[day], [field]: value },
    })
  }

  if (!schedule) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading schedule...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {DAYS.map((day) => {
        const dayData = currentSchedule[day]
        const focusColor = getFocusColor(dayData.focus)

        return (
          <Card key={day} className="overflow-hidden">
            <CardContent className="flex items-center gap-4 py-3 px-4">
              <div className="w-24 shrink-0">
                <span className="text-sm font-semibold">{DAY_FULL[day]}</span>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 border px-2 py-0.5 text-xs font-medium ${focusColor}`}
              >
                {dayData.focus || '—'}
              </Badge>
              <Select
                value={dayData.focus}
                onValueChange={(value) => handleDayUpdate(day, 'focus', value)}
              >
                <SelectTrigger className="w-40 shrink-0">
                  <SelectValue placeholder="Focus" />
                </SelectTrigger>
                <SelectContent>
                  {FOCUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={dayData.goal}
                onChange={(e) => handleDayUpdate(day, 'goal', e.target.value)}
                placeholder="Training goal for this day..."
                className="flex-1"
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
