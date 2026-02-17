'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiPost } from '@/lib/api/client'
import type { Concert, ConcertCreateRequest } from '@/lib/types/concerts.types'
import { cn } from '@/lib/utils'
import { Loader2, Plus, X } from 'lucide-react'
import { useState } from 'react'

interface ConcertAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (concert: Concert) => void
}

export function ConcertAddDialog({
  open,
  onOpenChange,
  onCreated,
}: ConcertAddDialogProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ConcertCreateRequest>({
    artist_name: '',
    venue_name: '',
    event_date: '',
    supporting_artists: [],
    tags: [],
    companions: [],
    status: 'upcoming',
  })
  const [tagInput, setTagInput] = useState('')
  const [companionInput, setCompanionInput] = useState('')
  const [supportingInput, setSupportingInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.artist_name || !form.venue_name || !form.event_date) return

    setLoading(true)
    try {
      const response = await apiPost<Concert>('/api/concerts', form)
      if (response.success && response.data) {
        onCreated(response.data)
        onOpenChange(false)
        resetForm()
      }
    } catch (err) {
      console.error('Failed to create concert:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      artist_name: '',
      venue_name: '',
      event_date: '',
      supporting_artists: [],
      tags: [],
      companions: [],
      status: 'upcoming',
    })
    setTagInput('')
    setCompanionInput('')
    setSupportingInput('')
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !form.tags?.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...(f.tags || []), tag] }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags?.filter((t) => t !== tag) }))
  }

  const addCompanion = () => {
    const name = companionInput.trim()
    if (name && !form.companions?.includes(name)) {
      setForm((f) => ({ ...f, companions: [...(f.companions || []), name] }))
      setCompanionInput('')
    }
  }

  const removeCompanion = (name: string) => {
    setForm((f) => ({ ...f, companions: f.companions?.filter((c) => c !== name) }))
  }

  const addSupporting = () => {
    const name = supportingInput.trim()
    if (name && !form.supporting_artists?.includes(name)) {
      setForm((f) => ({
        ...f,
        supporting_artists: [...(f.supporting_artists || []), name],
      }))
      setSupportingInput('')
    }
  }

  const removeSupporting = (name: string) => {
    setForm((f) => ({
      ...f,
      supporting_artists: f.supporting_artists?.filter((a) => a !== name),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Concert</DialogTitle>
          <DialogDescription>
            Add a new concert to your collection
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Artist */}
          <div className="space-y-2">
            <Label htmlFor="artist_name">Artist *</Label>
            <Input
              id="artist_name"
              placeholder="e.g. Radiohead"
              value={form.artist_name}
              onChange={(e) => setForm((f) => ({ ...f, artist_name: e.target.value }))}
              required
            />
          </div>

          {/* Supporting artists */}
          <div className="space-y-2">
            <Label>Supporting Artists</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Opener name"
                value={supportingInput}
                onChange={(e) => setSupportingInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSupporting()
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addSupporting}>
                <Plus className="size-4" />
              </Button>
            </div>
            {form.supporting_artists && form.supporting_artists.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.supporting_artists.map((a) => (
                  <Badge key={a} variant="secondary" className="gap-1">
                    {a}
                    <button type="button" onClick={() => removeSupporting(a)}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Venue & Date row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venue_name">Venue *</Label>
              <Input
                id="venue_name"
                placeholder="e.g. Metro"
                value={form.venue_name}
                onChange={(e) => setForm((f) => ({ ...f, venue_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Date *</Label>
              <Input
                id="event_date"
                type="date"
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Venue address */}
          <div className="space-y-2">
            <Label htmlFor="venue_address">Venue Address</Label>
            <Input
              id="venue_address"
              placeholder="e.g. 3730 N Clark St, Chicago, IL"
              value={form.venue_address || ''}
              onChange={(e) => setForm((f) => ({ ...f, venue_address: e.target.value }))}
            />
          </div>

          {/* Times */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event_start">Start Time</Label>
              <Input
                id="event_start"
                type="time"
                onChange={(e) => {
                  if (e.target.value && form.event_date) {
                    setForm((f) => ({
                      ...f,
                      event_start: `${f.event_date}T${e.target.value}:00`,
                    }))
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket_cost">Ticket Cost ($)</Label>
              <Input
                id="ticket_cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.ticket_cost || ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    ticket_cost: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex gap-2">
              {(['upcoming', 'attended'] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={form.status === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={cn(form.status === s && 'bg-brand hover:bg-brand/90')}
                >
                  {s === 'upcoming' ? 'Upcoming' : 'Attended'}
                </Button>
              ))}
            </div>
          </div>

          {/* Companions */}
          <div className="space-y-2">
            <Label>Who Are You Going With?</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Sarah"
                value={companionInput}
                onChange={(e) => setCompanionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCompanion()
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addCompanion}>
                <Plus className="size-4" />
              </Button>
            </div>
            {form.companions && form.companions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.companions.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1">
                    {c}
                    <button type="button" onClick={() => removeCompanion(c)}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. outdoor, festival"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addTag}>
                <Plus className="size-4" />
              </Button>
            </div>
            {form.tags && form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.tags.map((t) => (
                  <Badge key={t} variant="outline" className="gap-1">
                    {t}
                    <button type="button" onClick={() => removeTag(t)}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any notes or memories..."
              value={form.notes || ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.artist_name || !form.venue_name || !form.event_date}
              className="bg-brand hover:bg-brand/90"
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Add Concert
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
