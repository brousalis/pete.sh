/**
 * TypeScript types for Hue Analytics
 */

/** Single data point for usage timeline chart */
export interface HueUsageDataPoint {
  timestamp: string
  lightsOn: number
  totalLights: number
  averageBrightness: number
}

/** Hourly aggregated usage pattern */
export interface HueHourlyPattern {
  hour: number // 0-23
  avgLightsOn: number
  avgBrightness: number
  dataPoints: number // number of samples
}

/** Room/zone usage statistics */
export interface HueRoomUsage {
  zoneId: string
  name: string
  onCount: number // number of records where any_on = true
  totalCount: number // total records
  percentageOn: number // calculated percentage
  avgLightsOn?: number
}

/** Computed insight for display */
export interface HueInsight {
  id: string
  type: 'peak_time' | 'most_used_room' | 'overnight' | 'brightness' | 'trend' | 'efficiency'
  icon: string // lucide icon name
  title: string
  description: string
  value?: string | number
  trend?: 'up' | 'down' | 'neutral'
}

/** Summary statistics */
export interface HueSummaryStats {
  avgDailyUsageHours: number
  mostActiveRoom: string | null
  mostActiveRoomPercentage: number
  avgBrightness: number
  weekOverWeekChange: number // percentage change
  totalDataPoints: number
  dateRange: {
    start: string | null
    end: string | null
  }
}

/** Complete analytics response from API */
export interface HueAnalyticsData {
  summary: HueSummaryStats
  timeline: HueUsageDataPoint[]
  hourlyPattern: HueHourlyPattern[]
  roomUsage: HueRoomUsage[]
  insights: HueInsight[]
}

/** API request params */
export interface HueAnalyticsParams {
  days?: number // default 7
}
