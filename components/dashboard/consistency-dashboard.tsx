"use client"

import { useState, useEffect } from "react"
import { Flame, Target } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
        <CardContent className="py-4">
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
      <CardContent className="p-3 sm:p-4">
        {/* Compact horizontal layout */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Streaks */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-orange-500" />
              <div>
                <div className="text-lg font-bold leading-none">{stats.currentStreak}</div>
                <div className="text-[10px] text-muted-foreground">Current Streak</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Target className="size-4 text-blue-500" />
              <div>
                <div className="text-lg font-bold leading-none">{stats.longestStreak}</div>
                <div className="text-[10px] text-muted-foreground">Longest Streak</div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-border" />

          {/* Progress bars */}
          <div className="flex-1 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Week</span>
                <span className="font-medium">{stats.weeklyCompletion}%</span>
              </div>
              <Progress value={stats.weeklyCompletion} className="h-1.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Month</span>
                <span className="font-medium">{stats.monthlyCompletion}%</span>
              </div>
              <Progress value={stats.monthlyCompletion} className="h-1.5" />
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-border" />

          {/* Routine streaks - compact */}
          <div className="flex items-center gap-3 text-center">
            <div>
              <div className="text-sm font-semibold">{stats.streaks.workouts}</div>
              <div className="text-[10px] text-muted-foreground">Workouts</div>
            </div>
            <div>
              <div className="text-sm font-semibold">{stats.streaks.morningRoutines}</div>
              <div className="text-[10px] text-muted-foreground">AM</div>
            </div>
            <div>
              <div className="text-sm font-semibold">{stats.streaks.nightRoutines}</div>
              <div className="text-[10px] text-muted-foreground">PM</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
