'use client'

import { Button } from '@/components/ui/button'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'

function formatMs(ms: number): string {
  const totalCs = Math.floor(ms / 10)
  const cs = totalCs % 100
  const totalSec = Math.floor(totalCs / 100)
  const s = totalSec % 60
  const totalMin = Math.floor(totalSec / 60)
  const m = totalMin % 60
  const h = Math.floor(totalMin / 60)
  const pad2 = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}.${pad2(cs)}`
  return `${m}:${pad2(s)}.${pad2(cs)}`
}

export default function StopwatchPage() {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const origin = Date.now() - elapsedMs
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - origin)
    }, 50)
    return () => clearInterval(id)
  }, [running])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-10 px-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Timer className="size-5" />
        <span className="text-sm font-medium tracking-wide">Stopwatch</span>
      </div>
      <div className="tabular-nums text-5xl font-semibold tracking-tight sm:text-7xl">
        {formatMs(elapsedMs)}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          className="min-w-32"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? (
            <>
              <Pause className="mr-2 size-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 size-4" />
              Start
            </>
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="min-w-32"
          onClick={() => {
            setRunning(false)
            setElapsedMs(0)
          }}
        >
          <RotateCcw className="mr-2 size-4" />
          Reset
        </Button>
      </div>
    </div>
  )
}
