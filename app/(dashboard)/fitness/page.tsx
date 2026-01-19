import { FitnessDailyView } from '@/components/dashboard/fitness-daily-view'
import { ConsistencyDashboard } from '@/components/dashboard/consistency-dashboard'

export default function FitnessPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Fitness</h1>
        <p className="text-muted-foreground text-sm">
          Your daily routines and workouts
        </p>
      </div>

      {/* Today's Daily View - Primary Focus */}
      <FitnessDailyView />

      {/* Consistency Tracking */}
      <ConsistencyDashboard />
    </div>
  )
}
