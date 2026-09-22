'use client'

import { Trash2 } from 'lucide-react'

import { EmptyNote, Panel } from '@/components/coach/ui/panel'
import { Button } from '@/components/ui/button'

import { entryTitle } from './fuel-glance'
import type { FuelEntryView } from './fuel-types'

export function FuelEntryList({
  entries,
  onSelect,
  onDelete,
  deletingId,
}: {
  entries: FuelEntryView[]
  onSelect: (entry: FuelEntryView) => void
  onDelete: (entry: FuelEntryView) => void
  deletingId: string | null
}) {
  if (entries.length === 0) {
    return <EmptyNote>Nothing logged yet. Describe a meal below.</EmptyNote>
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
  )

  return (
    <Panel inset={false} className="divide-y divide-line overflow-hidden py-0">
      {sorted.map((entry) => (
        <div key={entry.id} className="flex items-stretch gap-0.5">
          <button
            type="button"
            onClick={() => onSelect(entry)}
            className="grid min-w-0 flex-1 grid-cols-[3.25rem_1fr_auto] items-center gap-x-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
          >
            <time className="t-num t-num-sm text-ink-3">{formatTime(entry.loggedAt)}</time>
            <div className="min-w-0">
              <p className="t-subtitle line-clamp-2 text-ink-1">{entryTitle(entry.descriptionRaw, 72)}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <MacroPill label="P" value={entry.proteinG} />
                <MacroPill label="C" value={entry.carbsG} />
                <MacroPill label="F" value={entry.fatG} />
              </div>
            </div>
            <div className="text-right">
              <p className="t-num t-num-md text-ink-1">{entry.kcal}</p>
              <p className="t-micro text-ink-3">kcal</p>
            </div>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="my-1.5 mr-1.5 size-9 shrink-0 text-ink-3"
            disabled={deletingId === entry.id}
            onClick={() => onDelete(entry)}
            aria-label="Delete entry"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </Panel>
  )
}

function MacroPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-chip bg-surface-2 px-1.5 py-0.5">
      <span className="t-micro text-ink-3">{label}</span>
      <span className="t-num t-num-sm text-ink-2">{value}</span>
    </span>
  )
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
