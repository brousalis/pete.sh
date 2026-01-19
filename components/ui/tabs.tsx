"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { fadeUpVariants, transitions } from "@/lib/animations"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

interface TabsListProps extends React.ComponentProps<typeof TabsPrimitive.List> {
  /** ID for layoutId to enable animated indicator */
  layoutId?: string
}

function TabsList({
  className,
  layoutId,
  ...props
}: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-layout-id={layoutId}
      className={cn(
        "bg-muted text-muted-foreground relative inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  )
}

interface TabsTriggerProps extends React.ComponentProps<typeof TabsPrimitive.Trigger> {
  /** Layout ID for the animated active indicator */
  layoutId?: string
}

function TabsTrigger({
  className,
  layoutId,
  children,
  ...props
}: TabsTriggerProps) {
  const [isActive, setIsActive] = React.useState(false)
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const checkActive = () => {
      if (ref.current) {
        setIsActive(ref.current.getAttribute('data-state') === 'active')
      }
    }
    checkActive()
    
    // Use MutationObserver to watch for data-state changes
    const observer = new MutationObserver(checkActive)
    if (ref.current) {
      observer.observe(ref.current, { attributes: true, attributeFilter: ['data-state'] })
    }
    return () => observer.disconnect()
  }, [])

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground dark:text-muted-foreground relative z-10 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {layoutId && isActive && (
        <motion.span
          layoutId={layoutId}
          className="bg-background dark:bg-input/30 dark:border-input absolute inset-0 z-[-1] rounded-md border shadow-sm"
          transition={transitions.springGentle}
        />
      )}
      {children}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      asChild
      {...props}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={fadeUpVariants}
      >
        {props.children}
      </motion.div>
    </TabsPrimitive.Content>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
