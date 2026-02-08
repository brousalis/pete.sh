'use client'

import { useConnectivity } from '@/components/connectivity-provider'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type { HueAnalyticsData, HueInsight } from '@/lib/types/hue-analytics.types'
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
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  Clock: <Clock className="size-3.5" />,
  Home: <Home className="size-3.5" />,
  Moon: <Moon className="size-3.5" />,
  Sun: <Sun className="size-3.5" />,
  TrendingUp: <TrendingUp className="size-3.5" />,
  TrendingDown: <TrendingDown className="size-3.5" />,
  Zap: <Zap className="size-3.5" />,
}

const CHART_COLORS = {
  lightsOn: '#f59e0b',
  roomBar: '#f59e0b',
}

interface HueAnalyticsCompactProps {
  className?: string
}

export function HueAnalyticsCompact({ className }: HueAnalyticsCompactProps) {
  const [data, setData] = useState<HueAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'pattern' | 'rooms'>('overview')
  const { apiBaseUrl, isInitialized } = useConnectivity()

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${apiBaseUrl}/api/hue/analytics?days=7`)
      if (!res.ok) throw new Error('Failed to fetch analytics')

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

  if (!loading && !data && !error) {
    return null
  }

  return (
    <div className={cn('rounded-xl bg-muted/20', className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15">
            <BarChart3 className="size-4 text-amber-500" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Usage Insights</h2>
            <p className="text-[10px] text-muted-foreground">Last 7 days</p>
          </div>
        </div>
        <div className="text-muted-foreground">
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
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
            <div className="border-t border-border/30 p-3">
              {loading ? (
                <AnalyticsSkeleton />
              ) : error ? (
                <div className="py-6 text-center text-xs text-muted-foreground">{error}</div>
              ) : data ? (
                <div className="space-y-3">
                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard
                      label="Daily Usage"
                      value={`${data.summary.avgDailyUsageHours}h`}
                      icon={<Clock className="size-3.5 text-amber-500" />}
                    />
                    <StatCard
                      label="Most Active"
                      value={data.summary.mostActiveRoom || '—'}
                      subValue={data.summary.mostActiveRoom ? `${data.summary.mostActiveRoomPercentage}%` : undefined}
                      icon={<Home className="size-3.5 text-blue-500" />}
                    />
                    <StatCard
                      label="Brightness"
                      value={`${data.summary.avgBrightness}%`}
                      icon={<Sun className="size-3.5 text-yellow-500" />}
                    />
                    <StatCard
                      label="Trend"
                      value={
                        data.summary.weekOverWeekChange === 0
                          ? 'Stable'
                          : `${data.summary.weekOverWeekChange > 0 ? '+' : ''}${data.summary.weekOverWeekChange}%`
                      }
                      icon={
                        data.summary.weekOverWeekChange > 0 ? (
                          <TrendingUp className="size-3.5 text-green-500" />
                        ) : data.summary.weekOverWeekChange < 0 ? (
                          <TrendingDown className="size-3.5 text-red-500" />
                        ) : (
                          <Activity className="size-3.5 text-muted-foreground" />
                        )
                      }
                      trend={
                        data.summary.weekOverWeekChange > 0
                          ? 'up'
                          : data.summary.weekOverWeekChange < 0
                            ? 'down'
                            : undefined
                      }
                    />
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex rounded-lg bg-muted/40 p-0.5">
                    {(['overview', 'pattern', 'rooms'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          'flex-1 rounded-md px-2 py-1 text-[10px] font-medium capitalize transition-all',
                          activeTab === tab
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[140px]">
                    {activeTab === 'overview' && <UsageChart data={data} />}
                    {activeTab === 'pattern' && <PatternChart data={data} />}
                    {activeTab === 'rooms' && <RoomUsage data={data} />}
                  </div>

                  {/* Insights */}
                  {data.insights.length > 0 && (
                    <div className="space-y-1.5 border-t border-border/30 pt-3">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                        Insights
                      </p>
                      <div className="space-y-1.5">
                        {data.insights.slice(0, 2).map(insight => (
                          <InsightRow key={insight.id} insight={insight} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// STAT CARD
// ============================================

function StatCard({
  label,
  value,
  subValue,
  icon,
  trend,
}: {
  label: string
  value: string
  subValue?: string
  icon: React.ReactNode
  trend?: 'up' | 'down'
}) {
  return (
    <div className="rounded-lg bg-background/50 p-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span
          className={cn(
            'text-sm font-semibold',
            trend === 'up' && 'text-green-500',
            trend === 'down' && 'text-red-500'
          )}
        >
          {value}
        </span>
        {subValue && <span className="text-[10px] text-muted-foreground">{subValue}</span>}
      </div>
    </div>
  )
}

// ============================================
// USAGE CHART
// ============================================

const timelineChartConfig: ChartConfig = {
  lightsOn: { label: 'Lights On', color: CHART_COLORS.lightsOn },
}

function UsageChart({ data }: { data: HueAnalyticsData }) {
  const chartData = data.timeline.map(point => ({
    time: point.timestamp,
    lightsOn: point.lightsOn,
    label: format(new Date(point.timestamp), 'MMM d, h:mm a'),
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-xs text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ChartContainer config={timelineChartConfig} className="h-[140px] w-full">
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="lightsOnGradientCompact" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.lightsOn} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS.lightsOn} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.2} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 9 }}
          tickFormatter={value => format(new Date(value), 'EEE')}
          interval="preserveStartEnd"
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} width={20} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ''}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="lightsOn"
          stroke={CHART_COLORS.lightsOn}
          strokeWidth={2}
          fill="url(#lightsOnGradientCompact)"
        />
      </AreaChart>
    </ChartContainer>
  )
}

// ============================================
// PATTERN CHART
// ============================================

const patternChartConfig: ChartConfig = {
  avgLightsOn: { label: 'Avg Lights On', color: CHART_COLORS.lightsOn },
}

function PatternChart({ data }: { data: HueAnalyticsData }) {
  const chartData = data.hourlyPattern.map(point => ({
    hour: point.hour,
    avgLightsOn: Math.round(point.avgLightsOn * 10) / 10,
    label: formatHourLabel(point.hour),
  }))

  const maxValue = Math.max(...chartData.map(d => d.avgLightsOn))

  if (chartData.length === 0 || maxValue === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-xs text-muted-foreground">
        No pattern data
      </div>
    )
  }

  return (
    <ChartContainer config={patternChartConfig} className="h-[140px] w-full">
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.2} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 8 }} interval={3} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} width={20} />
        <ChartTooltip content={<ChartTooltipContent formatter={value => [`${value} lights`, 'Avg']} />} />
        <Bar dataKey="avgLightsOn" radius={[2, 2, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.avgLightsOn === maxValue ? CHART_COLORS.lightsOn : `${CHART_COLORS.lightsOn}60`}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// ============================================
// ROOM USAGE
// ============================================

function RoomUsage({ data }: { data: HueAnalyticsData }) {
  const rooms = data.roomUsage.slice(0, 5)

  if (rooms.length === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-xs text-muted-foreground">
        No room data
      </div>
    )
  }

  const maxPercentage = Math.max(...rooms.map(r => r.percentageOn))

  return (
    <div className="space-y-2 py-1">
      {rooms.map((room, index) => (
        <div key={room.zoneId} className="space-y-0.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium">{room.name}</span>
            <span className="tabular-nums text-muted-foreground">{Math.round(room.percentageOn)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor:
                  room.percentageOn === maxPercentage ? CHART_COLORS.roomBar : `${CHART_COLORS.roomBar}50`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${room.percentageOn}%` }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// INSIGHT ROW
