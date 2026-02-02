/**
 * petehome Animation System
 *
 * A comprehensive animation library using Framer Motion for fluid,
 * delightful interactions across the entire application.
 */

import type { Transition, Variants } from 'framer-motion'

// ============================================================================
// TIMING & EASING
// ============================================================================

/**
 * Consistent easing curves for natural-feeling animations
 */
export const easings = {
  // Smooth, natural easing for most animations
  smooth: [0.4, 0, 0.2, 1],
  // Snappy easing for interactive elements
  snappy: [0.4, 0, 0.6, 1],
  // Bounce effect for playful interactions
  bounce: [0.68, -0.55, 0.265, 1.55],
  // Gentle ease out for exits
  gentleOut: [0, 0, 0.2, 1],
  // Anticipation for dramatic effects
  anticipate: [0.68, -0.6, 0.32, 1.6],
} as const

/**
 * Standard durations for consistency
 */
export const durations = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const

/**
 * Common transition presets
 */
export const transitions = {
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
  },
  springBouncy: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
  },
  springGentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
  },
  smooth: {
    duration: durations.normal,
    ease: easings.smooth,
  },
  snappy: {
    duration: durations.fast,
    ease: easings.snappy,
  },
} as const satisfies Record<string, Transition>

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

/**
 * Fade animations
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.fast, ease: easings.gentleOut },
  },
}

/**
 * Fade up animations - great for content appearing
 */
export const fadeUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: durations.fast,
      ease: easings.gentleOut,
    },
  },
}

/**
 * Fade down animations - good for dropdowns
 */
export const fadeDownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: durations.fast },
  },
}

/**
 * Scale fade - for modals, cards, popovers
 */
export const scaleFadeVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: durations.fast },
  },
}

/**
 * Slide in from right
 */
export const slideInRightVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: { duration: durations.fast },
  },
}

/**
 * Slide in from left
 */
export const slideInLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: { duration: durations.fast },
  },
}

/**
 * Page transition variants
 */
export const pageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.smooth,
      when: 'beforeChildren',
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: easings.gentleOut,
    },
  },
}

/**
 * Stagger container - use as parent for staggered children
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      when: 'afterChildren',
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
}

/**
 * Stagger item - use as children of stagger container
 */
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: durations.fast },
  },
}

/**
 * Card hover variants
 */
export const cardHoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: transitions.springGentle,
  },
  hover: {
    scale: 1.01,
    y: -2,
    transition: transitions.spring,
  },
  tap: {
    scale: 0.99,
    transition: { duration: durations.instant },
  },
}

/**
 * Button hover variants
 */
export const buttonHoverVariants: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: transitions.spring,
  },
  tap: {
    scale: 0.97,
    transition: { duration: durations.instant },
  },
}

/**
 * Icon button variants - slightly more dramatic
 */
export const iconButtonVariants: Variants = {
  rest: {
    scale: 1,
    rotate: 0,
  },
  hover: {
    scale: 1.1,
    transition: transitions.spring,
  },
  tap: {
    scale: 0.9,
    transition: { duration: durations.instant },
  },
}

/**
 * List item variants
 */
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -12,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.smooth,
  },
  exit: {
    opacity: 0,
    x: 12,
    transition: { duration: durations.fast },
  },
}

/**
 * Expand/collapse variants
 */
export const expandVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: durations.normal, ease: easings.smooth },
      opacity: { duration: durations.fast },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: durations.normal, ease: easings.smooth },
      opacity: { duration: durations.normal, delay: 0.1 },
    },
  },
}

/**
 * Skeleton pulse animation variant
 */
export const skeletonVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * Notification/toast entry
 */
export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.springBouncy,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: durations.fast },
  },
}

/**
 * Drawer/sheet from bottom
 */
export const drawerVariants: Variants = {
  hidden: {
    y: '100%',
  },
  visible: {
    y: 0,
    transition: transitions.springGentle,
  },
  exit: {
    y: '100%',
    transition: { duration: durations.normal, ease: easings.smooth },
  },
}

/**
 * Sidebar slide variants
 */
export const sidebarVariants: Variants = {
  hidden: {
    x: '-100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitions.springGentle,
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: { duration: durations.normal },
  },
}

/**
 * Overlay/backdrop variants
 */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.normal },
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.fast },
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create stagger delay for manual staggering
 */
export function getStaggerDelay(index: number, baseDelay = 0.05): number {
  return index * baseDelay
}

/**
 * Create a custom stagger container with configurable timing
 */
export function createStaggerContainer(
  staggerDelay = 0.06,
  initialDelay = 0.1
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: 'beforeChildren',
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        when: 'afterChildren',
        staggerChildren: staggerDelay / 2,
        staggerDirection: -1,
      },
    },
  }
}

/**
 * Create custom fade up with specific offset
 */
export function createFadeUp(
  yOffset = 16,
  duration = durations.normal
): Variants {
  return {
    hidden: { opacity: 0, y: yOffset },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: easings.smooth },
    },
    exit: {
      opacity: 0,
      y: -yOffset / 2,
      transition: { duration: durations.fast },
    },
  }
}

// ============================================================================
// HOVER ANIMATION PROPS (for motion components)
// ============================================================================

/**
 * Standard button hover animation props
 */
export const buttonMotionProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: transitions.spring,
} as const

/**
 * Subtle button hover (for smaller buttons)
 */
export const subtleButtonMotionProps = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.99 },
  transition: transitions.spring,
} as const

/**
 * Icon hover animation props
 */
export const iconMotionProps = {
  whileHover: { scale: 1.1 },
  whileTap: { scale: 0.9 },
  transition: transitions.spring,
} as const

/**
 * Card hover animation props
 */
export const cardMotionProps = {
  whileHover: { y: -2, scale: 1.01 },
  whileTap: { scale: 0.99 },
  transition: transitions.springGentle,
} as const

/**
 * List item hover props
 */
export const listItemMotionProps = {
  whileHover: { x: 4 },
  transition: transitions.spring,
} as const
