import { TodayFocus } from "@/components/dashboard/today-focus"
import { ConsistencyDashboard } from "@/components/dashboard/consistency-dashboard"
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Target, TrendingUp } from "lucide-react"

export default function FitnessPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Fitness</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your daily routines, workouts, and consistency tracking
        </p>
      </div>

      {/* Today's Focus - Primary Section */}
      <TodayFocus />

      {/* Stats and Consistency Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Consistency Dashboard */}
        <div className="lg:col-span-2">
          <ConsistencyDashboard />
        </div>

        {/* Quick Stats Card */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="size-5 text-blue-500" />
                Your Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">Primary Goal</div>
                <div className="text-sm font-medium">Climber Physique</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Wire-strong, vascular, no bulk
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">Weight Goal</div>
                <div className="text-sm font-medium">-20 lbs</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Current: 205 lbs
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-1">Training Schedule</div>
                <div className="text-sm font-medium">Monday Start</div>
                <div className="text-xs text-muted-foreground mt-1">
                  12:00 PM (Fasted)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Injury Protocol Card */}
          <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400" />
                Injury Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Badge variant="destructive" className="mb-2">
                  Active
                </Badge>
                <div className="text-sm font-medium">Golfer's Elbow</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Strain near the funny bone (inner elbow)
                </div>
              </div>
              <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
                <div className="text-xs font-medium mb-2">Daily Rehab</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Forearm Smash (2 mins/day)</div>
                  <div>• Use straps for Deadlifts/Rows</div>
                </div>
              </div>
              <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
                <div className="text-xs font-medium mb-1">Rule</div>
                <div className="text-xs text-muted-foreground">
                  Use [ELBOW SAFE] alternatives for at least 2 weeks
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly Schedule */}
      <WeeklySchedule />
    </div>
  )
}
