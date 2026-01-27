"use client"

import { useCallback, useRef, useState } from "react"

type SoundType = "start" | "warning" | "tick" | "complete"

interface UseAudioTimerOptions {
  /** Whether audio is muted by default */
  defaultMuted?: boolean
}

interface UseAudioTimerReturn {
  /** Play a specific sound type */
  playSound: (type: SoundType) => void
  /** Whether audio is muted */
  isMuted: boolean
  /** Toggle mute state */
  toggleMute: () => void
  /** Set mute state directly */
  setMuted: (muted: boolean) => void
  /** Initialize audio context (call on user interaction) */
  initAudio: () => AudioContext | null
}

/**
 * useAudioTimer - A hook for playing timer-related audio cues using Web Audio API.
 * 
 * Uses Web Audio API to generate sounds programmatically, avoiding the need for
 * external audio files. Works on iOS Safari when initialized from a user interaction.
 * 
 * Sound types:
 * - start: Short high beep when timer starts
 * - warning: Medium beep at 10 seconds and final countdown
 * - tick: Very short tick for each second (optional)
 * - complete: Pleasant ascending chime on completion
 */
export function useAudioTimer(options: UseAudioTimerOptions = {}): UseAudioTimerReturn {
  const { defaultMuted = false } = options
  
  const [isMuted, setIsMuted] = useState(defaultMuted)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context - must be called from user interaction for iOS Safari
  const initAudio = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null
    
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || 
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioContextRef.current = new AudioContextClass()
      } catch {
        console.warn("Web Audio API not available")
        return null
      }
    }
    
    // Resume if suspended (required for iOS Safari)
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume()
    }
    
    return audioContextRef.current
  }, [])

  // Play a beep with specified parameters
  const playBeep = useCallback((
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.3
  ) => {
    const ctx = audioContextRef.current
    if (!ctx || isMuted) return

    try {
      // Resume context if suspended
      if (ctx.state === "suspended") {
        ctx.resume()
      }

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = type

      // Fade out to avoid clicks
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch {
      // Fail silently if audio can't play
    }
  }, [isMuted])

  // Play specific sound types
  const playSound = useCallback((type: SoundType) => {
    if (isMuted) return

    switch (type) {
      case "start":
        // High-pitched short beep
        playBeep(880, 0.12, "sine", 0.25)
        break
        
      case "warning":
        // Medium beep for warnings
        playBeep(660, 0.1, "sine", 0.2)
        break
        
      case "tick":
        // Very short, quiet tick
        playBeep(440, 0.05, "sine", 0.1)
        break
        
      case "complete":
        // Ascending three-note chime (C-E-G)
        playBeep(523.25, 0.15, "sine", 0.25) // C5
        setTimeout(() => playBeep(659.25, 0.15, "sine", 0.25), 150) // E5
        setTimeout(() => playBeep(783.99, 0.25, "sine", 0.25), 300) // G5
        break
    }
  }, [isMuted, playBeep])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted)
  }, [])

  return {
    playSound,
    isMuted,
    toggleMute,
    setMuted,
    initAudio,
  }
}
