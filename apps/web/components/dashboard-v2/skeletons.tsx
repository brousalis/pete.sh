'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function CommandBarSkeleton() {
  return (
    <div className="bg-card/80 backdrop-blur-md border-b border-border/50">
      <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-40 hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-6" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="size-6" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 hidden sm:block" />
        </div>
      </div>
      <div className="h-[2px] bg-muted/20" />
    </div>
  )
}

export function WeekHorizonSkeleton() {
  return (
    <div className="bg-card/60 border-b border-border/40">
      <div className="grid grid-cols-7 gap-1 px-2 py-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 px-2 py-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-4 w-12 rounded-full" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-6" />
            <div className="flex gap-1">
              <Skeleton className="size-1.5 rounded-full" />
              <Skeleton className="size-1.5 rounded-full" />
              <Skeleton className="size-1.5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 pb-2">
        <Skeleton className="h-1 w-full rounded-full" />
      </div>
    </div>
  )
}

export function WorkoutStageSkeleton() {
  return (
    <div className="bg-card ring-1 ring-border/50 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="px-5 py-2">
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <div className="px-5 py-3">
        <Skeleton className="h-10 w-full mb-2" />
      </div>
      <div className="px-5 space-y-3">
        {[72, 65, 80, 60, 75].map((w, i) => (
          <div key={i} className="flex items-start gap-3 py-3">
            <Skeleton className="size-5 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-4 mb-1" style={{ width: `${w}%` }} />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ContextPanelSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Progress ring */}
      <div className="bg-card ring-1 ring-border/50 rounded-xl p-4 flex justify-center">
        <Skeleton className="size-28 rounded-full" />
      </div>
      {/* Meal */}
      <div className="bg-card ring-1 ring-border/50 rounded-xl overflow-hidden">
        <Skeleton className="h-32 w-full" />
        <div className="p-4">
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      {/* Shopping */}
      <div className="bg-card ring-1 ring-border/50 rounded-xl p-4">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-1.5 w-full rounded-full mb-3" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      {/* Events */}
      <div className="bg-card ring-1 ring-border/50 rounded-xl p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

export function DayFlowRailSkeleton() {
  return (
    <div className="hidden md:flex flex-col bg-card/40 border-r border-border/30 px-4 py-4">
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
