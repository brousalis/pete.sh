'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { useCooking } from '@/hooks/use-cooking-data'
import { apiPost, apiPut } from '@/lib/api/client'
import type { FridgeScan } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Bug,
    Camera,
    Check,
    ChefHat,
    ChevronDown,
    ChevronRight,
    Clock,
    Cpu,
    Loader2,
    Mic,
    MicOff,
    Plus,
    ScanLine,
    Snowflake,
    Sparkles,
    X,
    Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

function hasNativeBridge(): boolean {
  if (typeof window === 'undefined') return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).webkit?.messageHandlers?.petehome
}

interface ScanDebugInfo {
  scanId: string | null
  scanType: 'voice' | 'photo'
  rawTranscript?: string
  model?: string
  rawResponse?: string
  inputTokens?: number
  outputTokens?: number
  apiLatencyMs?: number
  clientLatencyMs: number
  identifiedCount: number
  timestamp: string
  imageSize?: string
}

interface FridgeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ScanTab = 'voice' | 'photo'
type ScanPhase = 'input' | 'results' | 'saved'

export function FridgeScanner({ open, onOpenChange }: FridgeScannerProps) {
  const {
    setFridgeIngredients,
    setFridgeFilterActive,
  } = useCooking()

  const [activeTab, setActiveTab] = useState<ScanTab>('voice')
  const [phase, setPhase] = useState<ScanPhase>('input')
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [items, setItems] = useState<string[]>([])
  const [scanId, setScanId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [debugInfo, setDebugInfo] = useState<ScanDebugInfo | null>(null)
  const [enableFilter, setEnableFilter] = useState(true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__onFridgeScanComplete = (result: { items: string[]; scanId: string }) => {
      setItems(result.items)
      setScanId(result.scanId)
      setPhase('results')
      setIsAnalyzing(false)
      onOpenChange(true)
    }

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__onFridgeScanComplete
    }
  }, [onOpenChange])

  const openNativeScanner = useCallback(() => {
    if (hasNativeBridge()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).webkit.messageHandlers.petehome.postMessage({
        action: 'openFridgeScanner',
      })
      return true
    }
    return false
  }, [])

  const resetState = useCallback(() => {
    setIsRecording(false)
    setTranscript('')
    setIsAnalyzing(false)
    setItems([])
    setScanId(null)
    setError(null)
    setNewItem('')
    setDebugInfo(null)
    setPhase('input')
    setEnableFilter(true)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
  }, [])

  // Voice recording
  const startRecording = useCallback(() => {
    setError(null)
    setTranscript('')
    setItems([])
    setScanId(null)
    setDebugInfo(null)
    setPhase('input')

    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setTranscript(text)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`)
      }
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  // Analyze voice transcript
  const analyzeVoice = useCallback(async () => {
    if (!transcript.trim()) return
    setIsAnalyzing(true)
    setError(null)

    const clientStart = Date.now()
    const response = await apiPost<FridgeScan>('/api/cooking/fridge-scan', {
      type: 'voice',
      transcript,
    })
    const clientLatencyMs = Date.now() - clientStart

    if (response.success && response.data) {
      const data = response.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawResponse = (response as any).debug
      setItems(data.identified_items)
      setScanId(data.id)
      setDebugInfo({
        scanId: data.id,
        scanType: 'voice',
        rawTranscript: transcript,
        model: rawResponse?.model,
        rawResponse: rawResponse?.rawResponse,
        inputTokens: rawResponse?.inputTokens,
        outputTokens: rawResponse?.outputTokens,
        apiLatencyMs: rawResponse?.latencyMs,
        clientLatencyMs,
        identifiedCount: data.identified_items.length,
        timestamp: data.created_at,
      })
      setPhase('results')
    } else {
      setError(response.error || 'Failed to analyze transcript')
    }
    setIsAnalyzing(false)
  }, [transcript])

  // Photo handling
  const handlePhotoCapture = useCallback(async (file: File) => {
    setIsAnalyzing(true)
    setError(null)
    setItems([])
    setScanId(null)
    setDebugInfo(null)
    setPhase('input')

    try {
      const imageSize = `${(file.size / 1024).toFixed(1)}KB`
      const base64 = await compressImageFile(file, 1024, 0.7)

      const clientStart = Date.now()
      const response = await apiPost<FridgeScan>('/api/cooking/fridge-scan', {
        type: 'photo',
        image: base64,
      })
      const clientLatencyMs = Date.now() - clientStart

      if (response.success && response.data) {
        const data = response.data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawResponse = (response as any).debug
        setItems(data.identified_items)
        setScanId(data.id)
        setDebugInfo({
          scanId: data.id,
          scanType: 'photo',
          model: rawResponse?.model,
          rawResponse: rawResponse?.rawResponse,
          inputTokens: rawResponse?.inputTokens,
          outputTokens: rawResponse?.outputTokens,
          apiLatencyMs: rawResponse?.latencyMs,
          clientLatencyMs,
          identifiedCount: data.identified_items.length,
          timestamp: data.created_at,
          imageSize,
        })
        setPhase('results')
      } else {
        setError(response.error || 'Failed to analyze photo')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image')
    }

    setIsAnalyzing(false)
  }, [])

  const removeItem = useCallback((item: string) => {
    setItems((prev) => prev.filter((i) => i !== item))
  }, [])

  const addItem = useCallback(() => {
    const trimmed = newItem.trim().toLowerCase()
    if (trimmed && !items.includes(trimmed)) {
      setItems((prev) => [...prev, trimmed])
      setNewItem('')
    }
  }, [newItem, items])

  // Save to fridge (does NOT close or auto-filter)
  const saveToFridge = useCallback(async () => {
    if (scanId) {
      await apiPut(`/api/cooking/fridge-scan/${scanId}`, {
        confirmed_items: items,
        recipes_matched: 0,
      })
    }
    setFridgeIngredients(items)
    if (enableFilter) {
      setFridgeFilterActive(true)
    }
    setPhase('saved')
  }, [scanId, items, enableFilter, setFridgeIngredients, setFridgeFilterActive])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    resetState()
  }, [onOpenChange, resetState])

  // Native bridge path — only show results sheet when native scan completes
  if (hasNativeBridge()) {
    const showNativeResults = phase === 'results' || phase === 'saved'
    return (
      <Sheet open={open && showNativeResults} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Fridge Scan Results</SheetTitle>
            <SheetDescription>
              Review and confirm the items found in your fridge
            </SheetDescription>
          </SheetHeader>
          {phase === 'saved' ? (
            <SavedConfirmation
              itemCount={items.length}
              filterEnabled={enableFilter}
              onClose={handleClose}
              onScanAgain={() => resetState()}
            />
          ) : (
            <ResultsView
              items={items}
              onRemoveItem={removeItem}
              newItem={newItem}
              onNewItemChange={setNewItem}
              onAddItem={addItem}
              onSave={saveToFridge}
              debugInfo={debugInfo}
              enableFilter={enableFilter}
              onEnableFilterChange={setEnableFilter}
            />
          )}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState()
        onOpenChange(isOpen)
      }}
    >
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ScanLine className="size-5 text-primary" />
            Fridge Scanner
          </SheetTitle>
          <SheetDescription>
            List or photograph what&apos;s in your fridge to find matching recipes
          </SheetDescription>
        </SheetHeader>

        {phase === 'saved' ? (
          <SavedConfirmation
            itemCount={items.length}
            filterEnabled={enableFilter}
            onClose={handleClose}
            onScanAgain={() => {
              resetState()
            }}
          />
        ) : phase === 'results' ? (
          <ResultsView
            items={items}
            onRemoveItem={removeItem}
            newItem={newItem}
            onNewItemChange={setNewItem}
            onAddItem={addItem}
            onSave={saveToFridge}
            debugInfo={debugInfo}
            enableFilter={enableFilter}
            onEnableFilterChange={setEnableFilter}
          />
        ) : (
          <div className="mt-4 space-y-4">
            {/* Tab picker */}
            <div className="flex rounded-xl bg-muted/60 p-1">
              {(['voice', 'photo'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    activeTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'voice' ? (
                    <Mic className="size-4" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                  {tab === 'voice' ? 'Voice' : 'Photo'}
                </button>
              ))}
            </div>

            {/* Voice tab */}
            {activeTab === 'voice' && (
              <div className="flex flex-col items-center space-y-4 py-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    'relative flex items-center justify-center rounded-full transition-all',
                    isRecording
                      ? 'size-28 bg-red-500/10'
                      : 'size-24 bg-primary/10 hover:bg-primary/15'
                  )}
                >
                  {isRecording && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-red-500/30"
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  {isRecording ? (
                    <MicOff className="size-10 text-red-500" />
                  ) : (
                    <Mic className="size-10 text-primary" />
                  )}
                </button>

                <p className="text-sm text-muted-foreground">
                  {isRecording
                    ? 'Listening... list what\'s in your fridge'
                    : 'Tap to start listing ingredients'}
                </p>

                {transcript && (
                  <div className="w-full rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Transcript
                    </p>
                    <p className="text-sm">{transcript}</p>
                  </div>
                )}

                {!isRecording && transcript && (
                  <Button
                    onClick={analyzeVoice}
                    disabled={isAnalyzing}
                    className="w-full"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 mr-2" />
                        Identify Ingredients
                      </>
                    )}
                  </Button>
                )}

                {!isRecording && !transcript && (
                  <div className="w-full space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      or type what&apos;s in your fridge
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="chicken, rice, cheese..."
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && transcript) analyzeVoice()
                        }}
                      />
                      <Button
                        onClick={analyzeVoice}
                        disabled={!transcript || isAnalyzing}
                        size="icon"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Photo tab */}
            {activeTab === 'photo' && (
              <div className="flex flex-col items-center space-y-4 py-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handlePhotoCapture(file)
                  }}
                />

                {isAnalyzing ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 className="size-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Scanning your fridge with AI...
                    </p>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 transition-colors hover:border-primary/40 hover:bg-muted/30"
                  >
                    <Camera className="size-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Take a photo of your fridge
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      or tap to select an image
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// Results/confirmation view with debug panel
function ResultsView({
  items,
  onRemoveItem,
  newItem,
  onNewItemChange,
  onAddItem,
  onSave,
  debugInfo,
  enableFilter,
  onEnableFilterChange,
}: {
  items: string[]
  onRemoveItem: (item: string) => void
  newItem: string
  onNewItemChange: (value: string) => void
  onAddItem: () => void
  onSave: () => void
  debugInfo: ScanDebugInfo | null
  enableFilter: boolean
  onEnableFilterChange: (enabled: boolean) => void
}) {
  const [showDebug, setShowDebug] = useState(false)

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Found {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
        {debugInfo && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {debugInfo.clientLatencyMs >= 1000
              ? `${(debugInfo.clientLatencyMs / 1000).toFixed(1)}s`
              : `${debugInfo.clientLatencyMs}ms`}
          </span>
        )}
      </div>

      {/* Ingredient chips */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Badge
                variant="secondary"
                className="gap-1.5 pr-1 py-1 text-sm"
              >
                {item}
                <button
                  onClick={() => onRemoveItem(item)}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add item */}
      <div className="flex gap-2">
        <Input
          placeholder="Add an item..."
          value={newItem}
          onChange={(e) => onNewItemChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAddItem()
          }}
          className="h-9"
        />
        <Button
          onClick={onAddItem}
          disabled={!newItem.trim()}
          size="icon"
          variant="outline"
          className="size-9 shrink-0"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Filter toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Snowflake className={cn(
            'size-4',
            enableFilter ? 'text-green-500' : 'text-muted-foreground'
          )} />
          <span className="text-sm font-medium">Apply as recipe filter</span>
        </div>
        <Switch
          checked={enableFilter}
          onCheckedChange={onEnableFilterChange}
        />
      </div>

      {/* Save CTA */}
      <Button
        onClick={onSave}
        size="lg"
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        disabled={items.length === 0}
      >
        <ChefHat className="size-4 mr-2" />
        Save to Fridge ({items.length} ingredient{items.length !== 1 ? 's' : ''})
      </Button>

      {/* Debug panel */}
      {debugInfo && (
        <DebugPanel debugInfo={debugInfo} open={showDebug} onToggle={() => setShowDebug(!showDebug)} />
      )}
    </div>
  )
}

// Saved confirmation view
function SavedConfirmation({
  itemCount,
  filterEnabled,
  onClose,
  onScanAgain,
}: {
  itemCount: number
  filterEnabled: boolean
  onClose: () => void
  onScanAgain: () => void
}) {
  return (
    <div className="mt-4 flex flex-col items-center space-y-4 py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex size-16 items-center justify-center rounded-full bg-green-500/15"
      >
        <Check className="size-8 text-green-500" />
      </motion.div>

      <div className="text-center space-y-1">
        <p className="text-base font-semibold">
          {itemCount} item{itemCount !== 1 ? 's' : ''} saved to fridge
        </p>
        <p className="text-sm text-muted-foreground">
          {filterEnabled
            ? 'Recipe filter is active — matching recipes are highlighted'
            : 'Items saved but recipe filter is not active'}
        </p>
      </div>

      <div className="flex w-full gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onScanAgain}
        >
          <ScanLine className="size-4 mr-2" />
          Scan Again
        </Button>
        <Button
          className="flex-1"
          onClick={onClose}
        >
          Done
        </Button>
      </div>
    </div>
  )
}

// Collapsible debug panel for scan diagnostics
function DebugPanel({
  debugInfo,
  open,
  onToggle,
}: {
  debugInfo: ScanDebugInfo
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bug className="size-3.5" />
        <span className="font-medium">Scan Debug Info</span>
        <span className="ml-auto">
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 px-3 py-2.5 space-y-2.5 text-xs">
              {/* Overview row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <DebugField icon={<Zap className="size-3" />} label="Type" value={debugInfo.scanType} />
                <DebugField icon={<Cpu className="size-3" />} label="Model" value={debugInfo.model || 'n/a'} />
                <DebugField
                  icon={<Clock className="size-3" />}
                  label="Client"
                  value={`${debugInfo.clientLatencyMs}ms`}
                />
                {debugInfo.apiLatencyMs != null && (
                  <DebugField
                    icon={<Clock className="size-3" />}
                    label="API"
                    value={`${debugInfo.apiLatencyMs}ms`}
                  />
                )}
              </div>

              {/* Token usage */}
              {(debugInfo.inputTokens != null || debugInfo.outputTokens != null) && (
                <div className="flex gap-x-4">
                  {debugInfo.inputTokens != null && (
                    <DebugField label="Input tokens" value={debugInfo.inputTokens.toLocaleString()} />
                  )}
                  {debugInfo.outputTokens != null && (
                    <DebugField label="Output tokens" value={debugInfo.outputTokens.toLocaleString()} />
                  )}
                </div>
              )}

              {/* Scan metadata */}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <DebugField label="Scan ID" value={debugInfo.scanId || 'n/a'} mono />
                <DebugField label="Items" value={String(debugInfo.identifiedCount)} />
                {debugInfo.imageSize && (
                  <DebugField label="Image" value={debugInfo.imageSize} />
                )}
                <DebugField label="Time" value={new Date(debugInfo.timestamp).toLocaleTimeString()} />
              </div>

              {/* Raw transcript */}
              {debugInfo.rawTranscript && (
                <div>
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">
                    Raw Transcript
                  </p>
                  <pre className="rounded-md bg-background/80 border border-border/30 px-2 py-1.5 text-[11px] font-mono whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                    {debugInfo.rawTranscript}
                  </pre>
                </div>
              )}

              {/* Raw AI response */}
              {debugInfo.rawResponse && (
                <div>
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">
                    Raw AI Response
                  </p>
                  <pre className="rounded-md bg-background/80 border border-border/30 px-2 py-1.5 text-[11px] font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    {debugInfo.rawResponse}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DebugField({
  icon,
  label,
  value,
  mono = false,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      {icon}
      <span className="text-muted-foreground/70">{label}:</span>
      <span className={cn('text-foreground', mono && 'font-mono text-[10px]')}>{value}</span>
    </span>
  )
}

// Trigger button for use in recipe list
export function FridgeScanButton({ onClick }: { onClick: () => void }) {
  const nativeBridge = hasNativeBridge()

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-9 shrink-0 rounded-lg"
      onClick={() => {
        if (nativeBridge) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(window as any).webkit.messageHandlers.petehome.postMessage({
            action: 'openFridgeScanner',
          })
        } else {
          onClick()
        }
      }}
      title="Scan your fridge"
    >
      <ScanLine className="size-4" />
    </Button>
  )
}

// Canvas-based image compression for desktop fallback
async function compressImageFile(
  file: File,
  maxDimension: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > maxDimension || height > maxDimension) {
          const scale = Math.min(maxDimension / width, maxDimension / height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const base64 = dataUrl.split(',')[1] ?? ''
        resolve(base64)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
