import { WorkoutDetailView } from "@/components/dashboard/workout-detail-view"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { DayOfWeek } from "@/lib/types/fitness.types"

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ day: string }>
}) {
  const { day } = await params
  const dayLower = day.toLowerCase() as DayOfWeek
  const dayName = dayLower.charAt(0).toUpperCase() + dayLower.slice(1)

  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="flex items-center gap-3">
        <Link href="/fitness">
          <Button variant="ghost" size="icon" className="size-8">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">{dayName} Workout</h1>
        </div>
      </div>

      <WorkoutDetailView day={dayLower} />
    </div>
  )
}
