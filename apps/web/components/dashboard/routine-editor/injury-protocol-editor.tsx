'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { InjuryProtocol, DailyRehab } from '@/lib/types/fitness.types'
import {
  Activity,
  AlertTriangle,
  Clock,
  Plus,
  X,
} from 'lucide-react'
import { useState } from 'react'

interface InjuryProtocolEditorProps {
  protocol?: InjuryProtocol
  onUpdate: (protocol: InjuryProtocol) => void
}

const DEFAULT_PROTOCOL: InjuryProtocol = {
  status: 'inactive',
  name: '',
  description: '',
  dailyRehab: [],
  rules: [],
}

export function InjuryProtocolEditor({ protocol, onUpdate }: InjuryProtocolEditorProps) {
  const p = protocol ?? DEFAULT_PROTOCOL
  const isActive = p.status === 'active'

  const [newRule, setNewRule] = useState('')
  const [newRehab, setNewRehab] = useState<Partial<DailyRehab>>({
    name: '',
    description: '',
    duration: 5,
    frequency: 'daily',
  })

  const update = (updates: Partial<InjuryProtocol>) => {
    onUpdate({ ...p, ...updates })
  }

  const addRule = () => {
    if (newRule.trim()) {
      update({ rules: [...p.rules, newRule.trim()] })
      setNewRule('')
    }
  }

  const removeRule = (index: number) => {
    update({ rules: p.rules.filter((_, i) => i !== index) })
  }

  const addRehab = () => {
    if (newRehab.name?.trim()) {
      update({ dailyRehab: [...p.dailyRehab, newRehab as DailyRehab] })
      setNewRehab({ name: '', description: '', duration: 5, frequency: 'daily' })
    }
  }

  const removeRehab = (index: number) => {
    update({ dailyRehab: p.dailyRehab.filter((_, i) => i !== index) })
  }

  return (
    <Card className={isActive ? 'border-amber-500/50' : ''}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${isActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
            Injury Protocol
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Active</Label>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => update({ status: checked ? 'active' : 'inactive' })}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {/* Injury Details -- side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Injury Name</Label>
            <Input
              value={p.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g., Golfer's Elbow"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Description</Label>
            <Input
              value={p.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Describe the injury..."
              className="h-8"
            />
          </div>
        </div>

        {/* Daily Rehab */}
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Daily Rehab Exercises
          </Label>

          {p.dailyRehab.length > 0 && (
            <div className="space-y-1.5">
              {p.dailyRehab.map((rehab, index) => (
                <div key={index} className="flex items-center gap-2 py-1.5 px-2.5 bg-muted/50 rounded-md">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{rehab.name}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        {rehab.duration} min
                      </Badge>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">{rehab.frequency}</Badge>
                    </div>
                    {rehab.description && (
                      <p className="text-[11px] text-muted-foreground truncate">{rehab.description}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeRehab(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5 p-2.5 border border-dashed rounded-lg">
            <p className="text-[11px] font-medium text-muted-foreground">Add Rehab Exercise</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Input
                value={newRehab.name}
                onChange={(e) => setNewRehab({ ...newRehab, name: e.target.value })}
                placeholder="Exercise name"
                className="h-7 text-xs"
              />
              <Input
                value={newRehab.description}
                onChange={(e) => setNewRehab({ ...newRehab, description: e.target.value })}
                placeholder="Description"
                className="h-7 text-xs"
              />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="relative">
                <Input
                  type="number"
                  value={newRehab.duration}
                  onChange={(e) => setNewRehab({ ...newRehab, duration: Number(e.target.value) })}
                  placeholder="Duration"
                  className="h-7 text-xs pr-8"
                />
                <span className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]">
                  min
                </span>
              </div>
              <Input
                value={newRehab.frequency}
                onChange={(e) => setNewRehab({ ...newRehab, frequency: e.target.value })}
                placeholder="Frequency"
                className="h-7 text-xs"
              />
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addRehab}>
                <Plus className="h-3 w-3 mr-1" />
                Add Exercise
              </Button>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Protocol Rules</Label>

          {p.rules.length > 0 && (
            <div className="space-y-1">
              {p.rules.map((rule, index) => (
                <div key={index} className="flex items-center gap-2 py-1 px-2.5 bg-muted/50 rounded-md">
                  <p className="flex-1 text-xs">{rule}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeRule(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1.5">
            <Input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="Add a protocol rule..."
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && addRule()}
            />
            <Button variant="outline" size="icon" className="shrink-0 h-7 w-7" onClick={addRule}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
