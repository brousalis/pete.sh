import { errorResponse, handleApiError, successResponse } from '@/lib/api/utils'
import { getSupabaseClient } from '@/lib/supabase/client'
import type {
  HueAnalyticsData,
  HueHourlyPattern,
  HueInsight,
  HueRoomUsage,
  HueSummaryStats,
  HueUsageDataPoint,
} from '@/lib/types/hue-analytics.types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7', 10)

    const supabase = getSupabaseClient()
    if (!supabase) {
      return errorResponse('Supabase not configured', 500)
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffIso = cutoffDate.toISOString()

    // Fetch data in parallel
    const [statusResult, zonesResult] = await Promise.all([
      supabase
        .from('hue_status')
        .select('*')
        .gte('recorded_at', cutoffIso)
        .order('recorded_at', { ascending: true }),
      supabase
        .from('hue_zones')
        .select('zone_id, name, any_on, recorded_at')
        .gte('recorded_at', cutoffIso)
        .order('recorded_at', { ascending: true }),
    ])

    if (statusResult.error) {
      console.error('Error fetching hue_status:', statusResult.error)
      return errorResponse('Failed to fetch status data', 500)
    }

    if (zonesResult.error) {
      console.error('Error fetching hue_zones:', zonesResult.error)
      return errorResponse('Failed to fetch zones data', 500)
    }

    const statusData = statusResult.data || []
    const zonesData = zonesResult.data || []

    // Process timeline data (sample every ~30 minutes for chart readability)
    const timeline = processTimeline(statusData)

    // Process hourly patterns
    const hourlyPattern = processHourlyPattern(statusData)

    // Process room usage
    const roomUsage = processRoomUsage(zonesData)

    // Calculate summary stats
    const summary = calculateSummary(statusData, roomUsage, days)

    // Generate insights
    const insights = generateInsights(statusData, hourlyPattern, roomUsage, summary)

    const analyticsData: HueAnalyticsData = {
      summary,
      timeline,
      hourlyPattern,
      roomUsage,
      insights,
    }

    return successResponse(analyticsData)
  } catch (error) {
    return handleApiError(error)
  }
}

interface StatusRow {
  id: string
  total_lights: number
  lights_on: number
  any_on: boolean
  all_on: boolean
  average_brightness: number
  recorded_at: string
  created_at: string
}

interface ZoneRow {
  zone_id: string
  name: string
  any_on: boolean
  recorded_at: string
}

function processTimeline(data: StatusRow[]): HueUsageDataPoint[] {
  if (data.length === 0) return []

  // Sample data to ~200 points max for chart performance
  const sampleRate = Math.max(1, Math.floor(data.length / 200))
  
  return data
    .filter((_, index) => index % sampleRate === 0)
    .map(row => ({
      timestamp: row.recorded_at,
      lightsOn: row.lights_on,
      totalLights: row.total_lights,
      averageBrightness: row.average_brightness,
    }))
}

function processHourlyPattern(data: StatusRow[]): HueHourlyPattern[] {
  const hourlyBuckets: Map<number, { lightsOn: number[]; brightness: number[] }> = new Map()

  // Initialize all hours
  for (let h = 0; h < 24; h++) {
    hourlyBuckets.set(h, { lightsOn: [], brightness: [] })
  }

  // Aggregate by hour
  data.forEach(row => {
    const date = new Date(row.recorded_at)
    const hour = date.getHours()
    const bucket = hourlyBuckets.get(hour)!
    bucket.lightsOn.push(row.lights_on)
    bucket.brightness.push(row.average_brightness)
  })

  // Calculate averages
  return Array.from(hourlyBuckets.entries()).map(([hour, bucket]) => ({
    hour,
    avgLightsOn: bucket.lightsOn.length > 0
      ? bucket.lightsOn.reduce((a, b) => a + b, 0) / bucket.lightsOn.length
      : 0,
    avgBrightness: bucket.brightness.length > 0
      ? bucket.brightness.reduce((a, b) => a + b, 0) / bucket.brightness.length
      : 0,
    dataPoints: bucket.lightsOn.length,
  }))
}

function processRoomUsage(data: ZoneRow[]): HueRoomUsage[] {
  const roomMap: Map<string, { name: string; onCount: number; totalCount: number }> = new Map()

  data.forEach(row => {
    if (!roomMap.has(row.zone_id)) {
      roomMap.set(row.zone_id, { name: row.name, onCount: 0, totalCount: 0 })
    }
    const room = roomMap.get(row.zone_id)!
    room.totalCount++
    if (row.any_on) {
      room.onCount++
    }
  })

  return Array.from(roomMap.entries())
    .map(([zoneId, room]) => ({
      zoneId,
      name: room.name,
      onCount: room.onCount,
      totalCount: room.totalCount,
      percentageOn: room.totalCount > 0 ? (room.onCount / room.totalCount) * 100 : 0,
    }))
    .sort((a, b) => b.percentageOn - a.percentageOn)
}

