'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  Plus, 
  X, 
  Clock,
  Activity
} from 'lucide-react'
import type { InjuryProtocol, DailyRehab } from '@/lib/types/fitness.types'

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
  const [isEditing, setIsEditing] = useState(false)
  const [localProtocol, setLocalProtocol] = useState<InjuryProtocol>(protocol ?? DEFAULT_PROTOCOL)
  const [newRule, setNewRule] = useState('')
  const [newRehab, setNewRehab] = useState<Partial<DailyRehab>>({
    name: '',
    description: '',
    duration: 5,
    frequency: 'daily',
  })

  const handleSave = () => {
    onUpdate(localProtocol)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setLocalProtocol(protocol ?? DEFAULT_PROTOCOL)
    setIsEditing(false)
  }

  const addRule = () => {
    if (newRule.trim()) {
      setLocalProtocol({
        ...localProtocol,
        rules: [...localProtocol.rules, newRule.trim()],
      })
      setNewRule('')
    }
  }

  const removeRule = (index: number) => {
    setLocalProtocol({
      ...localProtocol,
      rules: localProtocol.rules.filter((_, i) => i !== index),
    })
  }

  const addRehab = () => {
    if (newRehab.name?.trim()) {
      setLocalProtocol({
        ...localProtocol,
        dailyRehab: [...localProtocol.dailyRehab, newRehab as DailyRehab],
      })
      setNewRehab({
        name: '',
        description: '',
        duration: 5,
        frequency: 'daily',
      })
    }
  }

  const removeRehab = (index: number) => {
    setLocalProtocol({
      ...localProtocol,
      dailyRehab: localProtocol.dailyRehab.filter((_, i) => i !== index),
    })
  }

  const isActive = localProtocol.status === 'active'

  if (!isEditing) {
    return (
      <Card 
        className={`cursor-pointer hover:bg-accent/50 transition-colors ${isActive ? 'border-amber-500/50' : ''}`}
        onClick={() => setIsEditing(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${isActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
              Injury Protocol
            </CardTitle>
            <div className="flex items-center gap-2">
              {isActive ? (
                <Badge variant="outline" className="text-amber-600 border-amber-500">Active</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
              )}
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isActive && localProtocol.name ? (
            <>
              <div>
                <p className="text-sm font-medium">{localProtocol.name}</p>
                <p className="text-xs text-muted-foreground">{localProtocol.description}</p>
              </div>
              {localProtocol.dailyRehab.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {localProtocol.dailyRehab.map((rehab, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {rehab.name} ({rehab.duration}m)
                    </Badge>
                  ))}
                </div>
              )}
              {localProtocol.rules.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {localProtocol.rules.length} active rule{localProtocol.rules.length > 1 ? 's' : ''}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active injury protocol. Click to add one if needed.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={isActive ? 'border-amber-500/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${isActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
            Edit Injury Protocol
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <Label className="font-medium">Protocol Active</Label>
            <p className="text-xs text-muted-foreground">
              Enable to use alternative exercises and show rehab reminders
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => setLocalProtocol({
              ...localProtocol,
              status: checked ? 'active' : 'inactive',
            })}
          />
        </div>

        {/* Injury Details */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Injury Name</Label>
            <Input
              value={localProtocol.name}
              onChange={(e) => setLocalProtocol({ ...localProtocol, name: e.target.value })}
              placeholder="e.g., Golfer's Elbow, Knee Strain"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={localProtocol.description}
              onChange={(e) => setLocalProtocol({ ...localProtocol, description: e.target.value })}
              placeholder="Describe the injury and current status..."
              rows={2}
            />
          </div>
        </div>

        {/* Daily Rehab */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Activity className="h-3 w-3" />
            Daily Rehab Exercises
          </Label>
          
          {localProtocol.dailyRehab.length > 0 && (
            <div className="space-y-2">
              {localProtocol.dailyRehab.map((rehab, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{rehab.name}</p>
                    <p className="text-xs text-muted-foreground">{rehab.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {rehab.duration} min
                      </Badge>
                      <Badge variant="outline" className="text-xs">{rehab.frequency}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRehab(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 p-3 border rounded-lg">
            <p className="text-xs font-medium text-muted-foreground">Add Rehab Exercise</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newRehab.name}
                onChange={(e) => setNewRehab({ ...newRehab, name: e.target.value })}
                placeholder="Exercise name"
                className="col-span-2"
              />
              <Input
                value={newRehab.description}
                onChange={(e) => setNewRehab({ ...newRehab, description: e.target.value })}
                placeholder="Description"
                className="col-span-2"
              />
              <Input
                type="number"
                value={newRehab.duration}
                onChange={(e) => setNewRehab({ ...newRehab, duration: Number(e.target.value) })}
                placeholder="Duration (min)"
              />
              <Input
                value={newRehab.frequency}
                onChange={(e) => setNewRehab({ ...newRehab, frequency: e.target.value })}
                placeholder="Frequency"
              />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={addRehab}>
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
          </div>
        </div>

        {/* Rules */}
        <div className="space-y-3">
          <Label>Protocol Rules</Label>
          
          {localProtocol.rules.length > 0 && (
            <div className="space-y-2">
              {localProtocol.rules.map((rule, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <p className="flex-1 text-sm">{rule}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRule(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="Add a protocol rule..."
              onKeyDown={(e) => e.key === 'Enter' && addRule()}
            />
            <Button variant="outline" size="icon" onClick={addRule}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
