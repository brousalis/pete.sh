'use client'

/**
 * Assistant as a right-side pane. Resizable by dragging the left edge.
 * On close, dispatches 'assistant-closed' so pages (e.g. cooking) can refetch.
 */

import { Sheet, SheetContent } from '@/components/ui/sheet'
import { CookingProvider } from '@/hooks/use-cooking-data'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AssistantPageContent } from '@/app/(dashboard)/assistant/page'

const ASSISTANT_CLOSED_EVENT = 'assistant-closed'
const PANEL_WIDTH_STORAGE_KEY = 'assistant-panel-width-percent'
const PANEL_WIDTH_MIN = 35
const PANEL_WIDTH_MAX = 95
const PANEL_WIDTH_DEFAULT = 60

function getStoredWidth(): number {
  if (typeof window === 'undefined') return PANEL_WIDTH_DEFAULT
  const stored = localStorage.getItem(PANEL_WIDTH_STORAGE_KEY)
  const n = stored ? Number(stored) : NaN
  // Ignore stored value if too small (e.g. from when max-w-sm was capping the panel)
  if (!Number.isFinite(n) || n < 50 || n > PANEL_WIDTH_MAX) return PANEL_WIDTH_DEFAULT
  return Math.max(n, PANEL_WIDTH_MIN)
}

type AssistantModalContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const AssistantModalContext = createContext<AssistantModalContextValue | null>(null)

export function useAssistantModal() {
  const ctx = useContext(AssistantModalContext)
  if (!ctx) throw new Error('useAssistantModal must be used within AssistantModalProvider')
  return ctx
}

export function AssistantModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = useState(false)
  const [panelWidth, setPanelWidth] = useState(PANEL_WIDTH_DEFAULT)
  const isResizingRef = useRef(false)

  useEffect(() => {
    setPanelWidth(getStoredWidth())
  }, [])

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    if (!next) {
      window.dispatchEvent(new Event(ASSISTANT_CLOSED_EVENT))
    }
  }, [])

  const panelWidthRef = useRef(panelWidth)
  panelWidthRef.current = panelWidth

  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    isResizingRef.current = true
  }, [])

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizingRef.current) return
    const percent = (1 - e.clientX / window.innerWidth) * 100
    const clamped = Math.min(PANEL_WIDTH_MAX, Math.max(PANEL_WIDTH_MIN, percent))
    setPanelWidth(clamped)
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(clamped))
  }, [])

  const handleResizePointerUp = useCallback(() => {
    if (isResizingRef.current) {
      isResizingRef.current = false
      localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidthRef.current))
    }
  }, [])

  return (
    <AssistantModalContext.Provider value={{ open, setOpen }}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          style={{ width: `${panelWidth}%`, minWidth: 360, maxWidth: 'none' }}
          className="inset-y-0 right-0 h-full border-l p-0 gap-0 flex flex-col overflow-hidden bg-card !max-w-none w-auto"
        >
          <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <button
              type="button"
              aria-label="Resize panel"
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerUp}
              className="absolute left-0 top-0 z-10 h-full w-3 cursor-col-resize touch-none border-l border-transparent hover:border-white/30 hover:bg-white/10 active:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-violet/50"
            />
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden pl-2">
              <CookingProvider>
                <AssistantPageContent onClose={() => setOpen(false)} fullScreen />
              </CookingProvider>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AssistantModalContext.Provider>
  )
}

/** Subscribe to assistant-closed (e.g. to refetch meal plan). */
export function useOnAssistantClosed(callback: () => void) {
  const cb = useCallback(callback, [])
  useEffect(() => {
    const handler = () => cb()
    window.addEventListener(ASSISTANT_CLOSED_EVENT, handler)
    return () => window.removeEventListener(ASSISTANT_CLOSED_EVENT, handler)
  }, [cb])
}
