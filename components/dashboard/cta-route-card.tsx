"use client"

import { Bus, Train, Clock, AlertCircle } from "lucide-react"
import type { CTABusPrediction } from "@/lib/types/cta.types"

interface CTARouteCardProps {
  route: string
  type: "bus" | "train"
  predictions: CTABusPrediction[]
  error?: string
}

export function CTARouteCard({ route, type, predictions, error }: CTARouteCardProps) {
  if (error) {
    return (
      <div className="rounded-xl bg-background p-4 ring-1 ring-border">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-4" />
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  const Icon = type === "bus" ? Bus : Train

  return (
    <div className="rounded-xl bg-background p-4 ring-1 ring-border">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-5 text-brand" />
        <span className="font-semibold text-foreground">{type === "bus" ? `Bus ${route}` : `${route} Line`}</span>
      </div>
      {predictions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No predictions available</p>
      ) : (
        <div className="space-y-2">
          {predictions.slice(0, 3).map((pred, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-foreground">
                {pred.prdctdn === "DUE" ? "Due" : `${pred.prdctdn} min`}
              </span>
              <span className="text-muted-foreground text-xs">to {pred.stpnm}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
