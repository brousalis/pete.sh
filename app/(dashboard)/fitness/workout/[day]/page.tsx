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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/fitness">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workout</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Follow along and track your progress
          </p>
        </div>
      </div>

      <WorkoutDetailView day={dayLower} />
    </div>
  )
}
