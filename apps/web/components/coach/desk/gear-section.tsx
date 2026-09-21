'use client'

import { AlertTriangle, ChevronDown, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Chip, EmptyNote, Panel, PanelHeader, Section, Track } from '@/components/coach/ui/panel'
import { toneClasses, type Tone } from '@/components/coach/ui/tone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { GearInventoryView, GearItemView } from '@/lib/types/coach-ui.types'
import { GEAR_CATEGORY_LABELS, SPORT_LABELS } from '@/lib/types/coach-ui.types'
import { cn } from '@/lib/utils'

const GEAR_CATEGORIES = [
  'shoes',
  'bike',
  'component',
  'wetsuit',
  'sensor',
  'apparel',
  'other',
] as const

const GEAR_SPORTS = ['swim', 'bike', 'run', 'strength'] as const

const SERVICE_TYPES = ['bike_fit', 'chain', 'tune', 'cleat', 'inspection', 'other'] as const

const SELECT_CLASS =
  'mt-1.5 w-full rounded-md border border-line bg-surface-2 px-3 py-2 t-body text-ink-1'

interface GearFormState {
  name: string
  category: (typeof GEAR_CATEGORIES)[number]
  sport: (typeof GEAR_SPORTS)[number] | ''
  brand: string
  model: string
  purchasedOn: string
  retiredOn: string
  costUsd: string
  lifeLimitMiles: string
  notes: string
}

function emptyForm(category: (typeof GEAR_CATEGORIES)[number] = 'shoes'): GearFormState {
  return {
    name: '',
    category,
    sport: category === 'shoes' ? 'run' : category === 'wetsuit' ? 'swim' : '',
    brand: '',
    model: '',
    purchasedOn: '',
    retiredOn: '',
    costUsd: '',
    lifeLimitMiles: category === 'shoes' ? '400' : '',
    notes: '',
  }
}

function itemToForm(item: GearItemView): GearFormState {
  return {
    name: item.name,
    category: item.category as GearFormState['category'],
    sport: (item.sport as GearFormState['sport']) ?? '',
    brand: item.brand ?? '',
    model: item.model ?? '',
    purchasedOn: item.purchasedOn ?? '',
    retiredOn: item.retiredOn ?? '',
    costUsd: item.costUsd != null ? String(item.costUsd) : '',
    lifeLimitMiles: item.lifeLimitMiles != null ? String(item.lifeLimitMiles) : '',
    notes: item.notes ?? '',
  }
}

function formToPayload(form: GearFormState, mode: 'create' | 'patch' = 'create'): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    category: form.category,
  }
  if (form.sport) payload.sport = form.sport
  if (form.brand.trim()) payload.brand = form.brand.trim()
  if (form.model.trim()) payload.model = form.model.trim()
  if (form.purchasedOn) payload.purchasedOn = form.purchasedOn
  if (mode === 'patch') payload.retiredOn = form.retiredOn || null
  else if (form.retiredOn) payload.retiredOn = form.retiredOn
  if (form.costUsd) payload.costUsd = Number(form.costUsd)
  if (form.lifeLimitMiles) payload.lifeLimitMiles = Number(form.lifeLimitMiles)
  if (form.notes.trim()) payload.notes = form.notes.trim()
  return payload
}

function chicagoToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

