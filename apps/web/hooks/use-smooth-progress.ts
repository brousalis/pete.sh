'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Client-side smooth progress for playback.
 * Interpolates between poll responses so the bar doesn't jump every 3–5s.
 *
 * @param isPlaying - whether track is currently playing
 * @param progressMs - last known progress from API (ms)
 * @param durationMs - track duration (ms)
 * @returns progress as 0–100
 */
export function useSmoothProgress(
  isPlaying: boolean,
  progressMs: number,
  durationMs: number
): number {
  const [progress, setProgress] = useState(0)

  // Baseline from last API update: we advance from this in real time
  const baselineRef = useRef({ progressMs: 0, durationMs: 0, receivedAt: 0 })

  // Sync baseline when API data changes (new poll or new track)
  useEffect(() => {
    if (durationMs <= 0) return
    baselineRef.current = {
      progressMs,
      durationMs,
      receivedAt: Date.now(),
    }
    setProgress((progressMs / durationMs) * 100)
  }, [progressMs, durationMs])

  // When playing, advance progress on a short interval so the bar moves smoothly
  useEffect(() => {
    if (!isPlaying || durationMs <= 0) return

    const tick = () => {
      const { progressMs: baseMs, durationMs: dur, receivedAt } = baselineRef.current
      const elapsed = Date.now() - receivedAt
      const currentMs = Math.min(baseMs + elapsed, dur)
      const pct = (currentMs / dur) * 100
      setProgress(pct)
    }

    tick()
    const intervalId = setInterval(tick, 100)

    return () => clearInterval(intervalId)
  }, [isPlaying, durationMs])

  return Math.min(100, Math.max(0, progress))
}
