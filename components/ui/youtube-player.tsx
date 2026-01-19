"use client"

import { useState } from "react"
import { Play, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface YouTubePlayerProps {
  videoId: string
  title?: string
  className?: string
  /** Controlled open state - parent manages this */
  isOpen: boolean
  /** Callback when user clicks to toggle - parent should update isOpen */
  onToggle: () => void
  /** Compact mode - smaller trigger button for inline display */
  compact?: boolean
  /** Ultra-compact mode - minimal size for narrow panels (sidebar use) */
  ultraCompact?: boolean
  /** Hide the trigger button entirely (for externally managed display) */
  hideTrigger?: boolean
}

/**
 * A lightweight, collapsible YouTube video player component.
 * Fully controlled - parent manages open/close state.
 * Shows a compact trigger button by default, expands to show the video player.
 * Uses lazy loading - the iframe only loads when first expanded.
 */
export function YouTubePlayer({ 
  videoId, 
  title, 
  className,
  isOpen,
  onToggle,
  compact = false,
  ultraCompact = false,
  hideTrigger = false,
}: YouTubePlayerProps) {
  // Track if video has ever been loaded (for lazy loading)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Load iframe once opened for the first time
  if (isOpen && !hasLoaded) {
    setHasLoaded(true)
  }

  const shouldLoadIframe = isOpen || hasLoaded

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`

  return (
    <div 
      className={cn(
        "transition-all duration-300 ease-out",
        className
      )}
      data-video-open={isOpen}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={onToggle}
        className="w-full"
      >
        {!hideTrigger && (
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "group flex w-full items-center gap-2 rounded-lg",
                ultraCompact ? "px-1.5 py-1" : compact ? "px-2 py-1.5" : "px-3 py-2",
                "bg-gradient-to-r from-red-500/10 to-red-600/5",
                "border border-red-500/20 hover:border-red-500/40",
                "text-red-600 dark:text-red-400",
                ultraCompact ? "text-[10px]" : compact ? "text-xs" : "text-sm font-medium",
                "transition-all duration-200 ease-out",
                "hover:from-red-500/15 hover:to-red-600/10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center rounded-full bg-red-500/20 transition-colors group-hover:bg-red-500/30",
                ultraCompact ? "size-4" : compact ? "size-5" : "size-7"
              )}>
                <Play className={cn("fill-current", ultraCompact ? "size-2" : compact ? "size-2.5" : "size-3.5")} />
              </div>
              <span className="flex-1 text-left">
                {isOpen ? "Hide" : "Demo"}
              </span>
              {isOpen ? (
                <ChevronUp className={cn("transition-transform", ultraCompact ? "size-2.5" : compact ? "size-3" : "size-4")} />
              ) : (
                <ChevronDown className={cn("transition-transform", ultraCompact ? "size-2.5" : compact ? "size-3" : "size-4")} />
              )}
            </button>
          </CollapsibleTrigger>
        )}

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <div className={cn(ultraCompact ? "pt-1" : "pt-2")}>
            <div 
              className={cn(
                "relative overflow-hidden rounded-lg border border-border/50 bg-black shadow-lg",
                "transition-all duration-300 ease-out",
                isOpen && !ultraCompact && "ring-2 ring-red-500/30",
                ultraCompact && "rounded-md"
              )}
            >
              {/* Aspect Ratio Container - 16:9 standard, 4:3 for ultra-compact */}
              <div 
                className="relative w-full" 
                style={{ paddingBottom: ultraCompact ? "75%" : "56.25%" }}
              >
                {shouldLoadIframe ? (
                  <iframe
                    className="absolute inset-0 size-full"
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    title={title || "Exercise demonstration video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  // Thumbnail placeholder (shown before lazy load)
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <img
                      src={thumbnailUrl}
                      alt={title || "Video thumbnail"}
                      className="size-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className={cn(
                        "flex items-center justify-center rounded-full bg-red-600 shadow-lg",
                        ultraCompact ? "size-8" : "size-12"
                      )}>
                        <Play className={cn(
                          "ml-0.5 fill-white text-white",
                          ultraCompact ? "size-4" : "size-6"
                        )} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with YouTube link - hidden in ultra-compact mode */}
            {!ultraCompact && (
              <div className="mt-1.5 flex items-center justify-end">
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span>YouTube</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
