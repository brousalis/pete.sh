"use client"

import { useState, useEffect } from "react"
import { Flame, TrendingUp, Calendar, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { ConsistencyStats } from "@/lib/types/fitness.types"

export function ConsistencyDashboard() {
  const [stats, setStats] = useState<ConsistencyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/fitness/consistency")
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setStats(data.data)
          }
        }
      } catch (error) {
        console.error("Failed to fetch consistency stats", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Consistency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="size-5 text-orange-500" />
          Consistency
        </CardTitle>
        <CardDescription>Your daily habit tracking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streak Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="size-4 text-orange-500" />
              Current Streak
            </div>
            <div className="mt-2 text-3xl font-bold">{stats.currentStreak}</div>
            <div className="text-xs text-muted-foreground">days</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="size-4 text-blue-500" />
              Longest Streak
            </div>
            <div className="mt-2 text-3xl font-bold">{stats.longestStreak}</div>
            <div className="text-xs text-muted-foreground">days</div>
          </div>
        </div>

        {/* Completion Rates */}
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Weekly Completion</span>
              <span className="font-medium">{stats.weeklyCompletion}%</span>
            </div>
            <Progress value={stats.weeklyCompletion} className="h-2" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monthly Completion</span>
              <span className="font-medium">{stats.monthlyCompletion}%</span>
            </div>
            <Progress value={stats.monthlyCompletion} className="h-2" />
          </div>
        </div>

        {/* Routine Streaks */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Routine Streaks</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Workouts</div>
              <div className="mt-1 text-lg font-semibold">{stats.streaks.workouts}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Morning</div>
              <div className="mt-1 text-lg font-semibold">{stats.streaks.morningRoutines}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Night</div>
              <div className="mt-1 text-lg font-semibold">{stats.streaks.nightRoutines}</div>
            </div>
          </div>
        </div>

        {/* Total Activity */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="size-4" />
            Total Active Days
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.totalDaysActive}</div>
        </div>
      </CardContent>
    </Card>
  )
}
