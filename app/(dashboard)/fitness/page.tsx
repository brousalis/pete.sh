import { FitnessSingleView } from '@/components/dashboard/fitness-single-view'

export default function FitnessPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="mb-3 shrink-0">
        <h1 className="text-foreground text-2xl font-bold">Fitness</h1>
        <p className="text-muted-foreground text-sm">
          Your daily routines and workouts
        </p>
      </div>

      {/* Single View - fills remaining space */}
      <div className="min-h-0 flex-1">
        <FitnessSingleView />
      </div>
    </div>
  )
}
