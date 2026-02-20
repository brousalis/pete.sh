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
  strength: 'bg-red-500/15 text-red-400 border-red-500/30',
  core: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  cardio: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  hiit: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  recovery: 'bg-green-500/15 text-green-400 border-green-500/30',
  conditioning: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  hybrid: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  endurance: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  rest: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  circuit: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
}

function getFocusColor(focus: string): string {
  const lowerFocus = focus.toLowerCase()
  for (const [key, value] of Object.entries(FOCUS_COLORS)) {
    if (lowerFocus.includes(key)) return value
  }
  return 'bg-slate-500/15 text-slate-400 border-slate-500/30'
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
