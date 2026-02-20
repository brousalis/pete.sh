'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { UserProfile } from '@/lib/types/fitness.types'
import {
  Clock,
  Footprints,
  Plus,
  Ruler,
  Scale,
  Target,
  User,
  X,
} from 'lucide-react'

interface ProfileEditorProps {
  profile?: UserProfile
  name?: string
  onUpdate: (profile: UserProfile, name?: string) => void
}

const DEFAULT_PROFILE: UserProfile = {
  goal: '',
  stats: { height: '', weight: 0 },
  schedule: { startDay: 'monday', trainingTime: '12:00 PM', fasted: false },
  shoeStrategy: { lifting: [], cardio: [] },
}

export function ProfileEditor({ profile, name = '', onUpdate }: ProfileEditorProps) {
  const p = profile ?? DEFAULT_PROFILE

  const updateProfile = (updates: Partial<UserProfile>) => {
    onUpdate({ ...p, ...updates }, undefined)
  }

  const addShoe = (type: 'lifting' | 'cardio', shoe: string) => {
    if (!shoe.trim()) return
    onUpdate({
      ...p,
      shoeStrategy: {
        ...p.shoeStrategy,
        [type]: [...p.shoeStrategy[type], shoe.trim()],
      },
    })
  }

  const removeShoe = (type: 'lifting' | 'cardio', index: number) => {
    onUpdate({
      ...p,
      shoeStrategy: {
        ...p.shoeStrategy,
        [type]: p.shoeStrategy[type].filter((_, i) => i !== index),
      },
    })
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {/* Routine Name + Goal */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Routine Name</Label>
            <Input
              value={name}
              onChange={(e) => onUpdate(p, e.target.value)}
              placeholder="My Training Routine"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Target className="h-3 w-3" />
              Goal
            </Label>
            <Input
              value={p.goal}
              onChange={(e) => updateProfile({ goal: e.target.value })}
              placeholder="Your fitness goal..."
              className="h-8"
            />
          </div>
        </div>

        {/* Stats + Schedule in one row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              Height
            </Label>
            <Input
              value={p.stats.height}
              onChange={(e) => updateProfile({
                stats: { ...p.stats, height: e.target.value },
              })}
              placeholder={'5\'10"'}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Scale className="h-3 w-3" />
              Weight
            </Label>
            <div className="relative">
              <Input
                type="number"
                value={p.stats.weight || ''}
                onChange={(e) => updateProfile({
                  stats: { ...p.stats, weight: Number(e.target.value) },
                })}
                placeholder="180"
                className="h-8 pr-8"
              />
              <span className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]">
                lbs
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Training
            </Label>
            <Input
              value={p.schedule.trainingTime}
              onChange={(e) => updateProfile({
                schedule: { ...p.schedule, trainingTime: e.target.value },
              })}
              placeholder="12:00 PM"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">&nbsp;</Label>
            <div className="flex items-center gap-2 h-8">
              <Switch
                checked={p.schedule.fasted}
                onCheckedChange={(checked) => updateProfile({
                  schedule: { ...p.schedule, fasted: checked },
                })}
              />
              <Label className="text-xs">Fasted</Label>
            </div>
          </div>
        </div>

        {/* Shoe Strategy -- side by side */}
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Footprints className="h-3 w-3" />
            Shoe Strategy
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <ShoeList
              label="Lifting"
              shoes={p.shoeStrategy.lifting}
              onAdd={(shoe) => addShoe('lifting', shoe)}
              onRemove={(i) => removeShoe('lifting', i)}
            />
            <ShoeList
              label="Cardio"
              shoes={p.shoeStrategy.cardio}
              onAdd={(shoe) => addShoe('cardio', shoe)}
              onRemove={(i) => removeShoe('cardio', i)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ShoeList({
  label,
  shoes,
  onAdd,
  onRemove,
}: {
  label: string
  shoes: string[]
  onAdd: (shoe: string) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      {shoes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {shoes.map((shoe, index) => (
            <Badge key={index} variant="secondary" className="gap-1 pr-1 text-xs h-6">
              {shoe}
              <button onClick={() => onRemove(index)} className="ml-0.5 hover:text-destructive rounded-full">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Input
          placeholder={`Add ${label.toLowerCase()} shoe`}
          className="flex-1 h-7 text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onAdd((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = ''
            }
          }}
        />
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 h-7 w-7"
          onClick={(e) => {
            const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
            if (input?.value) {
              onAdd(input.value)
              input.value = ''
            }
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
