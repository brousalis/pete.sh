'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { transitions } from '@/lib/animations'

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: React.ReactNode
  /** Enable hover lift animation */
  animated?: boolean
  /** Disable all animations */
  disableAnimation?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, animated = false, disableAnimation = false, children, ...props }, ref) => {
    const shouldAnimate = animated && !disableAnimation

    return (
      <motion.div
        ref={ref}
        data-slot="card"
        className={cn(
          'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
          shouldAnimate && 'cursor-pointer',
          className
        )}
        initial={disableAnimation ? undefined : { opacity: 0, y: 8 }}
        animate={disableAnimation ? undefined : { opacity: 1, y: 0 }}
        transition={transitions.smooth}
        whileHover={shouldAnimate ? { y: -2, scale: 1.01 } : undefined}
        whileTap={shouldAnimate ? { scale: 0.99 } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className
      )}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

const CardAction = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className
      )}
      {...props}
    />
  )
)
CardAction.displayName = 'CardAction'

const CardContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
}
export type { CardProps }
