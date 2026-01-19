'use client'

/**
 * Animation Hooks
 *
 * Custom React hooks for common animation patterns.
 */

import { useReducedMotion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

/**
 * Returns true if user prefers reduced motion.
 * Use this to disable animations for accessibility.
 */
export function useReducedMotionPreference(): boolean {
  const prefersReducedMotion = useReducedMotion()
  return prefersReducedMotion ?? false
}

/**
 * Returns animation props based on reduced motion preference.
 * If reduced motion is preferred, returns empty object.
 */
export function useAnimationProps<T extends Record<string, unknown>>(
  animationProps: T
): T | Record<string, never> {
  const prefersReducedMotion = useReducedMotion()
  return prefersReducedMotion ? {} : animationProps
}

/**
 * Hook for triggering animation when element enters viewport.
 * Returns ref to attach to element and boolean indicating if in view.
 */
export function useAnimateOnView(options?: {
  once?: boolean
  amount?: number | 'some' | 'all'
  margin?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: options?.once ?? true,
    amount: options?.amount ?? 0.2,
    margin: options?.margin,
  })

  return { ref, isInView }
}

/**
 * Hook for staggered animation with delay calculation.
 * Returns delay value based on index.
 */
export function useStaggerDelay(
  index: number,
  baseDelay = 0.05,
  maxDelay = 0.5
): number {
  return Math.min(index * baseDelay, maxDelay)
}

/**
 * Hook for mounting animation state.
 * Returns true when component should animate in.
 */
export function useMountAnimation(delay = 0): boolean {
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldAnimate(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  return shouldAnimate
}

/**
 * Hook for hover state management with animation-friendly timing.
 */
export function useHoverAnimation() {
  const [isHovered, setIsHovered] = useState(false)

  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    onFocus: () => setIsHovered(true),
    onBlur: () => setIsHovered(false),
  }

  return { isHovered, hoverProps }
}

/**
 * Hook for press/active state management.
 */
export function usePressAnimation() {
  const [isPressed, setIsPressed] = useState(false)

  const pressProps = {
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onMouseLeave: () => setIsPressed(false),
    onTouchStart: () => setIsPressed(true),
    onTouchEnd: () => setIsPressed(false),
  }

  return { isPressed, pressProps }
}
