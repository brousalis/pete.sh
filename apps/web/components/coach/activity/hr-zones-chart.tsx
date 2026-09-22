'use client'

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart'
import { HEX, HR_ZONE_HEX_ARRAY } from '@/lib/constants/colors'
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts'

interface HeartRateZone {
  name: string
  minBpm: number
  maxBpm: number
  duration: number // seconds
  percentage: number
}

interface HrZonesChartProps {
  zones: HeartRateZone[]
  className?: string
}

const ZONE_COLORS: Record<string, string> = {
  rest: HR_ZONE_HEX_ARRAY[0],
  warmup: HR_ZONE_HEX_ARRAY[1],
  fatBurn: HR_ZONE_HEX_ARRAY[2],
  cardio: HR_ZONE_HEX_ARRAY[3],
  peak: HR_ZONE_HEX_ARRAY[4],
}

const ZONE_LABELS: Record<string, string> = {
  rest: 'Rest',
  warmup: 'Warm Up',
  fatBurn: 'Fat Burn',
  cardio: 'Cardio',
  peak: 'Peak',
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes === 0) return `${secs}s`
  if (secs === 0) return `${minutes}m`
  return `${minutes}m ${secs}s`
}

export function HrZonesChart({ zones, className }: HrZonesChartProps) {
  // Filter out zones with 0 duration and sort by intensity
  const zoneOrder = ['rest', 'warmup', 'fatBurn', 'cardio', 'peak']
  const filteredZones = zones
    .filter(z => z.duration > 0)
    .sort((a, b) => zoneOrder.indexOf(a.name) - zoneOrder.indexOf(b.name))

  if (filteredZones.length === 0) {
    return (
      <div className={className}>
        <p className="text-muted-foreground text-sm">No HR zone data available</p>
      </div>
    )
  }

  const chartData = filteredZones.map(zone => ({
    zone: ZONE_LABELS[zone.name] || zone.name,
    zoneName: zone.name,
    duration: zone.duration,
    percentage: zone.percentage,
    bpmRange: `${zone.minBpm}-${zone.maxBpm} BPM`,
    formattedDuration: formatDuration(zone.duration),
  }))

  const chartConfig: ChartConfig = {
    duration: {
      label: 'Time',
    },
  }

  return (
    <div className={className}>
      <ChartContainer config={chartConfig} className="h-[120px] w-full">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="zone"
            tickLine={false}
            axisLine={false}
            width={70}
            tick={{ fontSize: 11 }}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{item.payload.zone}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.payload.formattedDuration} ({item.payload.percentage}%)
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {item.payload.bpmRange}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="duration"
            radius={[0, 4, 4, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={ZONE_COLORS[entry.zoneName] || HEX.slate}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3">
        {filteredZones.map(zone => (
          <div key={zone.name} className="flex items-center gap-1.5">
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: ZONE_COLORS[zone.name] || HEX.slate }}
            />
            <span className="text-muted-foreground text-xs">
              {ZONE_LABELS[zone.name] || zone.name}: {zone.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Simple bar version for compact display
export function HrZonesBar({ zones, className }: HrZonesChartProps) {
  const zoneOrder = ['rest', 'warmup', 'fatBurn', 'cardio', 'peak']
  const filteredZones = zones
    .filter(z => z.percentage > 0)
    .sort((a, b) => zoneOrder.indexOf(a.name) - zoneOrder.indexOf(b.name))

  const totalPercentage = filteredZones.reduce((sum, z) => sum + z.percentage, 0)

  if (filteredZones.length === 0 || totalPercentage === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {filteredZones.map(zone => (
          <div
            key={zone.name}
            className="h-full transition-all"
            style={{
              width: `${zone.percentage}%`,
              backgroundColor: ZONE_COLORS[zone.name] || HEX.slate,
            }}
            title={`${ZONE_LABELS[zone.name] || zone.name}: ${zone.percentage}%`}
          />
        ))}
      </div>
    </div>
  )
}
