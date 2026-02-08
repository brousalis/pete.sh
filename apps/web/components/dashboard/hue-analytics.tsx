'use client'

import { useConnectivity } from '@/components/connectivity-provider'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type {
  HueAnalyticsData,
  HueHourlyPattern,
  HueInsight,
  HueRoomUsage,
} from '@/lib/types/hue-analytics.types'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Home,
  Lightbulb,
  Moon,
  Sun,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

// Icon mapping for insights
const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  Clock: <Clock className="size-4" />,
  Home: <Home className="size-4" />,
  Moon: <Moon className="size-4" />,
  Sun: <Sun className="size-4" />,
  TrendingUp: <TrendingUp className="size-4" />,
  TrendingDown: <TrendingDown className="size-4" />,
  Zap: <Zap className="size-4" />,
}

// Chart colors
const CHART_COLORS = {
  lightsOn: '#f59e0b', // amber
  brightness: '#8b5cf6', // violet
  roomBar: '#f59e0b',
  roomBarMuted: '#f59e0b40',
}

interface HueAnalyticsProps {
  className?: string
}

export function HueAnalytics({ className }: HueAnalyticsProps) {
  const [data, setData] = useState<HueAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const { apiBaseUrl, isInitialized } = useConnectivity()

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${apiBaseUrl}/api/hue/analytics?days=7`)
      if (!res.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
      } else {
        throw new Error(json.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    if (isInitialized) {
      fetchAnalytics()
    }
  }, [fetchAnalytics, isInitialized])

  // Don't render anything if no data and not loading
  if (!loading && !data && !error) {
    return null
  }

  return (
    <motion.div
      className={cn(
        'bg-card border-border/60 overflow-hidden rounded-2xl border',
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/15 flex size-9 items-center justify-center rounded-xl">
            <BarChart3 className="size-[18px] text-amber-500" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <h2 className="text-foreground text-base font-semibold">
              Usage Insights
            </h2>
            <p className="text-muted-foreground text-xs">
              Last 7 days of lighting data
            </p>
          </div>
        </div>
        <div className="text-muted-foreground">
          {expanded ? (
            <ChevronUp className="size-5" />
          ) : (
            <ChevronDown className="size-5" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-border/40 border-t">
              {loading ? (
                <AnalyticsSkeleton />
              ) : error ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
                  {error}
                </div>
              ) : data ? (
                <div className="space-y-0">
                  {/* Summary Stats Row */}
                  <SummaryStats data={data} />

                  {/* Charts Grid */}
                  <div className="grid gap-0 border-t border-border/40 lg:grid-cols-2">
                    {/* Usage Timeline */}
                    <div className="border-b border-border/40 p-4 lg:border-b-0 lg:border-r">
                      <UsageTimelineChart data={data} />
                    </div>

                    {/* Daily Pattern */}
                    <div className="border-b border-border/40 p-4 lg:border-b-0">
                      <DailyPatternChart data={data} />
                    </div>
                  </div>

                  {/* Room Usage + Insights */}
                  <div className="grid gap-0 border-t border-border/40 lg:grid-cols-2">
                    {/* Room Usage */}
                    <div className="border-b border-border/40 p-4 lg:border-b-0 lg:border-r">
                      <RoomUsageChart data={data} />
                    </div>

                    {/* Insights */}
                    <div className="p-4">
                      <InsightsCards insights={data.insights} />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================
// SUMMARY STATS
// ============================================

function SummaryStats({ data }: { data: HueAnalyticsData }) {
  const { summary } = data

  const stats = [
    {
      label: 'Avg Daily Usage',
      value: `${summary.avgDailyUsageHours}h`,
      icon: <Clock className="size-4 text-amber-500" />,
    },
    {
      label: 'Most Active',
      value: summary.mostActiveRoom || '—',
      subValue: summary.mostActiveRoom ? `${summary.mostActiveRoomPercentage}%` : undefined,
      icon: <Home className="size-4 text-blue-500" />,
    },
    {
      label: 'Avg Brightness',
      value: `${summary.avgBrightness}%`,
      icon: <Sun className="size-4 text-yellow-500" />,
    },
    {
      label: 'Trend',
      value: summary.weekOverWeekChange === 0 
        ? 'Stable' 
        : `${summary.weekOverWeekChange > 0 ? '+' : ''}${summary.weekOverWeekChange}%`,
      icon: summary.weekOverWeekChange > 0 
        ? <TrendingUp className="size-4 text-green-500" />
        : summary.weekOverWeekChange < 0
        ? <TrendingDown className="size-4 text-red-500" />
        : <Activity className="size-4 text-muted-foreground" />,
      trend: summary.weekOverWeekChange > 0 ? 'up' : summary.weekOverWeekChange < 0 ? 'down' : 'neutral',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="bg-muted/30 rounded-xl p-3"
        >
          <div className="flex items-center gap-2">
            {stat.icon}
            <span className="text-muted-foreground text-xs">{stat.label}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={cn(
              'text-lg font-semibold',
              stat.trend === 'up' && 'text-green-500',
              stat.trend === 'down' && 'text-red-500'
            )}>
              {stat.value}
            </span>
            {stat.subValue && (
              <span className="text-muted-foreground text-xs">{stat.subValue}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// USAGE TIMELINE CHART
// ============================================

const timelineChartConfig: ChartConfig = {
  lightsOn: {
    label: 'Lights On',
    color: CHART_COLORS.lightsOn,
  },
}

function UsageTimelineChart({ data }: { data: HueAnalyticsData }) {
  const chartData = data.timeline.map(point => ({
    time: point.timestamp,
    lightsOn: point.lightsOn,
    label: format(new Date(point.timestamp), 'MMM d, h:mm a'),
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">
        No timeline data available
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">Usage Over Time</h3>
      <ChartContainer config={timelineChartConfig} className="h-[160px] w-full">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lightsOnGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.lightsOn} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.lightsOn} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.3}
          />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => format(new Date(value), 'EEE')}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            width={25}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload?.label) {
                    return payload[0].payload.label
                  }
                  return ''
                }}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="lightsOn"
            stroke={CHART_COLORS.lightsOn}
            strokeWidth={2}
            fill="url(#lightsOnGradient)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

// ============================================
// DAILY PATTERN CHART
// ============================================

const patternChartConfig: ChartConfig = {
  avgLightsOn: {
    label: 'Avg Lights On',
    color: CHART_COLORS.lightsOn,
  },
}

function DailyPatternChart({ data }: { data: HueAnalyticsData }) {
  const chartData = data.hourlyPattern.map(point => ({
    hour: point.hour,
    avgLightsOn: Math.round(point.avgLightsOn * 10) / 10,
    label: formatHourLabel(point.hour),
  }))

  const maxValue = Math.max(...chartData.map(d => d.avgLightsOn))

  if (chartData.length === 0 || maxValue === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">
        No pattern data available
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">Daily Pattern</h3>
      <ChartContainer config={patternChartConfig} className="h-[160px] w-full">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.3}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9 }}
            interval={2}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            width={25}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => [`${value} lights`, 'Avg']}
              />
            }
          />
          <Bar
            dataKey="avgLightsOn"
            radius={[3, 3, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.avgLightsOn === maxValue ? CHART_COLORS.lightsOn : `${CHART_COLORS.lightsOn}80`}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

// ============================================
// ROOM USAGE CHART
// ============================================

function RoomUsageChart({ data }: { data: HueAnalyticsData }) {
  const rooms = data.roomUsage.slice(0, 6) // Top 6 rooms

  if (rooms.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">
        No room data available
      </div>
    )
  }

  const maxPercentage = Math.max(...rooms.map(r => r.percentageOn))

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">Room Usage</h3>
      <div className="space-y-2.5">
        {rooms.map((room, index) => (
          <div key={room.zoneId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium">{room.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {Math.round(room.percentageOn)}%
              </span>
            </div>
            <div className="bg-muted/50 h-2 overflow-hidden rounded-full">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: room.percentageOn === maxPercentage 
                    ? CHART_COLORS.roomBar 
                    : `${CHART_COLORS.roomBar}60`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${room.percentageOn}%` }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// INSIGHTS CARDS
