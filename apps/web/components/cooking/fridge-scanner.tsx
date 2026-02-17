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
import { useCooking } from '@/hooks/use-cooking-data'
import { apiPost, apiPut } from '@/lib/api/client'
import type { FridgeScan } from '@/lib/types/cooking.types'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Camera,
    ChefHat,
    Loader2,
    Mic,
    MicOff,
    Plus,
    ScanLine,
    Sparkles,
    X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Detect native iOS bridge
function hasNativeBridge(): boolean {
  if (typeof window === 'undefined') return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).webkit?.messageHandlers?.petehome
}

interface FridgeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ScanTab = 'voice' | 'photo'

export function FridgeScanner({ open, onOpenChange }: FridgeScannerProps) {
  const { setFridgeIngredients, setFridgeFilterActive } = useCooking()

  const [activeTab, setActiveTab] = useState<ScanTab>('voice')
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [items, setItems] = useState<string[]>([])
  const [scanId, setScanId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [showResults, setShowResults] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Register native bridge callback
  useEffect(() => {
    if (typeof window === 'undefined') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__onFridgeScanComplete = (result: { items: string[]; scanId: string }) => {
      setItems(result.items)
      setScanId(result.scanId)
      setShowResults(true)
      setIsAnalyzing(false)
      onOpenChange(true)
    }

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__onFridgeScanComplete
    }
  }, [onOpenChange])

  // Open native scanner if bridge exists
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

  // Reset state
  const resetState = useCallback(() => {
    setIsRecording(false)
    setTranscript('')
    setIsAnalyzing(false)
    setItems([])
    setScanId(null)
    setError(null)
    setNewItem('')
    setShowResults(false)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
  }, [])

  // Voice recording (Web Speech API fallback for desktop)
  const startRecording = useCallback(() => {
    setError(null)
    setTranscript('')
    setItems([])
    setScanId(null)
    setShowResults(false)

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

    const response = await apiPost<FridgeScan>('/api/cooking/fridge-scan', {
      type: 'voice',
      transcript,
    })

    if (response.success && response.data) {
      setItems(response.data.identified_items)
      setScanId(response.data.id)
      setShowResults(true)
    } else {
      setError(response.error || 'Failed to analyze transcript')
    }
    setIsAnalyzing(false)
  }, [transcript])

  // Photo handling (desktop fallback with canvas compression)
  const handlePhotoCapture = useCallback(async (file: File) => {
    setIsAnalyzing(true)
    setError(null)
    setItems([])
    setScanId(null)
    setShowResults(false)

    try {
      const base64 = await compressImageFile(file, 1024, 0.7)

      const response = await apiPost<FridgeScan>('/api/cooking/fridge-scan', {
        type: 'photo',
        image: base64,
      })

      if (response.success && response.data) {
        setItems(response.data.identified_items)
        setScanId(response.data.id)
        setShowResults(true)
      } else {
        setError(response.error || 'Failed to analyze photo')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image')
    }

    setIsAnalyzing(false)
  }, [])

  // Remove item
  const removeItem = useCallback((item: string) => {
    setItems((prev) => prev.filter((i) => i !== item))
  }, [])

  // Add custom item
  const addItem = useCallback(() => {
    const trimmed = newItem.trim().toLowerCase()
    if (trimmed && !items.includes(trimmed)) {
      setItems((prev) => [...prev, trimmed])
      setNewItem('')
    }
  }, [newItem, items])

  // Confirm and find recipes
  const confirmAndFindRecipes = useCallback(async () => {
    if (scanId) {
      await apiPut(`/api/cooking/fridge-scan/${scanId}`, {
        confirmed_items: items,
        recipes_matched: 0,
      })
    }
    setFridgeIngredients(items)
    setFridgeFilterActive(true)
    onOpenChange(false)
    resetState()
  }, [scanId, items, setFridgeIngredients, setFridgeFilterActive, onOpenChange, resetState])

  // If native bridge detected, just trigger native scanner
  if (hasNativeBridge() && !showResults) {
    // The scanner UI is native — only show results in web
    return (
      <Sheet open={open && showResults} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Fridge Scan Results</SheetTitle>
            <SheetDescription>
              Review and confirm the items found in your fridge
            </SheetDescription>
          </SheetHeader>
          <ResultsView
            items={items}
            onRemoveItem={removeItem}
            newItem={newItem}
            onNewItemChange={setNewItem}
            onAddItem={addItem}
            onConfirm={confirmAndFindRecipes}
          />
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

        {showResults ? (
          <ResultsView
            items={items}
            onRemoveItem={removeItem}
            newItem={newItem}
            onNewItemChange={setNewItem}
            onAddItem={addItem}
            onConfirm={confirmAndFindRecipes}
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
                {/* Mic button */}
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

                {/* Live transcript */}
                {transcript && (
                  <div className="w-full rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Transcript
                    </p>
                    <p className="text-sm">{transcript}</p>
                  </div>
                )}

                {/* Analyze button */}
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

                {/* Manual text fallback */}
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
                  <>
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
                  </>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// Shared results/confirmation view
function ResultsView({
  items,
  onRemoveItem,
  newItem,
  onNewItemChange,
  onAddItem,
  onConfirm,
}: {
  items: string[]
  onRemoveItem: (item: string) => void
  newItem: string
  onNewItemChange: (value: string) => void
  onAddItem: () => void
  onConfirm: () => void
}) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Found {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
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

      {/* Find Recipes CTA */}
      <Button
        onClick={onConfirm}
        size="lg"
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        disabled={items.length === 0}
      >
        <ChefHat className="size-4 mr-2" />
        Find Recipes ({items.length} ingredient{items.length !== 1 ? 's' : ''})
      </Button>
    </div>
  )
}

// Trigger button for use in recipe list
export function FridgeScanButton({ onClick }: { onClick: () => void }) {
  const nativeBridge = hasNativeBridge()

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-11 shrink-0 rounded-xl"
      onClick={() => {
        if (nativeBridge) {
          // Open native scanner
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

        // Get base64 without the data:image/jpeg;base64, prefix
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
