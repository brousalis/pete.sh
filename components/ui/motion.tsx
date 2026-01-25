'use client'

/**
 * Motion Components
 *
 * Reusable animated components built on Framer Motion for consistent,
 * delightful animations throughout the app.
 */

import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'
import {
  fadeUpVariants,
  fadeVariants,
  scaleFadeVariants,
  staggerContainerVariants,
  staggerItemVariants,
  cardMotionProps,
  pageVariants,
  slideInRightVariants,
  slideInLeftVariants,
  listItemVariants,
  transitions,
} from '@/lib/animations'
import { cn } from '@/lib/utils'

// ============================================================================
// ANIMATED CONTAINERS
// ============================================================================

interface AnimatedContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  className?: string
  delay?: number
}

/**
 * FadeIn - Simple fade animation
 */
export const FadeIn = forwardRef<HTMLDivElement, AnimatedContainerProps>(
  ({ children, className, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeVariants}
      style={{ transitionDelay: `${delay}s` }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
)
FadeIn.displayName = 'FadeIn'

/**
 * FadeUp - Fade in with upward motion
 */
export const FadeUp = forwardRef<HTMLDivElement, AnimatedContainerProps>(
  ({ children, className, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeUpVariants}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
)
FadeUp.displayName = 'FadeUp'

/**
 * ScaleFade - Scale and fade animation (great for modals, cards)
 */
export const ScaleFade = forwardRef<HTMLDivElement, AnimatedContainerProps>(
  ({ children, className, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={scaleFadeVariants}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
)
ScaleFade.displayName = 'ScaleFade'

/**
 * SlideInRight - Slide in from right
 */
export const SlideInRight = forwardRef<HTMLDivElement, AnimatedContainerProps>(
  ({ children, className, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={slideInRightVariants}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
)
SlideInRight.displayName = 'SlideInRight'

/**
 * SlideInLeft - Slide in from left
 */
export const SlideInLeft = forwardRef<HTMLDivElement, AnimatedContainerProps>(
  ({ children, className, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={slideInLeftVariants}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
)
SlideInLeft.displayName = 'SlideInLeft'

// ============================================================================
// STAGGER ANIMATIONS
// ============================================================================

interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  className?: string
  staggerDelay?: number
}

/**
 * StaggerContainer - Parent container for staggered children
 */
export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, className, staggerDelay, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={
        staggerDelay
          ? {
              ...staggerContainerVariants,
              visible: {
                ...staggerContainerVariants.visible,
                transition: {
                  when: 'beforeChildren',
                  staggerChildren: staggerDelay,
                  delayChildren: 0.1,
                },
              },
            }
          : staggerContainerVariants
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
)
StaggerContainer.displayName = 'StaggerContainer'

/**
 * StaggerItem - Child item for staggered animations
 */
export const StaggerItem = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerItemVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
)
StaggerItem.displayName = 'StaggerItem'

/**
 * StaggerList - Convenience wrapper for lists with staggered items
 */
interface StaggerListProps {
  children: ReactNode
  className?: string
  itemClassName?: string
  staggerDelay?: number
}

export function StaggerList({
  children,
  className,
  itemClassName,
  staggerDelay = 0.06,
}: StaggerListProps) {
  const items = Array.isArray(children) ? children : [children]

  return (
    <StaggerContainer className={className} staggerDelay={staggerDelay}>
      {items.map((child, index) => (
        <StaggerItem key={index} className={itemClassName}>
          {child}
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}

// ============================================================================
// PAGE TRANSITIONS
// ============================================================================

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * PageTransition - Wrap page content for smooth route transitions
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * PageWrapper - AnimatePresence wrapper for page transitions
 * Use in layout files to enable exit animations
 */
interface PageWrapperProps {
  children: ReactNode
  routeKey: string
}

export function PageWrapper({ children, routeKey }: PageWrapperProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// INTERACTIVE COMPONENTS
// ============================================================================

interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  className?: string
  disableHover?: boolean
}

/**
 * AnimatedCard - Card with hover lift effect
 */
export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, disableHover = false, ...props }, ref) => {
    const hoverProps = disableHover ? {} : cardMotionProps
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        {...hoverProps}
        transition={transitions.smooth}
        className={cn(
          'bg-card ring-border rounded-2xl p-5 shadow-sm ring-1',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
AnimatedCard.displayName = 'AnimatedCard'

/**
 * AnimatedListItem - List item with hover effect
 */
export const AnimatedListItem = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={listItemVariants}
      whileHover={{ x: 4, backgroundColor: 'var(--accent)' }}
      transition={transitions.spring}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
)
AnimatedListItem.displayName = 'AnimatedListItem'

// ============================================================================
// PRESENCE ANIMATIONS
// ============================================================================

interface AnimatePresenceWrapperProps {
  children: ReactNode
  show: boolean
  mode?: 'wait' | 'sync' | 'popLayout'
}

/**
 * PresenceWrapper - Conditional rendering with animations
 */
export function PresenceWrapper({
  children,
  show,
  mode = 'wait',
}: AnimatePresenceWrapperProps) {
  return (
    <AnimatePresence mode={mode}>
      {show && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={fadeUpVariants}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

interface AnimatedSkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
}

/**
 * AnimatedSkeleton - Pulsing skeleton loader
 */
export function AnimatedSkeleton({
  className,
  width,
  height,
}: AnimatedSkeletonProps) {
  return (
    <motion.div
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={cn('bg-muted rounded-md', className)}
      style={{ width, height }}
    />
  )
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { motion, AnimatePresence }
export type { HTMLMotionProps }
