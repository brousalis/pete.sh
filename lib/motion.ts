/**
 * Motion Barrel Export
 *
 * Single import point for all animation utilities.
 *
 * Usage:
 * ```tsx
 * import { motion, fadeUpVariants, transitions, FadeUp, StaggerContainer } from '@/lib/motion'
 * ```
 */

// Re-export all animation variants and utilities
export * from './animations'

// Re-export framer-motion primitives for convenience
export { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'framer-motion'
export type { Variants, Transition, HTMLMotionProps, MotionProps } from 'framer-motion'

// Re-export animation components
export {
  FadeIn,
  FadeUp,
  ScaleFade,
  SlideInRight,
  SlideInLeft,
  StaggerContainer,
  StaggerItem,
  StaggerList,
  PageTransition,
  PageWrapper,
  AnimatedCard,
  AnimatedListItem,
  PresenceWrapper,
  AnimatedSkeleton,
} from '@/components/ui/motion'

// Re-export animation hooks
export {
  useReducedMotionPreference,
  useAnimationProps,
  useAnimateOnView,
  useStaggerDelay,
  useMountAnimation,
  useHoverAnimation,
  usePressAnimation,
} from '@/hooks/use-animation'

// Re-export page transition components
export {
  PageTransitionProvider,
  PageFade,
  PageContent,
  FrozenContent,
} from '@/components/page-transition'
