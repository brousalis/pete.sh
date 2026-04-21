import {
  CommandBarSkeleton,
  WeekHorizonSkeleton,
  WorkoutStageSkeleton,
} from '@/components/dashboard-v2/skeletons'

export default function V2Loading() {
  return (
    <div className="-m-3 sm:-m-5 md:-mx-6 md:-my-6 h-[calc(100%+1.5rem)] sm:h-[calc(100%+2.5rem)] md:h-[calc(100%+3rem)]">
      <div className="flex flex-col h-full">
        <CommandBarSkeleton />
        <WeekHorizonSkeleton />
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="p-3 overflow-y-auto h-full">
            <WorkoutStageSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}