function calculateSummary(
  statusData: StatusRow[],
  roomUsage: HueRoomUsage[],
  days: number
): HueSummaryStats {
  if (statusData.length === 0) {
    return {
      avgDailyUsageHours: 0,
      mostActiveRoom: null,
      mostActiveRoomPercentage: 0,
      avgBrightness: 0,
      weekOverWeekChange: 0,
      totalDataPoints: 0,
      dateRange: { start: '', end: '' },
    }
  }

  // Calculate average daily usage hours
  // Each data point represents ~5 minutes. Count when any light is on.
  const onDataPoints = statusData.filter(row => row.lights_on > 0).length
  const totalMinutes = onDataPoints * 5 // Each sync is ~5 minutes apart
  const avgDailyUsageHours = totalMinutes / 60 / days

  // Find most active room
  const mostActiveRoom = roomUsage.length > 0 ? roomUsage[0] : null

  // Calculate average brightness (when lights are on)
  const brightnessValues = statusData
    .filter(row => row.lights_on > 0)
    .map(row => row.average_brightness)
  const avgBrightness = brightnessValues.length > 0
    ? brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length
    : 0

  // Calculate week-over-week change
  const midpoint = Math.floor(statusData.length / 2)
  const firstHalf = statusData.slice(0, midpoint)
  const secondHalf = statusData.slice(midpoint)
  
  const firstHalfOn = firstHalf.filter(r => r.lights_on > 0).length
  const secondHalfOn = secondHalf.filter(r => r.lights_on > 0).length
  
  let weekOverWeekChange = 0
  if (firstHalfOn > 0) {
    weekOverWeekChange = ((secondHalfOn - firstHalfOn) / firstHalfOn) * 100
  }

  return {
    avgDailyUsageHours: Math.round(avgDailyUsageHours * 10) / 10,
    mostActiveRoom: mostActiveRoom?.name || null,
    mostActiveRoomPercentage: mostActiveRoom ? Math.round(mostActiveRoom.percentageOn) : 0,
    avgBrightness: Math.round((avgBrightness / 254) * 100), // Convert to percentage
    weekOverWeekChange: Math.round(weekOverWeekChange),
    totalDataPoints: statusData.length,
    dateRange: {
      start: statusData[0]?.recorded_at ?? null,
      end: statusData[statusData.length - 1]?.recorded_at ?? null,
    },
  }
}

function generateInsights(
  statusData: StatusRow[],
  hourlyPattern: HueHourlyPattern[],
  roomUsage: HueRoomUsage[],
  summary: HueSummaryStats
): HueInsight[] {
  const insights: HueInsight[] = []

  if (statusData.length === 0) {
    return insights
  }

  // Peak usage time insight
  const peakHour = hourlyPattern.reduce((max, curr) =>
    curr.avgLightsOn > max.avgLightsOn ? curr : max
  )
  if (peakHour.avgLightsOn > 0) {
    const peakTimeStr = formatHour(peakHour.hour)
    insights.push({
      id: 'peak_time',
      type: 'peak_time',
      icon: 'Clock',
      title: 'Peak Usage',
      description: `Most lights on around ${peakTimeStr}`,
      value: peakTimeStr,
    })
  }

  // Most active room insight
  const mostUsedRoom = roomUsage[0]
  if (mostUsedRoom && mostUsedRoom.percentageOn > 0) {
    insights.push({
      id: 'most_used_room',
      type: 'most_used_room',
      icon: 'Home',
      title: 'Most Active',
      description: `${mostUsedRoom.name} is on ${Math.round(mostUsedRoom.percentageOn)}% of the time`,
      value: mostUsedRoom.name,
    })
  }

  // Overnight usage insight (lights on between midnight and 5am)
  const overnightHours = hourlyPattern.filter(h => h.hour >= 0 && h.hour < 5)
  const avgOvernightLights = overnightHours.reduce((sum, h) => sum + h.avgLightsOn, 0) / 5
  if (avgOvernightLights > 0.5) {
    insights.push({
      id: 'overnight',
      type: 'overnight',
      icon: 'Moon',
      title: 'Night Owl',
      description: `Lights often on overnight (avg ${Math.round(avgOvernightLights)} lights)`,
      value: Math.round(avgOvernightLights),
    })
  }

  // Brightness preference insight
  if (summary.avgBrightness > 0) {
    let brightnessLabel = 'moderate'
    if (summary.avgBrightness < 30) brightnessLabel = 'dim'
    else if (summary.avgBrightness > 70) brightnessLabel = 'bright'
    
    insights.push({
      id: 'brightness',
      type: 'brightness',
      icon: 'Sun',
      title: 'Brightness',
      description: `Average brightness is ${summary.avgBrightness}% (${brightnessLabel})`,
      value: `${summary.avgBrightness}%`,
    })
  }

  // Trend insight
  if (Math.abs(summary.weekOverWeekChange) > 10) {
    const trendDirection = summary.weekOverWeekChange > 0 ? 'up' : 'down'
    const trendIcon = summary.weekOverWeekChange > 0 ? 'TrendingUp' : 'TrendingDown'
    insights.push({
      id: 'trend',
      type: 'trend',
      icon: trendIcon,
      title: 'Usage Trend',
      description: `Light usage ${trendDirection === 'up' ? 'increased' : 'decreased'} ${Math.abs(summary.weekOverWeekChange)}%`,
      value: `${summary.weekOverWeekChange > 0 ? '+' : ''}${summary.weekOverWeekChange}%`,
      trend: trendDirection,
    })
  }

  // Efficiency insight - lights rarely all on together
  const allOnCount = statusData.filter(r => r.all_on).length
  const allOnPercentage = (allOnCount / statusData.length) * 100
  if (allOnPercentage < 5 && statusData.length > 100) {
    insights.push({
      id: 'efficiency',
      type: 'efficiency',
      icon: 'Zap',
      title: 'Efficient',
      description: 'Lights rarely all on at once - good energy habits!',
    })
  }

  return insights.slice(0, 6) // Limit to 6 insights
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}
