'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import type { FuelDraft, FuelKind } from './fuel-types'

export function FuelConfirmSheet({
  open,
  onOpenChange,
  draft,
  mode,
  saving,
  onSave,
  onReEstimate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: FuelDraft | null
  mode: 'create' | 'edit'
  saving: boolean
  onSave: (draft: FuelDraft) => void
  onReEstimate?: () => void
}) {
  const [local, setLocal] = useState<FuelDraft | null>(draft)

  useEffect(() => {
    setLocal(draft)
  }, [draft])

  if (!local) return null

  function updateTotals(
    field: 'kcal' | 'proteinG' | 'carbsG' | 'fatG',
    value: string
  ) {
    const n = Math.max(0, Math.floor(Number(value) || 0))
    setLocal((prev) => (prev ? { ...prev, [field]: n } : prev))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{mode === 'edit' ? 'Edit entry' : 'Confirm intake'}</SheetTitle>
          <SheetDescription>
            {local.source === 'llm'
              ? 'Adjust anything that looks off, then add it to the day.'
              : 'Set macros and save.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div>
            <Label className="t-micro text-ink-3">Description</Label>
            <Textarea
              value={local.descriptionRaw}
              onChange={(e) =>
                setLocal((prev) =>
                  prev ? { ...prev, descriptionRaw: e.target.value } : prev
                )
              }
              className="mt-1.5 min-h-[72px]"
            />
          </div>

          <div className="flex gap-2">
            {(['food', 'drink', 'other'] as FuelKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setLocal((prev) => (prev ? { ...prev, kind } : prev))}
                className={cn(
                  'rounded-chip px-3 py-1.5 t-label font-medium capitalize transition-colors',
                  local.kind === kind
                    ? 'bg-surface-3 text-ink-1'
                    : 'bg-surface-1 text-ink-3 hover:text-ink-1'
                )}
              >
                {kind}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MacroField
              label="kcal"
              value={local.kcal}
              onChange={(v) => updateTotals('kcal', v)}
            />
            <MacroField
              label="Protein g"
              value={local.proteinG}
              onChange={(v) => updateTotals('proteinG', v)}
            />
            <MacroField
              label="Carbs g"
              value={local.carbsG}
              onChange={(v) => updateTotals('carbsG', v)}
            />
            <MacroField
              label="Fat g"
              value={local.fatG}
              onChange={(v) => updateTotals('fatG', v)}
            />
          </div>

          {local.items.length > 0 ? (
            <div className="space-y-2 rounded-panel bg-surface-1 px-3 py-3">
              <p className="t-micro text-ink-3">Items</p>
              {local.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex justify-between gap-3">
                  <p className="t-body text-ink-2">
                    {item.name}
                    {item.portion ? (
                      <span className="text-ink-3"> · {item.portion}</span>
                    ) : null}
                  </p>
                  <p className="t-num t-num-sm shrink-0 text-ink-2">{item.kcal}</p>
                </div>
              ))}
            </div>
          ) : null}

          {local.assumptions ? (
            <p className="t-label text-ink-3">{local.assumptions}</p>
          ) : null}

          {local.confidence != null ? (
            <p className="t-micro text-ink-3">
              Confidence {Math.round(local.confidence * 100)}%
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            {onReEstimate && local.source === 'llm' ? (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={saving}
                onClick={onReEstimate}
              >
                Re-estimate
              </Button>
            ) : null}
            <Button
              type="button"
              className="flex-1"
              disabled={saving || !local.descriptionRaw.trim()}
              onClick={() => onSave(local)}
            >
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {mode === 'edit' ? 'Save changes' : 'Add to day'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MacroField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: string) => void
}) {
  return (
    <div>
      <Label className="t-micro text-ink-3">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 t-num"
      />
    </div>
  )
}
