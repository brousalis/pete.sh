/**
 * Garmin TCX builder for Apple Health workouts.
 * Produces Strava-importable .tcx files (Sport="Swimming" for swims).
 */

export interface TcxHeartRateSample {
  timestamp: string
  bpm: number
}

export interface TcxLapEvent {
  timestamp: string
  durationSeconds: number
  distanceMeters?: number | null
  lapNumber?: number | null
}

export interface TcxLocationSample {
  timestamp: string
  latitude: number
  longitude: number
  altitude?: number | null
}

export interface TcxWorkoutExportInput {
  startDate: string
  endDate: string
  durationSeconds: number
  distanceMeters?: number | null
  activeCalories?: number | null
  hrAverage?: number | null
  hrMin?: number | null
  hrMax?: number | null
  heartRateSamples?: TcxHeartRateSample[]
  lapEvents?: TcxLapEvent[]
  routeSamples?: TcxLocationSample[]
  /** Override / estimate pool length for lap distance when DB distance is missing */
  poolLengthMeters?: number | null
  sport?: 'Swimming' | 'Running' | 'Biking' | 'Other'
  notes?: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toIsoUtc(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${String(input)}`)
  }
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function xmlHr(bpm: number | null | undefined): string {
  if (bpm == null || !Number.isFinite(bpm) || bpm <= 0) return ''
  return `<HeartRateBpm><Value>${Math.round(bpm)}</Value></HeartRateBpm>`
}

function xmlAvgMaxHr(avg?: number | null, max?: number | null): string {
  const parts: string[] = []
  if (avg != null && avg > 0) {
    parts.push(`<AverageHeartRateBpm><Value>${Math.round(avg)}</Value></AverageHeartRateBpm>`)
  }
  if (max != null && max > 0) {
    parts.push(`<MaximumHeartRateBpm><Value>${Math.round(max)}</Value></MaximumHeartRateBpm>`)
  }
  return parts.join('')
}

interface BuiltLap {
  startTime: string
  totalTimeSeconds: number
  distanceMeters: number
  calories: number
  avgHr?: number | null
  maxHr?: number | null
  trackpoints: Array<{
    time: string
    bpm?: number
    distanceMeters?: number
    latitude?: number
    longitude?: number
    altitude?: number
  }>
}

function resolveTotalDistance(input: TcxWorkoutExportInput, lapCount: number): number {
  if (input.distanceMeters != null && input.distanceMeters > 0) {
    return input.distanceMeters
  }
  if (input.poolLengthMeters != null && input.poolLengthMeters > 0 && lapCount > 0) {
    return input.poolLengthMeters * lapCount
  }
  return 0
}

function buildLaps(input: TcxWorkoutExportInput): BuiltLap[] {
  const laps = (input.lapEvents ?? [])
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const totalDistance = resolveTotalDistance(input, laps.length)
  const hrSamples = (input.heartRateSamples ?? [])
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const routeSamples = (input.routeSamples ?? [])
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  if (laps.length === 0) {
    const trackpoints = buildTrackpointsForWindow({
      start: input.startDate,
      end: input.endDate,
      distanceMeters: totalDistance,
      hrSamples,
      routeSamples,
    })

    return [
      {
        startTime: toIsoUtc(input.startDate),
        totalTimeSeconds: input.durationSeconds,
        distanceMeters: totalDistance,
        calories: Math.round(input.activeCalories ?? 0),
        avgHr: input.hrAverage,
        maxHr: input.hrMax,
        trackpoints,
      },
    ]
  }

  const perLapFallbackDistance =
    input.poolLengthMeters != null && input.poolLengthMeters > 0
      ? input.poolLengthMeters
      : totalDistance > 0
        ? totalDistance / laps.length
        : 0

  const totalCalories = Math.round(input.activeCalories ?? 0)
  const built: BuiltLap[] = []
  let cumulativeDistance = 0

  for (let i = 0; i < laps.length; i += 1) {
    const lap = laps[i]!
    const start = lap.timestamp
    const end =
      i + 1 < laps.length
        ? laps[i + 1]!.timestamp
        : input.endDate

    const lapDistance =
      lap.distanceMeters != null && lap.distanceMeters > 0
        ? lap.distanceMeters
        : perLapFallbackDistance

    const startMs = new Date(start).getTime()
    const endMs = new Date(end).getTime()
    const lapHr = hrSamples.filter((s) => {
      const t = new Date(s.timestamp).getTime()
      return t >= startMs && t < endMs
    })
    const avgHr =
      lapHr.length > 0
        ? Math.round(lapHr.reduce((sum, s) => sum + s.bpm, 0) / lapHr.length)
        : input.hrAverage
    const maxHr =
      lapHr.length > 0 ? Math.max(...lapHr.map((s) => s.bpm)) : input.hrMax

    const trackpoints = buildTrackpointsForWindow({
      start,
      end,
      distanceMeters: lapDistance,
      distanceOffset: cumulativeDistance,
      hrSamples: lapHr,
      routeSamples: routeSamples.filter((s) => {
        const t = new Date(s.timestamp).getTime()
        return t >= startMs && t < endMs
      }),
    })

    cumulativeDistance += lapDistance

    const caloriesShare =
      i === laps.length - 1
        ? Math.max(0, totalCalories - built.reduce((sum, l) => sum + l.calories, 0))
        : Math.round(totalCalories / laps.length)

    built.push({
      startTime: toIsoUtc(start),
      totalTimeSeconds: Math.max(0, lap.durationSeconds || (endMs - startMs) / 1000),
      distanceMeters: lapDistance,
      calories: caloriesShare,
      avgHr,
      maxHr,
      trackpoints,
    })
  }

  // If lap distances summed to 0 but we have a total, put total on the first lap
  const sumDistance = built.reduce((sum, l) => sum + l.distanceMeters, 0)
  if (sumDistance === 0 && totalDistance > 0 && built[0]) {
    built[0].distanceMeters = totalDistance
  }

  return built
}

function buildTrackpointsForWindow(args: {
  start: string
  end: string
  distanceMeters: number
  distanceOffset?: number
  hrSamples: TcxHeartRateSample[]
  routeSamples: TcxLocationSample[]
}): BuiltLap['trackpoints'] {
  const { start, end, distanceMeters, distanceOffset = 0, hrSamples, routeSamples } = args
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  const durationMs = Math.max(1, endMs - startMs)

  type Point = BuiltLap['trackpoints'][number]
  const byTime = new Map<string, Point>()

  const upsert = (point: Point): void => {
    const key = point.time
    const existing = byTime.get(key)
    if (!existing) {
      byTime.set(key, point)
      return
    }
    byTime.set(key, { ...existing, ...point })
  }

  // Always include start/end anchors so Strava gets a valid Track
  upsert({
    time: toIsoUtc(start),
    distanceMeters: round(distanceOffset),
  })
  upsert({
    time: toIsoUtc(end),
    distanceMeters: round(distanceOffset + distanceMeters),
  })

  for (const sample of hrSamples) {
    const t = new Date(sample.timestamp).getTime()
    const progress = Math.min(1, Math.max(0, (t - startMs) / durationMs))
    upsert({
      time: toIsoUtc(sample.timestamp),
      bpm: sample.bpm,
      distanceMeters: round(distanceOffset + distanceMeters * progress),
    })
  }

  for (const sample of routeSamples) {
    const t = new Date(sample.timestamp).getTime()
    const progress = Math.min(1, Math.max(0, (t - startMs) / durationMs))
    upsert({
      time: toIsoUtc(sample.timestamp),
      latitude: sample.latitude,
      longitude: sample.longitude,
      altitude: sample.altitude ?? undefined,
      distanceMeters: round(distanceOffset + distanceMeters * progress),
    })
  }

  return Array.from(byTime.values()).sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  )
}

function renderTrackpoint(point: BuiltLap['trackpoints'][number]): string {
  const parts: string[] = [`<Time>${point.time}</Time>`]

  if (point.latitude != null && point.longitude != null) {
    parts.push(
      `<Position><LatitudeDegrees>${point.latitude}</LatitudeDegrees><LongitudeDegrees>${point.longitude}</LongitudeDegrees></Position>`
    )
  }
  if (point.altitude != null && Number.isFinite(point.altitude)) {
    parts.push(`<AltitudeMeters>${round(point.altitude, 2)}</AltitudeMeters>`)
  }
  if (point.distanceMeters != null) {
    parts.push(`<DistanceMeters>${round(point.distanceMeters, 2)}</DistanceMeters>`)
  }
  if (point.bpm != null) {
    parts.push(xmlHr(point.bpm))
  }

  return `<Trackpoint>${parts.join('')}</Trackpoint>`
}

/**
 * Build a Garmin TCX document string from workout data.
 */
export function buildTcxDocument(input: TcxWorkoutExportInput): string {
  const sport = input.sport ?? 'Swimming'
  const activityId = toIsoUtc(input.startDate)
  const laps = buildLaps(input)

  const lapXml = laps
    .map((lap) => {
      const trackXml = lap.trackpoints.map(renderTrackpoint).join('')
      return [
        `<Lap StartTime="${lap.startTime}">`,
        `<TotalTimeSeconds>${round(lap.totalTimeSeconds, 2)}</TotalTimeSeconds>`,
        `<DistanceMeters>${round(lap.distanceMeters, 2)}</DistanceMeters>`,
        `<Calories>${Math.max(0, Math.round(lap.calories))}</Calories>`,
        xmlAvgMaxHr(lap.avgHr, lap.maxHr),
        `<Intensity>Active</Intensity>`,
        `<TriggerMethod>Manual</TriggerMethod>`,
        `<Track>${trackXml}</Track>`,
        `</Lap>`,
      ].join('')
    })
    .join('')

  const notesXml = input.notes
    ? `<Notes>${escapeXml(input.notes)}</Notes>`
    : ''

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">`,
    `<Activities>`,
    `<Activity Sport="${sport}">`,
    `<Id>${activityId}</Id>`,
    lapXml,
    notesXml,
    `</Activity>`,
    `</Activities>`,
    `<Author xsi:type="Application_t">`,
    `<Name>petehome</Name>`,
    `<Build><Version><VersionMajor>1</VersionMajor><VersionMinor>0</VersionMinor><BuildMajor>0</BuildMajor><BuildMinor>0</BuildMinor></Version></Build>`,
    `<LangID>en</LangID>`,
    `<PartNumber>petehome-tcx</PartNumber>`,
    `</Author>`,
    `</TrainingCenterDatabase>`,
  ].join('')
}

export function yardsToMeters(yards: number): number {
  return yards * 0.9144
}
