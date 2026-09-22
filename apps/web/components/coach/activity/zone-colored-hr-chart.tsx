'use client'

import React, { useMemo, useState } from 'react'
import { Heart } from 'lucide-react'

import { HEX } from '@/lib/constants/colors'
import type { HeartRateZone } from '@/lib/types/apple-health.types'
import type { EnhancedWorkoutAnalytics } from '@/lib/utils/workout-analytics'
import { cn } from '@/lib/utils'

export interface HrZoneConfig {
  zone: number
  label: string
  maxBpm?: number
  minBpm?: number
  color: string
}

export interface HrZonesConfig {
  maxHr: number
  restingHr: number | null
  zones: HrZoneConfig[]
}

interface ZoneColoredHrChartProps {
  data: EnhancedWorkoutAnalytics['timeSeriesData']
  hrZonesConfig: HrZonesConfig
  hrAverage?: number | null
  className?: string
}

function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Zone-colored HR line chart used on the workout detail page.
 * Segments the HR series by Apple Watch zone thresholds.
 */
export function ZoneColoredHrChart({
  data,
  hrZonesConfig,
  hrAverage,
  className,
}: ZoneColoredHrChartProps) {
  const [hoverData, setHoverData] = useState<{
    x: number
    hr: number
    zone: number
    zoneLabel: string
    zoneColor: string
    time: number
  } | null>(null)
  const chartRef = React.useRef<HTMLDivElement>(null)

  const zones = hrZonesConfig.zones

  const getZoneForBpm = (bpm: number): { zone: number; color: string; label: string } => {
    const z5 = zones[4]
    const z4 = zones[3]
    const z3 = zones[2]
    const z2 = zones[1]
    const z1 = zones[0]

    if (z5 && z5.minBpm && bpm >= z5.minBpm) return { zone: 5, color: z5.color, label: z5.label }
    if (z4 && z4.minBpm && bpm >= z4.minBpm) return { zone: 4, color: z4.color, label: z4.label }
    if (z3 && z3.minBpm && bpm >= z3.minBpm) return { zone: 3, color: z3.color, label: z3.label }
    if (z2 && z2.minBpm && bpm >= z2.minBpm) return { zone: 2, color: z2.color, label: z2.label }
    return { zone: 1, color: z1?.color || HEX.azure, label: z1?.label || 'Zone 1' }
  }

  const getZoneColor = (bpm: number): string => getZoneForBpm(bpm).color
  const getZoneNumber = (bpm: number): number => getZoneForBpm(bpm).zone

  const maxPoints = 200
  const chartData = useMemo(() => {
    const withHr = data.filter((d) => d.hr !== null)
    if (withHr.length <= maxPoints) return withHr
    const step = Math.ceil(withHr.length / maxPoints)
    return withHr.filter((_, idx) => idx % step === 0)
  }, [data])

  const segments = useMemo(() => {
    const segs: { startIdx: number; endIdx: number; color: string; zone: number }[] = []
    let currentZone = -1
    let segStart = 0

    chartData.forEach((point, idx) => {
      if (point.hr === null) return
      const zone = getZoneNumber(point.hr)
      if (zone !== currentZone) {
        if (currentZone !== -1) {
          const startPoint = chartData[segStart]
          if (startPoint && startPoint.hr !== null) {
            segs.push({
              startIdx: segStart,
              endIdx: idx,
              color: getZoneColor(startPoint.hr),
              zone: currentZone,
            })
          }
        }
        segStart = idx
        currentZone = zone
      }
    })
    if (currentZone !== -1) {
      const startPoint = chartData[segStart]
      if (startPoint && startPoint.hr !== null) {
        segs.push({
          startIdx: segStart,
          endIdx: chartData.length - 1,
          color: getZoneColor(startPoint.hr),
          zone: currentZone,
        })
      }
    }
    return segs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData])

  if (data.length === 0 || !hrZonesConfig || hrZonesConfig.zones.length < 5) return null

  const hrValues = chartData.filter((d) => d.hr !== null).map((d) => d.hr!)
  if (hrValues.length === 0) return null

  const minHr = Math.min(...hrValues)
  const maxHr = Math.max(...hrValues)
  const lastPoint = chartData[chartData.length - 1]
  const totalSeconds = lastPoint ? lastPoint.elapsedSeconds : 0

  const width = 400
  const height = 140
  const padding = { top: 15, right: 40, bottom: 30, left: 45 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const xScale = (idx: number) =>
    padding.left + (idx / Math.max(chartData.length - 1, 1)) * chartWidth
  const yScale = (hr: number) =>
    padding.top + chartHeight - ((hr - minHr + 10) / (maxHr - minHr + 20)) * chartHeight

  const segmentPaths = segments.map((seg, segIdx) => {
    const points: string[] = []
    for (let i = seg.startIdx; i <= seg.endIdx; i++) {
      const point = chartData[i]
      if (point && point.hr !== null) {
        const x = xScale(i)
        const y = yScale(point.hr)
        points.push(`${points.length === 0 ? 'M' : 'L'} ${x} ${y}`)
      }
    }
    return { path: points.join(' '), color: seg.color, key: segIdx }
  })

  const yTicks = [minHr, Math.round((minHr + maxHr) / 2), maxHr]

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="size-4 text-accent-rose" />
          <span className="text-sm font-medium">Heart Rate</span>
        </div>
        {hrAverage ? (
          <div className="text-right">
            <span className="text-2xl font-bold text-accent-rose">{hrAverage}</span>
            <span className="text-muted-foreground ml-1 text-xs">BPM AVG</span>
          </div>
        ) : null}
      </div>

      <div
        ref={chartRef}
        className="relative"
        onMouseMove={(e) => {
          if (!chartRef.current) return
          const rect = chartRef.current.getBoundingClientRect()
          const relativeX = e.clientX - rect.left
          const svgWidth = rect.width
          const dataX = ((relativeX / svgWidth) * width - padding.left) / chartWidth
          const dataIdx = Math.round(dataX * (chartData.length - 1))

          if (dataIdx >= 0 && dataIdx < chartData.length) {
            const point = chartData[dataIdx]
            if (point && point.hr != null) {
              const zoneInfo = getZoneForBpm(point.hr)
              setHoverData({
                x: relativeX,
                hr: point.hr,
                zone: zoneInfo.zone,
                zoneLabel: zoneInfo.label,
                zoneColor: zoneInfo.color,
                time: point.elapsedSeconds,
              })
            }
          }
        }}
        onMouseLeave={() => setHoverData(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {hrZonesConfig.zones.map((zone, idx) => {
            const topBpm =
              idx === 4 ? maxHr + 10 : hrZonesConfig.zones[idx + 1]?.maxBpm || zone.minBpm || 0
            const bottomBpm = zone.maxBpm || zone.minBpm || minHr
            const y1 = yScale(topBpm)
            const y2 = yScale(bottomBpm)
            if (y1 >= padding.top + chartHeight || y2 <= padding.top) return null
            return (
              <rect
                key={idx}
                x={padding.left}
                y={Math.max(y1, padding.top)}
                width={chartWidth}
                height={Math.min(y2, padding.top + chartHeight) - Math.max(y1, padding.top)}
                fill={zone.color}
                fillOpacity={0.08}
              />
            )
          })}

          {yTicks.map((tick, idx) => (
            <line
              key={idx}
              x1={padding.left}
              y1={yScale(tick)}
              x2={padding.left + chartWidth}
              y2={yScale(tick)}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="2 4"
            />
          ))}

          {hrAverage ? (
            <line
              x1={padding.left}
              y1={yScale(hrAverage)}
              x2={padding.left + chartWidth}
              y2={yScale(hrAverage)}
              stroke={HEX.rose}
              strokeWidth={1}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
          ) : null}

          {segmentPaths.map(({ path, color, key }) => (
            <path
              key={key}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {hoverData && chartRef.current ? (
            <>
              <line
                x1={(hoverData.x / chartRef.current.getBoundingClientRect().width) * width}
                y1={padding.top}
                x2={(hoverData.x / chartRef.current.getBoundingClientRect().width) * width}
                y2={padding.top + chartHeight}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={1}
              />
              <circle
                cx={(hoverData.x / chartRef.current.getBoundingClientRect().width) * width}
                cy={yScale(hoverData.hr)}
                r={5}
                fill={hoverData.zoneColor}
                stroke="#fff"
                strokeWidth={2}
              />
            </>
          ) : null}

          {yTicks.map((tick, idx) => (
            <text
              key={idx}
              x={padding.left - 8}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              style={{ fontSize: '10px' }}
            >
              {tick}
            </text>
          ))}

          <text
            x={padding.left}
            y={height - 8}
            className="fill-muted-foreground"
            style={{ fontSize: '10px' }}
          >
            {formatElapsedTime(0)}
          </text>
          <text
            x={padding.left + chartWidth / 2}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: '10px' }}
          >
            {formatElapsedTime(totalSeconds / 2)}
          </text>
          <text
            x={padding.left + chartWidth}
            y={height - 8}
            textAnchor="end"
            className="fill-muted-foreground"
            style={{ fontSize: '10px' }}
          >
            {formatElapsedTime(totalSeconds)}
          </text>

          <text
            x={width - 5}
            y={yScale(maxHr) + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            style={{ fontSize: '10px' }}
          >
            {maxHr}
          </text>
          <text
            x={width - 5}
            y={yScale(minHr) + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            style={{ fontSize: '10px' }}
          >
            {minHr}
          </text>
        </svg>

        {hoverData ? (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-border/50 bg-popover/95 px-3 py-2 shadow-xl backdrop-blur-sm"
            style={{
              left: Math.min(
                hoverData.x + 10,
                (chartRef.current?.getBoundingClientRect().width || 300) - 140
              ),
              top: 20,
            }}
          >
            <div className="text-muted-foreground mb-1.5 text-xs font-medium">
              {formatElapsedTime(hoverData.time)}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Heart className="size-3" style={{ color: hoverData.zoneColor }} />
                <span className="text-muted-foreground text-xs">Heart Rate</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: hoverData.zoneColor }}>
                {Math.round(hoverData.hr)} bpm
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-xs">Zone</span>
              <div className="flex items-center gap-1.5">
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: hoverData.zoneColor }}
                />
                <span className="text-xs font-medium" style={{ color: hoverData.zoneColor }}>
                  {hoverData.zoneLabel}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
        {hrZonesConfig.zones.map((zone) => {
          let rangeStr = ''
          if (zone.zone === 1) {
            rangeStr = `<${(zone.maxBpm || 0) + 1}`
          } else if (zone.zone === 5) {
            rangeStr = `${zone.minBpm}+`
          } else {
            rangeStr = `${zone.minBpm}-${zone.maxBpm}`
          }
          return (
            <div key={zone.zone} className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
              <span style={{ color: zone.color }} className="font-medium">
                {zone.label}
              </span>
              <span className="text-muted-foreground">{rangeStr}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ZONE_BAR_COLORS: Record<string, { text: string; bar: string }> = {
  rest: { text: 'text-accent-slate', bar: 'bg-accent-slate' },
  warmup: { text: 'text-accent-sage', bar: 'bg-accent-sage' },
  fatBurn: { text: 'text-accent-gold', bar: 'bg-accent-gold' },
  cardio: { text: 'text-accent-ember', bar: 'bg-accent-ember' },
  peak: { text: 'text-accent-rose', bar: 'bg-accent-rose' },
}

const ZONE_BAR_LABELS: Record<string, string> = {
  rest: 'Rest',
  warmup: 'Warm Up',
  fatBurn: 'Fat Burn',
  cardio: 'Cardio',
  peak: 'Peak',
}

/** Stacked zone distribution bar from the workout detail page. */
export function HrZoneDistributionBar({
  zones,
  className,
}: {
  zones: HeartRateZone[]
  className?: string
}) {
  const activeZones = zones.filter((z) => z.percentage > 0)
  if (activeZones.length === 0) return null

  return (
    <div className={className}>
      <div className="flex h-5 w-full overflow-hidden rounded">
        {activeZones.map((zone, idx) => {
          const colors = ZONE_BAR_COLORS[zone.name] ?? ZONE_BAR_COLORS.rest!
          return (
            <div
              key={idx}
              className={cn(colors.bar)}
              style={{ width: `${zone.percentage}%`, opacity: 0.85 }}
            />
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {activeZones.map((zone, idx) => {
          const colors = ZONE_BAR_COLORS[zone.name] ?? ZONE_BAR_COLORS.rest!
          return (
            <span key={idx} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-sm', colors.bar)} />
              <span className={colors.text}>{ZONE_BAR_LABELS[zone.name] || zone.name}</span>
              <span className="text-muted-foreground">{zone.percentage}%</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** Full workout-page HR summary: zone-colored chart + distribution bar. */
export function WorkoutHrSummary({
  timeSeriesData,
  hrZonesConfig,
  hrAverage,
  hrZones,
  className,
}: {
  timeSeriesData: EnhancedWorkoutAnalytics['timeSeriesData']
  hrZonesConfig: HrZonesConfig
  hrAverage?: number | null
  hrZones?: HeartRateZone[] | null
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-border/50 bg-card p-3', className)}>
      <ZoneColoredHrChart
        data={timeSeriesData}
        hrZonesConfig={hrZonesConfig}
        hrAverage={hrAverage}
      />
      {hrZones && hrZones.length > 0 ? (
        <div className="mt-2 border-t border-border/20 pt-2">
          <HrZoneDistributionBar zones={hrZones} />
        </div>
      ) : null}
    </div>
  )
}
