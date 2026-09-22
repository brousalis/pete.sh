'use client'

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { FuelComposer } from '@/components/coach/fuel/fuel-composer'
import { FuelConfirmSheet } from '@/components/coach/fuel/fuel-confirm-sheet'
import { FuelDayHero } from '@/components/coach/fuel/fuel-day-hero'
import { FuelEntryList } from '@/components/coach/fuel/fuel-entry-list'
import {
  chicagoToday,
  shiftChicagoDate,
  type FuelDraft,
  type FuelEntryView,
  type NutritionDayView,
} from '@/components/coach/fuel/fuel-types'
import { Chip, Section } from '@/components/coach/ui/panel'
import { fuelStatusLine, fuellingWindowTone } from '@/components/coach/fuel/fuel-glance'
import { FUEL_STAPLES } from '@/components/coach/fuel/fuel-staples'
import { Button } from '@/components/ui/button'

export function RailFuel() {
  const [date, setDate] = useState(chicagoToday)
  const [nutrition, setNutrition] = useState<NutritionDayView | null>(null)
  const [entries, setEntries] = useState<FuelEntryView[]>([])
  const [loading, setLoading] = useState(true)
  const [estimating, setEstimating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create')
  const [draft, setDraft] = useState<FuelDraft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDescription, setPendingDescription] = useState('')
  const [composerReset, setComposerReset] = useState(0)
  const [addingStapleId, setAddingStapleId] = useState<string | null>(null)

  const loadDay = useCallback(async (target: string) => {
    setLoading(true)
    setError(null)
    try {
      const [nutritionRes, entriesRes] = await Promise.all([
        fetch(`/api/coach/nutrition?date=${target}`, { credentials: 'include' }).then((r) =>
          r.json()
        ),
        fetch(`/api/coach/fuel/entries?date=${target}&recent=0`, {
          credentials: 'include',
        }).then((r) => r.json()),
      ])

      if (nutritionRes.success) setNutrition(nutritionRes.data as NutritionDayView)
      else setError(nutritionRes.error ?? 'Failed to load targets')

      if (entriesRes.success) {
        setEntries((entriesRes.data.entries ?? []) as FuelEntryView[])
      }
    } catch {
      setError('Failed to load fuel data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDay(date)
  }, [date, loadDay])

  async function estimate(description: string) {
    setEstimating(true)
    setError(null)
    setPendingDescription(description)
    try {
      const response = await fetch('/api/coach/fuel/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description, date }),
      })
      const payload = await response.json()

      if (!payload.success) {
        openManual(description, payload.code === 'budget_capped' || payload.code === 'soft_cap'
          ? payload.error
          : payload.error ?? 'Estimate failed — enter macros manually.')
        return
      }

      const data = payload.data
      setSheetMode('create')
      setEditingId(null)
      setDraft({
        kind: data.kind,
        descriptionRaw: description,
        items: data.items ?? [],
        kcal: data.totals.kcal,
        proteinG: data.totals.proteinG,
        carbsG: data.totals.carbsG,
        fatG: data.totals.fatG,
        assumptions: data.assumptions ?? '',
        confidence: data.confidence ?? null,
        source: 'llm',
      })
      setSheetOpen(true)
    } catch {
      openManual(description, 'Estimate failed — enter macros manually.')
    } finally {
      setEstimating(false)
    }
  }

  function openManual(description: string, message?: string) {
    if (message) setError(message)
    setSheetMode('create')
    setEditingId(null)
    setDraft({
      kind: 'food',
      descriptionRaw: description || '',
      items: [],
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      assumptions: '',
      confidence: null,
      source: 'manual',
    })
    setSheetOpen(true)
  }

  function openEdit(entry: FuelEntryView) {
    setSheetMode('edit')
    setEditingId(entry.id)
    setDraft({
      kind: entry.kind,
      descriptionRaw: entry.descriptionRaw,
      items: entry.items,
      kcal: entry.kcal,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
      assumptions: entry.assumptions ?? '',
      confidence: entry.confidence,
      source: entry.source,
    })
    setSheetOpen(true)
  }

  async function saveDraft(next: FuelDraft) {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      if (sheetMode === 'edit' && editingId) {
        const response = await fetch(`/api/coach/fuel/entries/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            kind: next.kind,
            descriptionRaw: next.descriptionRaw,
            items: next.items,
            kcal: next.kcal,
            proteinG: next.proteinG,
            carbsG: next.carbsG,
            fatG: next.fatG,
            assumptions: next.assumptions || null,
            confidence: next.confidence,
            source: next.source === 'llm' ? 'manual' : next.source,
          }),
        })
        const payload = await response.json()
        if (!payload.success) {
          setError(payload.error ?? 'Failed to save')
          return
        }
        if (payload.data.nutrition) setNutrition(payload.data.nutrition)
      } else {
        const response = await fetch('/api/coach/fuel/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date,
            kind: next.kind,
            descriptionRaw: next.descriptionRaw,
            items: next.items,
            kcal: next.kcal,
            proteinG: next.proteinG,
            carbsG: next.carbsG,
            fatG: next.fatG,
            assumptions: next.assumptions || null,
            confidence: next.confidence,
            source: next.source,
          }),
        })
        const payload = await response.json()
        if (!payload.success) {
          setError(payload.error ?? 'Failed to save')
          return
        }
        if (payload.data.nutrition) setNutrition(payload.data.nutrition)
      }

      setSheetOpen(false)
      setDraft(null)
      setEditingId(null)
      setComposerReset((n) => n + 1)
      await loadDay(date)
    } catch {
      setError('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(entry: FuelEntryView) {
    setDeletingId(entry.id)
    try {
      const response = await fetch(`/api/coach/fuel/entries/${entry.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const payload = await response.json()
      if (payload.success) {
        if (payload.data.nutrition) setNutrition(payload.data.nutrition)
        await loadDay(date)
      } else {
        setError(payload.error ?? 'Failed to delete')
      }
    } catch {
      setError('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  async function addStaple(stapleId: string) {
    const staple = FUEL_STAPLES.find((row) => row.id === stapleId)
    if (!staple || addingStapleId) return

    setAddingStapleId(stapleId)
    setError(null)
    try {
      const draft = staple.draft
      const response = await fetch('/api/coach/fuel/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date,
          kind: draft.kind,
          descriptionRaw: draft.descriptionRaw,
          items: draft.items,
          kcal: draft.kcal,
          proteinG: draft.proteinG,
          carbsG: draft.carbsG,
          fatG: draft.fatG,
          assumptions: draft.assumptions || null,
          confidence: draft.confidence,
          source: 'reuse',
        }),
      })
      const payload = await response.json()
      if (!payload.success) {
        setError(payload.error ?? 'Failed to add staple')
        return
      }
      if (payload.data.nutrition) setNutrition(payload.data.nutrition)
      await loadDay(date)
    } catch {
      setError('Failed to add staple')
    } finally {
      setAddingStapleId(null)
    }
  }

  const isToday = date === chicagoToday()
  const dateLabel = formatDateLabel(date, isToday)

  const status = nutrition ? fuelStatusLine(nutrition) : null

  return (
    <div className="min-h-full">
      <div className="space-y-4 px-5 pt-6 pb-8 md:px-8 md:pt-8 md:pb-10">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="t-display">{dateLabel}</h1>
              {nutrition ? (
                <Chip tone={fuellingWindowTone(nutrition.fuellingWindow)}>
                  {nutrition.fuellingWindow}
                </Chip>
              ) : null}
              {status ? <Chip tone={status.tone}>{status.label}</Chip> : null}
            </div>
            <p className="mt-1 t-label text-ink-3">Fuel · log intake against today’s targets</p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 rounded-control border border-line bg-surface-1 p-0.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setDate((d) => shiftChicagoDate(d, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 t-label"
              onClick={() => setDate(chicagoToday())}
            >
              Today
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={isToday}
              onClick={() => setDate((d) => shiftChicagoDate(d, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </header>

        <FuelComposer
          estimating={estimating}
          resetToken={composerReset}
          onEstimate={(description) => void estimate(description)}
          onManual={(description) => openManual(description)}
        />

        {error ? (
          <Chip tone="caution">{error}</Chip>
        ) : null}

        {loading && !nutrition ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-4 animate-spin text-ink-3" />
          </div>
        ) : null}

        {nutrition ? (
          <FuelDayHero
            nutrition={nutrition}
            addingStapleId={addingStapleId}
            onAddStaple={(id) => void addStaple(id)}
          />
        ) : null}

        <Section
          title="Log"
          action={
            entries.length > 0 ? (
              <span className="t-micro text-ink-3">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </span>
            ) : null
          }
        >
          <FuelEntryList
            entries={entries}
            onSelect={openEdit}
            onDelete={(entry) => void deleteEntry(entry)}
            deletingId={deletingId}
          />
        </Section>
      </div>

      <FuelConfirmSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        draft={draft}
        mode={sheetMode}
        saving={saving}
        onSave={(next) => void saveDraft(next)}
        onReEstimate={
          pendingDescription
            ? () => {
                setSheetOpen(false)
                void estimate(pendingDescription)
              }
            : undefined
        }
      />
    </div>
  )
}

function formatDateLabel(date: string, isToday: boolean): string {
  if (isToday) return 'Today'
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  return dt.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
