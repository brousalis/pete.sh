import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-line bg-surface-2 text-ink-1 placeholder:text-ink-3",
        "flex field-sizing-content min-h-24 w-full rounded-control border px-3 py-2.5 text-base shadow-xs transition-[color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation sm:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
