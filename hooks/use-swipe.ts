/**
 * useSwipe Hook
 * Detects horizontal swipe gestures for touch navigation
 */

import { useRef, useCallback } from "react"

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
}

const SWIPE_THRESHOLD = 50 // Minimum distance for a swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3 // Minimum velocity (px/ms)
const SWIPE_MAX_VERTICAL_RATIO = 0.75 // Max ratio of vertical to horizontal movement

export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const touchRef = useRef<TouchState | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchRef.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchRef.current.startX
      const deltaY = touch.clientY - touchRef.current.startY
      const deltaTime = Date.now() - touchRef.current.startTime

      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)
      const velocity = absDeltaX / deltaTime

      // Check if this is a valid horizontal swipe
      const isHorizontalSwipe =
        absDeltaX >= SWIPE_THRESHOLD &&
        velocity >= SWIPE_VELOCITY_THRESHOLD &&
        absDeltaY / absDeltaX <= SWIPE_MAX_VERTICAL_RATIO

      if (isHorizontalSwipe) {
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      }

      touchRef.current = null
    },
    [onSwipeLeft, onSwipeRight]
  )

  const handleTouchCancel = useCallback(() => {
    touchRef.current = null
  }, [])

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  }
}
