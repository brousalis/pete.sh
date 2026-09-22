'use client'

import { Loader2, MoreHorizontal, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { entryTitle } from './fuel-glance'
import type { FuelEntryView } from './fuel-types'

export function FuelComposer({
  recent,
  estimating,
  resetToken,
  onEstimate,
  onManual,
  onReuse,
}: {
  recent: FuelEntryView[]
  estimating: boolean
  resetToken: number
  onEstimate: (description: string) => void
  onManual: (description: string) => void
  onReuse: (entry: FuelEntryView) => void
}) {
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [keyboardPad, setKeyboardPad] = useState(0)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setText('')
    setMenuOpen(false)
  }, [resetToken])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const vv = window.visualViewport
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardPad(inset > 80 ? inset : 0)
    }

    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    sync()
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [])

  function submitEstimate() {
    const trimmed = text.trim()
    if (!trimmed || estimating) return
    onEstimate(trimmed)
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:absolute"
      style={keyboardPad > 0 ? { bottom: keyboardPad } : undefined}
    >
      <div
        className={cn(
          'pointer-events-auto border-t border-line bg-surface-0/95 backdrop-blur-md',
          keyboardPad > 0
            ? 'px-4 pt-3 pb-3'
            : 'px-4 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:mx-auto md:max-w-[46rem] md:px-8 md:pb-4'
        )}
      >
        {recent.length > 0 ? (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recent.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onReuse(entry)}
                className="shrink-0 rounded-chip border border-line bg-surface-1 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-2"
              >
                <span className="block t-label text-ink-1">{entryTitle(entry.descriptionRaw, 32)}</span>
                <span className="t-num t-num-sm text-ink-3">{entry.kcal} kcal</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <div className="relative min-w-0 flex-1">
            <Textarea
              ref={areaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you eat or drink?"
              rows={2}
              className="min-h-[48px] resize-none rounded-panel border-line bg-surface-1 pr-10 t-body"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitEstimate()
                }
              }}
            />
            <div className="absolute top-1.5 right-1.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 text-ink-3"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More logging options"
              >
                <MoreHorizontal className="size-4" />
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 bottom-full mb-1 min-w-[10rem] rounded-panel border border-line bg-surface-1 py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left t-label text-ink-1 hover:bg-surface-2"
                    onClick={() => {
                      setMenuOpen(false)
                      onManual(text.trim())
                    }}
                  >
                    Log manually
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            className="h-11 shrink-0 gap-1.5 px-4"
            disabled={estimating || !text.trim()}
            onClick={submitEstimate}
          >
            {estimating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Plus className="size-4" />
                Log
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