export function GearSection() {
  const [inventory, setInventory] = useState<GearInventoryView | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [includeRetired, setIncludeRetired] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<GearFormState>(() => emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GearFormState>(() => emptyForm())
  const [serviceType, setServiceType] = useState<(typeof SERVICE_TYPES)[number]>('inspection')
  const [serviceDueOn, setServiceDueOn] = useState('')
  const [serviceNotes, setServiceNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadGear = useCallback(async (recompute = false) => {
    const params = new URLSearchParams()
    if (includeRetired) params.set('includeRetired', '1')
    if (recompute) params.set('recompute', '1')
    const response = await fetch(`/api/coach/gear?${params}`, { credentials: 'include' })
    const payload = await response.json()
    if (payload.success) setInventory(payload.data as GearInventoryView)
  }, [includeRetired])

  useEffect(() => {
    void (async () => {
      try {
        await loadGear(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [loadGear])

  async function runMutation(
    fn: () => Promise<Response>,
    options?: { closeAdd?: boolean; closeEdit?: boolean }
  ) {
    setBusy(true)
    setError(null)
    try {
      const response = await fn()
      const payload = await response.json()
      if (!payload.success) {
        setError(typeof payload.error === 'string' ? payload.error : 'Request failed.')
        return
      }
      setInventory(payload.data as GearInventoryView)
      if (options?.closeAdd) {
        setShowAdd(false)
        setAddForm(emptyForm())
      }
      if (options?.closeEdit) setEditingId(null)
    } finally {
      setBusy(false)
    }
  }

  function startEdit(item: GearItemView) {
    setEditingId(item.id)
    setEditForm(itemToForm(item))
    setServiceType('inspection')
    setServiceDueOn('')
    setServiceNotes('')
  }

  if (loading) {
    return (
      <Section title="Gear">
        <Panel className="flex justify-center py-8">
          <Loader2 className="size-4 animate-spin text-ink-3" />
        </Panel>
      </Section>
    )
  }

  return (
    <Section
      title="Gear"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 t-label text-ink-3">
            <input
              type="checkbox"
              checked={includeRetired}
              onChange={(event) => {
                setIncludeRetired(event.target.checked)
                void loadGear(false)
              }}
              className="size-3.5 rounded border-line"
            />
            Retired
          </label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 t-label"
            disabled={busy}
            onClick={() => void loadGear(true)}
          >
            <RefreshCw className={cn('mr-1 size-3.5', busy && 'animate-spin')} />
            Sync mileage
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => {
              setShowAdd((open) => !open)
              setError(null)
            }}
          >
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        </div>
      }
    >
      <p className="px-0.5 t-label text-ink-3">
        Mileage comes from Apple Health workouts. Set{' '}
        <span className="text-ink-2">sport</span>,{' '}
        <span className="text-ink-2">first used</span>, and{' '}
        <span className="text-ink-2">retired</span> dates so each historical pair owns its window.
        Bike rides use GPS route distance when HealthKit leaves distance blank; indoor sessions
        without a sensor use ~18 mph from ride time.
      </p>

      {error ? (
        <Panel tone="alert" className="t-label text-ink-2">
          {error}
        </Panel>
      ) : null}

      {inventory?.overlaps.length ? (
        <Panel tone="caution" className="space-y-2">
          <p className="t-label font-medium text-ink-1">Overlapping date ranges</p>
          {inventory.overlaps.map((overlap, index) => (
            <p key={index} className="t-label text-ink-2">
              {SPORT_LABELS[overlap.sport] ?? overlap.sport}:{' '}
              <span className="text-ink-1">{overlap.itemA.name}</span> and{' '}
              <span className="text-ink-1">{overlap.itemB.name}</span> both claim{' '}
              {overlap.overlapFrom} → {overlap.overlapTo}. Split the dates so only one item is active
              per sport at a time.
            </p>
          ))}
        </Panel>
      ) : null}

      {inventory?.alerts.length ? (
        <Panel tone="caution" className="space-y-2">
          {inventory.alerts.map((alert, index) => (
            <div key={index} className="flex gap-2.5">
              <AlertTriangle
                className={cn(
                  'mt-0.5 size-3.5 shrink-0',
                  alert.severity === 'warn' ? 'text-tone-alert' : 'text-tone-caution'
                )}
              />
              <p className="t-label text-ink-2">
                <span className="font-medium text-ink-1">{alert.name}</span> — {alert.message}
              </p>
            </div>
          ))}
        </Panel>
      ) : null}

      {showAdd ? (
        <Panel className="space-y-3">
          <PanelHeader label="New item" />
          <GearFormFields form={addForm} onChange={setAddForm} idPrefix="add" />
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              disabled={busy || addForm.name.trim().length < 2}
              onClick={() =>
                void runMutation(
                  () =>
                    fetch('/api/coach/gear', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify(formToPayload(addForm)),
                    }),
                  { closeAdd: true }
                )
              }
            >
              {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Save & backfill
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </Panel>
      ) : null}

      <Panel className="py-0">
        {!inventory?.items.length ? (
          <div className="py-6">
            <EmptyNote>Nothing tracked yet — add your current kit and past pairs.</EmptyNote>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {inventory.items.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-3.5 last:pb-3.5">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 text-left"
                  onClick={() => (editingId === item.id ? setEditingId(null) : startEdit(item))}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate t-body text-ink-1">{item.name}</p>
                      <Chip tone="neutral">{GEAR_CATEGORY_LABELS[item.category] ?? item.category}</Chip>
                      {item.retiredOn ? <Chip tone="neutral">Retired</Chip> : null}
                      {item.status !== 'ok' ? (
                        <Chip tone={item.status === 'past_limit' ? 'alert' : 'caution'}>
                          {statusLabel(item.status)}
                        </Chip>
                      ) : null}
                    </div>
                    <p className="mt-1 t-label text-ink-3">
                      {item.sport ? `${SPORT_LABELS[item.sport] ?? item.sport} · ` : null}
                      {item.totalMiles} mi · {item.sessionCount} sessions
                      {item.purchasedOn ? ` · from ${item.purchasedOn}` : null}
                      {item.retiredOn ? ` · to ${item.retiredOn}` : null}
                    </p>
                  </div>
                  {item.lifeRemainingPct != null ? (
                    <div className="w-20 shrink-0">
                      <Track pct={item.lifeRemainingPct} tone={lifeTone(item.lifeRemainingPct)} />
                      <p
                        className={cn(
                          'mt-1 t-num t-num-sm text-right',
                          toneClasses(lifeTone(item.lifeRemainingPct)).text
                        )}
                      >
                        {item.lifeRemainingPct}%
                      </p>
                    </div>
                  ) : null}
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-ink-3 transition-transform',
                      editingId === item.id && 'rotate-180'
                    )}
                  />
                </button>

                {editingId === item.id ? (
                  <div className="mt-4 space-y-4 border-t border-line pt-4">
                    <GearFormFields form={editForm} onChange={setEditForm} idPrefix={`edit-${item.id}`} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void runMutation(
                            () =>
                              fetch(
                                `/api/coach/gear/${item.id}?includeRetired=${includeRetired ? '1' : '0'}`,
                                {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify(formToPayload(editForm, 'patch')),
                                }
                              ),
                            { closeEdit: false }
                          )
                        }
                      >
                        Save changes
                      </Button>
                      {!item.retiredOn ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            setEditForm((current) => ({ ...current, retiredOn: chicagoToday() }))
                          }}
                        >
                          Set retired today
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void runMutation(
                              () =>
                                fetch(
                                  `/api/coach/gear/${item.id}?includeRetired=${includeRetired ? '1' : '0'}`,
                                  {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({ retiredOn: null }),
                                  }
                                ),
                              { closeEdit: false }
                            )
                          }
                        >
                          Mark current again
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-tone-alert"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm(`Remove “${item.name}” from inventory?`)) return
                          void runMutation(
                            () =>
                              fetch(
                                `/api/coach/gear/${item.id}?includeRetired=${includeRetired ? '1' : '0'}`,
                                { method: 'DELETE', credentials: 'include' }
                              ),
                            { closeEdit: true }
                          )
                        }}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Delete
                      </Button>
                    </div>

                    <div className="space-y-2 rounded-md bg-surface-2 p-3">
                      <PanelHeader label="Log service" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="t-micro text-ink-3">Type</Label>
                          <select
                            value={serviceType}
                            onChange={(event) =>
                              setServiceType(event.target.value as (typeof SERVICE_TYPES)[number])
                            }
                            className={SELECT_CLASS}
                          >
                            {SERVICE_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="t-micro text-ink-3">Due on</Label>
                          <Input
                            type="date"
                            value={serviceDueOn}
                            onChange={(event) => setServiceDueOn(event.target.value)}
                            className="mt-1.5 h-9"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="t-micro text-ink-3">Notes</Label>
                        <Input
                          value={serviceNotes}
                          onChange={(event) => setServiceNotes(event.target.value)}
                          className="mt-1.5 h-9"
                          placeholder="Optional"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void runMutation(() =>
                            fetch(
                              `/api/coach/gear/${item.id}/service?includeRetired=${includeRetired ? '1' : '0'}`,
                              {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({
                                  serviceType,
                                  dueOn: serviceDueOn || undefined,
                                  notes: serviceNotes || undefined,
                                }),
                              }
                            )
                          )
                        }
                      >
                        Add service record
                      </Button>
                      {item.services.length ? (
                        <ul className="mt-2 space-y-1 t-label text-ink-3">
                          {item.services.map((service) => (
                            <li key={service.id}>
                              {service.serviceType.replace('_', ' ')}
                              {service.dueOn ? ` · due ${service.dueOn}` : ''}
                              {service.notes ? ` — ${service.notes}` : ''}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {inventory?.recommendations.length ? (
        <Panel className="space-y-3">
          <PanelHeader label="Upgrade ideas (from coach)" />
          {inventory.recommendations.slice(0, 4).map((rec) => (
            <div key={rec.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
              <p className="t-body text-ink-1">{rec.title}</p>
              <p className="mt-1 t-label text-ink-3">{rec.rationale}</p>
              {rec.estimatedCostUsd != null ? (
                <p className="mt-1 t-num t-num-sm text-ink-2">
                  ~${rec.estimatedCostUsd}
                  {rec.estimatedSecondsSaved != null
                    ? ` · ~${rec.estimatedSecondsSaved}s race impact`
                    : null}
                </p>
              ) : null}
            </div>
          ))}
        </Panel>
      ) : null}
    </Section>
  )
}

function GearFormFields({
  form,
  onChange,
  idPrefix,
}: {
  form: GearFormState
  onChange: (next: GearFormState) => void
  idPrefix: string
}) {
  function patch(partial: Partial<GearFormState>) {
    onChange({ ...form, ...partial })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor={`${idPrefix}-name`} className="t-micro text-ink-3">
          Name
        </Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(event) => patch({ name: event.target.value })}
          className="mt-1.5 h-9"
          placeholder="Daily trainers, race wetsuit, …"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-category`} className="t-micro text-ink-3">
          Category
        </Label>
        <select
          id={`${idPrefix}-category`}
          value={form.category}
          onChange={(event) => {
            const category = event.target.value as GearFormState['category']
            patch({
              category,
              sport:
                category === 'shoes'
                  ? 'run'
                  : category === 'wetsuit'
                    ? 'swim'
                    : category === 'bike'
                      ? 'bike'
                      : form.sport,
              lifeLimitMiles:
                category === 'shoes' && !form.lifeLimitMiles ? '400' : form.lifeLimitMiles,
            })
          }}
          className={SELECT_CLASS}
        >
          {GEAR_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {GEAR_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-sport`} className="t-micro text-ink-3">
          Sport (for mileage)
        </Label>
        <select
          id={`${idPrefix}-sport`}
          value={form.sport}
          onChange={(event) =>
            patch({ sport: event.target.value as GearFormState['sport'] })
          }
          className={SELECT_CLASS}
        >
          <option value="">—</option>
          {GEAR_SPORTS.map((sport) => (
            <option key={sport} value={sport}>
              {SPORT_LABELS[sport]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-purchased`} className="t-micro text-ink-3">
          First used
        </Label>
        <Input
          id={`${idPrefix}-purchased`}
          type="date"
          value={form.purchasedOn}
          onChange={(event) => patch({ purchasedOn: event.target.value })}
          className="mt-1.5 h-9"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-retired`} className="t-micro text-ink-3">
          Retired (blank if current)
        </Label>
        <Input
          id={`${idPrefix}-retired`}
          type="date"
          value={form.retiredOn}
          onChange={(event) => patch({ retiredOn: event.target.value })}
          className="mt-1.5 h-9"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-life`} className="t-micro text-ink-3">
          Life limit (mi)
        </Label>
        <Input
          id={`${idPrefix}-life`}
          type="number"
          min={1}
          value={form.lifeLimitMiles}
          onChange={(event) => patch({ lifeLimitMiles: event.target.value })}
          className="mt-1.5 h-9 t-num"
          placeholder="400 for shoes"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-cost`} className="t-micro text-ink-3">
          Cost $
        </Label>
        <Input
          id={`${idPrefix}-cost`}
          type="number"
          min={0}
          step="0.01"
          value={form.costUsd}
          onChange={(event) => patch({ costUsd: event.target.value })}
          className="mt-1.5 h-9 t-num"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-brand`} className="t-micro text-ink-3">
          Brand
        </Label>
        <Input
          id={`${idPrefix}-brand`}
          value={form.brand}
          onChange={(event) => patch({ brand: event.target.value })}
          className="mt-1.5 h-9"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-model`} className="t-micro text-ink-3">
          Model
        </Label>
        <Input
          id={`${idPrefix}-model`}
          value={form.model}
          onChange={(event) => patch({ model: event.target.value })}
          className="mt-1.5 h-9"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`${idPrefix}-notes`} className="t-micro text-ink-3">
          Notes
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={form.notes}
          onChange={(event) => patch({ notes: event.target.value })}
          className="mt-1.5 min-h-[72px] resize-y"
          placeholder="Rotation pair, race-only, cleat setup, …"
        />
      </div>
    </div>
  )
}

function statusLabel(status: GearItemView['status']): string {
  if (status === 'past_limit') return 'Past limit'
  if (status === 'approaching_limit') return 'Low life'
  if (status === 'service_due') return 'Service due'
  return status
}

function lifeTone(pct: number): Tone {
  if (pct <= 0) return 'alert'
  if (pct <= 15) return 'caution'
  return 'good'
}
