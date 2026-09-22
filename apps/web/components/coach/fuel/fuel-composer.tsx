'use client'

import { Loader2, MoreHorizontal, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function FuelComposer({
  estimating,
  resetToken,
  onEstimate,
  onManual,
}: {
  estimating: boolean
  resetToken: number
  onEstimate: (description: string) => void
  onManual: (description: string) => void
}) {
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setText('')
    setMenuOpen(false)
  }, [resetToken])

  function submitEstimate() {
    const trimmed = text.trim()
    if (!trimmed || estimating) return
    onEstimate(trimmed)
  }

  return (
    <div className="flex items-end gap-2">
      <div className="relative min-w-0 flex-1">
        <Textarea
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you eat or drink?"
          rows={2}
          className="min-h-[52px] resize-none rounded-panel border-line bg-surface-1 pr-10 t-body"
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
            <div className="absolute right-0 top-full mt-1 min-w-[10rem] rounded-panel border border-line bg-surface-1 py-1 shadow-lg">
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
  )
}
