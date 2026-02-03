'use client'

/**
 * Page Transition Component
 *
 * Provides smooth animated transitions between routes using Framer Motion.
 * Wrap your page content with this component for fade/slide animations.
 */

import { transitions } from '@/lib/animations'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface PageTransitionProviderProps {
  children: ReactNode
  className?: string
}

// Simple, robust page transition variants that don't depend on children
const simplePageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: [0, 0, 0.2, 1] as const },
  },
}

/**
 * PageTransitionProvider - Wraps content for route change animations
 *
 * Usage in layout.tsx:
 * ```tsx
 * <PageTransitionProvider>
 *   {children}
 * </PageTransitionProvider>
 * ```
 */
export function PageTransitionProvider({
  children,
  className,
}: PageTransitionProviderProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={simplePageVariants}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Simpler page fade - just fades content in/out
 */
export function PageFade({ children, className }: PageTransitionProviderProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transitions.smooth}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * PageContent - Animate page content on mount (no exit animation)
 * Use this when you want initial animation but not exit animations
 */
export function PageContent({
  children,
  className,
}: PageTransitionProviderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.smooth}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * FrozenContent - Keeps children mounted during route changes
 * Useful for persistent UI elements that shouldn't unmount
 */
interface FrozenContentProps {
  children: ReactNode
  freeze?: boolean
}

export function FrozenContent({ children, freeze = true }: FrozenContentProps) {
  if (!freeze) return <>{children}</>

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0 }}
    >
      {children}
    </motion.div>
  )
}
