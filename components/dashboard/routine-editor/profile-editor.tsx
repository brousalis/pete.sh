'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Target, 
  Scale, 
  Ruler, 
  Clock, 
  Footprints,
  X,
  Plus
} from 'lucide-react'
import type { UserProfile } from '@/lib/types/fitness.types'

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
  const [isEditing, setIsEditing] = useState(false)
  const [localProfile, setLocalProfile] = useState<UserProfile>(profile ?? DEFAULT_PROFILE)
  const [localName, setLocalName] = useState(name)
  const [newLiftingShoe, setNewLiftingShoe] = useState('')
  const [newCardioShoe, setNewCardioShoe] = useState('')

  // Update local state when props change (only when not editing)
  useEffect(() => {
    if (!isEditing && profile) {
      setLocalProfile(profile)
    }
  }, [profile, isEditing])

  useEffect(() => {
    if (!isEditing && name) {
      setLocalName(name)
    }
  }, [name, isEditing])

  const handleSave = () => {
    onUpdate(localProfile, localName)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setLocalProfile(profile ?? DEFAULT_PROFILE)
    setLocalName(name)
    setIsEditing(false)
  }

  const addLiftingShoe = () => {
    if (newLiftingShoe.trim()) {
      setLocalProfile({
        ...localProfile,
        shoeStrategy: {
          ...localProfile.shoeStrategy,
          lifting: [...localProfile.shoeStrategy.lifting, newLiftingShoe.trim()],
        },
      })
      setNewLiftingShoe('')
    }
  }

  const removeLiftingShoe = (index: number) => {
    setLocalProfile({
      ...localProfile,
      shoeStrategy: {
        ...localProfile.shoeStrategy,
        lifting: localProfile.shoeStrategy.lifting.filter((_, i) => i !== index),
      },
    })
  }

  const addCardioShoe = () => {
    if (newCardioShoe.trim()) {
      setLocalProfile({
        ...localProfile,
        shoeStrategy: {
          ...localProfile.shoeStrategy,
          cardio: [...localProfile.shoeStrategy.cardio, newCardioShoe.trim()],
        },
      })
      setNewCardioShoe('')
    }
  }

  const removeCardioShoe = (index: number) => {
    setLocalProfile({
      ...localProfile,
      shoeStrategy: {
        ...localProfile.shoeStrategy,
        cardio: localProfile.shoeStrategy.cardio.filter((_, i) => i !== index),
      },
    })
  }

  if (!isEditing) {
    return (
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsEditing(true)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
            <Button variant="ghost" size="sm">Edit</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">{localName}</p>
            <p className="text-xs text-muted-foreground">{localProfile.goal}</p>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3 text-muted-foreground" />
              {localProfile.stats.height}
            </span>
            <span className="flex items-center gap-1">
              <Scale className="h-3 w-3 text-muted-foreground" />
              {localProfile.stats.weight} lbs
            </span>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {localProfile.schedule.trainingTime}
            </span>
            {localProfile.schedule.fasted && (
              <Badge variant="secondary" className="text-xs">Fasted</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Edit Profile
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Routine Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Routine Name</Label>
          <Input
            id="name"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="My Training Routine"
          />
        </div>

        {/* Goal */}
        <div className="space-y-2">
          <Label htmlFor="goal" className="flex items-center gap-2">
            <Target className="h-3 w-3" />
            Goal
          </Label>
          <Textarea
            id="goal"
            value={localProfile.goal}
            onChange={(e) => setLocalProfile({ ...localProfile, goal: e.target.value })}
            placeholder="Your fitness goal..."
            rows={2}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="height" className="flex items-center gap-2">
              <Ruler className="h-3 w-3" />
              Height
            </Label>
            <Input
              id="height"
              value={localProfile.stats.height}
              onChange={(e) => setLocalProfile({
                ...localProfile,
                stats: { ...localProfile.stats, height: e.target.value },
              })}
              placeholder={'5\'10"'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="flex items-center gap-2">
              <Scale className="h-3 w-3" />
              Weight (lbs)
            </Label>
            <Input
              id="weight"
              type="number"
              value={localProfile.stats.weight}
              onChange={(e) => setLocalProfile({
                ...localProfile,
                stats: { ...localProfile.stats, weight: Number(e.target.value) },
              })}
              placeholder="180"
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Schedule
          </Label>
          <div className="flex items-center gap-4">
            <Input
              value={localProfile.schedule.trainingTime}
              onChange={(e) => setLocalProfile({
                ...localProfile,
                schedule: { ...localProfile.schedule, trainingTime: e.target.value },
              })}
              placeholder="12:00 PM"
              className="w-32"
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={localProfile.schedule.fasted}
                onCheckedChange={(checked) => setLocalProfile({
                  ...localProfile,
                  schedule: { ...localProfile.schedule, fasted: checked },
                })}
              />
              <Label className="text-sm">Fasted Training</Label>
            </div>
          </div>
        </div>

        {/* Shoe Strategy */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Footprints className="h-3 w-3" />
            Shoe Strategy
          </Label>
          
          {/* Lifting Shoes */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Lifting</p>
            <div className="flex flex-wrap gap-2">
              {localProfile.shoeStrategy.lifting.map((shoe, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {shoe}
                  <button onClick={() => removeLiftingShoe(index)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newLiftingShoe}
                onChange={(e) => setNewLiftingShoe(e.target.value)}
                placeholder="Add lifting shoe"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addLiftingShoe()}
              />
              <Button variant="outline" size="icon" onClick={addLiftingShoe}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Cardio Shoes */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Cardio</p>
            <div className="flex flex-wrap gap-2">
              {localProfile.shoeStrategy.cardio.map((shoe, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {shoe}
                  <button onClick={() => removeCardioShoe(index)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCardioShoe}
                onChange={(e) => setNewCardioShoe(e.target.value)}
                placeholder="Add cardio shoe"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addCardioShoe()}
              />
              <Button variant="outline" size="icon" onClick={addCardioShoe}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
