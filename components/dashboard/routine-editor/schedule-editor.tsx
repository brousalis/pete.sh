'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  Pencil,
  Check,
  X
} from 'lucide-react'
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
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const FOCUS_COLORS: Record<string, string> = {
  strength: 'bg-red-500/10 text-red-600 border-red-200',
  core: 'bg-orange-500/10 text-orange-600 border-orange-200',
  cardio: 'bg-blue-500/10 text-blue-600 border-blue-200',
  hiit: 'bg-purple-500/10 text-purple-600 border-purple-200',
  recovery: 'bg-green-500/10 text-green-600 border-green-200',
  conditioning: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  hybrid: 'bg-amber-500/10 text-amber-600 border-amber-200',
  endurance: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  rest: 'bg-slate-500/10 text-slate-600 border-slate-200',
  circuit: 'bg-pink-500/10 text-pink-600 border-pink-200',
}

function getFocusColor(focus: string): string {
  const lowerFocus = focus.toLowerCase()
  for (const [key, value] of Object.entries(FOCUS_COLORS)) {
    if (lowerFocus.includes(key)) return value
  }
  return 'bg-slate-500/10 text-slate-600 border-slate-200'
}

interface DayEditorProps {
  day: DayOfWeek
  data: { focus: string; goal: string }
  onSave: (focus: string, goal: string) => void
  onCancel: () => void
}

function DayEditor({ day, data, onSave, onCancel }: DayEditorProps) {
  const [focus, setFocus] = useState(data.focus)
  const [goal, setGoal] = useState(data.goal)

  return (
    <Card className="border-2 border-primary">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium capitalize">{day}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSave(focus, goal)}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Focus</Label>
            <Input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g., Strength, Core, Rest"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Goal</Label>
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Build strength, Recovery"
              className="h-8 text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ScheduleEditor({ schedule, onUpdate }: ScheduleEditorProps) {
  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null)
  const currentSchedule = schedule ?? DEFAULT_SCHEDULE

  const handleSave = (day: DayOfWeek, focus: string, goal: string) => {
    onUpdate({
      ...currentSchedule,
      [day]: { ...currentSchedule[day], focus, goal },
    })
    setEditingDay(null)
  }

  if (!schedule) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading schedule...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Weekly Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day) => {
            const dayData = currentSchedule[day]
            const isEditing = editingDay === day

            if (isEditing) {
              return (
                <DayEditor
                  key={day}
                  day={day}
                  data={dayData}
                  onSave={(focus, goal) => handleSave(day, focus, goal)}
                  onCancel={() => setEditingDay(null)}
                />
              )
            }

            return (
              <Card 
                key={day} 
                className="cursor-pointer hover:bg-accent/50 transition-colors group"
                onClick={() => setEditingDay(day)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{DAY_LABELS[day]}</span>
                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-medium ${getFocusColor(dayData.focus)}`}
                  >
                    {dayData.focus}
                  </Badge>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                    {dayData.goal}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