// ============================================

function InsightRow({ insight }: { insight: HueInsight }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-background/40 p-2">
      <div
        className={cn(
          'mt-0.5 rounded p-1',
          insight.type === 'peak_time' && 'bg-amber-500/15 text-amber-500',
          insight.type === 'most_used_room' && 'bg-blue-500/15 text-blue-500',
          insight.type === 'overnight' && 'bg-indigo-500/15 text-indigo-500',
          insight.type === 'brightness' && 'bg-yellow-500/15 text-yellow-500',
          insight.type === 'trend' && insight.trend === 'up' && 'bg-green-500/15 text-green-500',
          insight.type === 'trend' && insight.trend === 'down' && 'bg-red-500/15 text-red-500',
          insight.type === 'efficiency' && 'bg-emerald-500/15 text-emerald-500'
        )}
      >
        {INSIGHT_ICONS[insight.icon] || <Lightbulb className="size-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium leading-tight">{insight.title}</p>
        <p className="text-[10px] leading-tight text-muted-foreground">{insight.description}</p>
      </div>
    </div>
  )
}

// ============================================
// LOADING SKELETON
// ============================================

function AnalyticsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-lg bg-background/50 p-2">
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-4 w-10 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-[140px] animate-pulse rounded-lg bg-muted/30" />
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
