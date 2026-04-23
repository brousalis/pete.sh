import { Skeleton } from '@/components/ui/skeleton'

export default function V3Loading() {
  return (
    <div className="-m-3 sm:-m-5 md:-mx-6 md:-my-6 h-[calc(100%+1.5rem)] sm:h-[calc(100%+2.5rem)] md:h-[calc(100%+3rem)]">
      <div className="flex flex-col h-full">
        {/* HUD */}
        <div className="h-12 border-b border-border bg-card/80 backdrop-blur flex items-center px-4 gap-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-40 hidden md:block" />
          <div className="ml-auto flex items-center gap-3">
            <Skeleton className="h-6 w-20 hidden sm:block" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>

        {/* Main 3-col */}
        <div className="flex-1 min-h-0 grid grid-cols-[88px_minmax(0,1fr)] xl:grid-cols-[104px_minmax(0,1fr)_320px]">
          {/* Week rail */}
          <div className="border-r border-border p-2 flex flex-col gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
            <div className="mt-3">
              <Skeleton className="h-3 w-16 mb-2" />
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 56 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-sm" />
                ))}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="p-4 space-y-4 overflow-hidden">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>

          {/* Signals */}
          <div className="hidden xl:flex flex-col gap-3 p-3 border-l border-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-md" />
            ))}
          </div>
        </div>

        {/* Meal strip */}
        <div className="h-12 border-t border-border bg-card/80 flex items-center px-4 gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
  )
}
