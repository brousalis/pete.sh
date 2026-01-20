import { FitnessSingleView } from '@/components/dashboard/fitness-single-view'

export default function FitnessPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Single View - fills remaining space */}
      <div className="min-h-0 flex-1">
        <FitnessSingleView />
      </div>
    </div>
  )
}