// ============================================

function InsightsCards({ insights }: { insights: HueInsight[] }) {
  if (insights.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">
        No insights available yet
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">Insights</h3>
      <div className="grid grid-cols-2 gap-2">
        {insights.slice(0, 4).map((insight) => (
          <motion.div
            key={insight.id}
            className="bg-muted/30 rounded-lg p-2.5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-start gap-2">
              <div className={cn(
                'mt-0.5 rounded-md p-1.5',
                insight.type === 'peak_time' && 'bg-amber-500/15 text-amber-500',
                insight.type === 'most_used_room' && 'bg-blue-500/15 text-blue-500',
                insight.type === 'overnight' && 'bg-indigo-500/15 text-indigo-500',
                insight.type === 'brightness' && 'bg-yellow-500/15 text-yellow-500',
                insight.type === 'trend' && insight.trend === 'up' && 'bg-green-500/15 text-green-500',
                insight.type === 'trend' && insight.trend === 'down' && 'bg-red-500/15 text-red-500',
                insight.type === 'efficiency' && 'bg-emerald-500/15 text-emerald-500',
              )}>
                {INSIGHT_ICONS[insight.icon] || <Lightbulb className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-xs font-medium leading-tight">
                  {insight.title}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[10px] leading-tight">
                  {insight.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// LOADING SKELETON
// ============================================

function AnalyticsSkeleton() {
  return (
    <div className="space-y-0">
      {/* Summary Stats Skeleton */}
      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-muted/30 rounded-xl p-3">
            <div className="bg-muted h-4 w-20 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-6 w-16 animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid gap-0 border-t border-border/40 lg:grid-cols-2">
        <div className="border-b border-border/40 p-4 lg:border-b-0 lg:border-r">
          <div className="bg-muted mb-3 h-4 w-28 animate-pulse rounded" />
          <div className="bg-muted/50 h-[160px] animate-pulse rounded-lg" />
        </div>
        <div className="border-b border-border/40 p-4 lg:border-b-0">
          <div className="bg-muted mb-3 h-4 w-24 animate-pulse rounded" />
          <div className="bg-muted/50 h-[160px] animate-pulse rounded-lg" />
        </div>
      </div>

      {/* Bottom Row Skeleton */}
      <div className="grid gap-0 border-t border-border/40 lg:grid-cols-2">
        <div className="border-b border-border/40 p-4 lg:border-b-0 lg:border-r">
          <div className="bg-muted mb-3 h-4 w-24 animate-pulse rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-muted/50 h-6 animate-pulse rounded" />
            ))}
          </div>
        </div>
        <div className="p-4">
          <div className="bg-muted mb-3 h-4 w-16 animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-muted/50 h-16 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  if (hour < 12) return `${hour}a`
  return `${hour - 12}p`
}
