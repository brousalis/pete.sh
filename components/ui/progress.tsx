"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { transitions } from "@/lib/animations"

function Progress({
  className,
  value,
  animated = true,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  animated?: boolean
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1"
        asChild
      >
        <motion.div
          initial={animated ? { x: '-100%' } : false}
          animate={{ x: `-${100 - (value || 0)}%` }}
          transition={animated ? transitions.springGentle : { duration: 0 }}
        />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
