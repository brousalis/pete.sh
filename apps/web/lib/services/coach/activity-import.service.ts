/**
 * Fallback activity import.
 *
 * The Apple Watch is the primary recorder, but a session occasionally lands
 * somewhere else: the Coospo head unit when the watch dies mid-ride, a pool
 * session logged on a borrowed device, or the historical Garmin export. This
 * accepts GPX and TCX (both XML, parsed without a dependency) and normalises
 * them into the same AppleHealthWorkout shape the PeteTrain apps post, so
 * there is exactly one ingestion path downstream.
 *
 * FIT is binary; `parseFit` is intentionally unimplemented and reports a clear
 * error rather than silently producing an empty activity. Convert FIT to TCX
 * (Garmin Connect exports both) or add @garmin/fitsdk when needed.
 */

import type {
  AppleHealthWorkout,
  AppleWorkoutType,
  HeartRateSample,
} from '@/lib/types/apple-health.types'

export interface ImportedActivity {
  workout: AppleHealthWorkout
  warnings: string[]
}

interface TrackPoint {
  time: Date
  lat?: number
  lon?: number
  altitude?: number
  heartRate?: number
  cadence?: number
  distanceMeters?: number
  speed?: number
}

// ---------------------------------------------------------------------------
// Minimal XML helpers
// ---------------------------------------------------------------------------

/** Extract the text content of the first <tag> inside a fragment. */
function tagText(fragment: string, tag: string): string | undefined {
  const match = fragment.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return match?.[1]?.trim()
}

function tagNumber(fragment: string, tag: string): number | undefined {
  const text = tagText(fragment, tag)
  if (text === undefined) return undefined
  const value = Number(text)
  return Number.isFinite(value) ? value : undefined
}

function attribute(fragment: string, attr: string): string | undefined {
  const match = fragment.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i'))
  return match?.[1]
}

/** All occurrences of <tag ...>...</tag>, including self-closing forms. */
function eachTag(xml: string, tag: string): string[] {
  const results: string[] = []
  const pattern = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi')
  let match: RegExpExecArray | null
  while ((match = pattern.exec(xml)) !== null) {
    results.push(match[0])
  }
  return results
}

// ---------------------------------------------------------------------------
// Geo helpers
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_000

function haversine(a: TrackPoint, b: TrackPoint): number {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return 0

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseGpx(xml: string): { points: TrackPoint[]; sportHint?: string; name?: string } {
  const points: TrackPoint[] = []

  for (const raw of eachTag(xml, 'trkpt')) {
    const time = tagText(raw, 'time')
    if (!time) continue

    const parsed = new Date(time)
    if (Number.isNaN(parsed.getTime())) continue

    const lat = Number(attribute(raw, 'lat'))
    const lon = Number(attribute(raw, 'lon'))

    points.push({
      time: parsed,
      lat: Number.isFinite(lat) ? lat : undefined,
      lon: Number.isFinite(lon) ? lon : undefined,
      altitude: tagNumber(raw, 'ele'),
      // Garmin and most tools use the TrackPointExtension namespace
      heartRate: tagNumber(raw, 'gpxtpx:hr') ?? tagNumber(raw, 'hr'),
      cadence: tagNumber(raw, 'gpxtpx:cad') ?? tagNumber(raw, 'cad'),
    })
  }

  return {
    points,
    sportHint: tagText(xml, 'type'),
    name: tagText(xml, 'name'),
  }
}

function parseTcx(xml: string): { points: TrackPoint[]; sportHint?: string; totalDistance?: number } {
  const points: TrackPoint[] = []

  for (const raw of eachTag(xml, 'Trackpoint')) {
    const time = tagText(raw, 'Time')
    if (!time) continue

    const parsed = new Date(time)
    if (Number.isNaN(parsed.getTime())) continue

    const position = raw.match(/<Position>([\s\S]*?)<\/Position>/i)?.[1]
    const hrFragment = raw.match(/<HeartRateBpm[^>]*>([\s\S]*?)<\/HeartRateBpm>/i)?.[1]
    const extensions = raw.match(/<Extensions>([\s\S]*?)<\/Extensions>/i)?.[1]

    points.push({
      time: parsed,
      lat: position ? tagNumber(position, 'LatitudeDegrees') : undefined,
      lon: position ? tagNumber(position, 'LongitudeDegrees') : undefined,
      altitude: tagNumber(raw, 'AltitudeMeters'),
      heartRate: hrFragment ? tagNumber(hrFragment, 'Value') : undefined,
      cadence:
        tagNumber(raw, 'Cadence') ??
        (extensions ? tagNumber(extensions, 'ns3:RunCadence') : undefined),
      distanceMeters: tagNumber(raw, 'DistanceMeters'),
      speed: extensions ? tagNumber(extensions, 'ns3:Speed') : undefined,
    })
  }

  const activity = xml.match(/<Activity[^>]*Sport\s*=\s*"([^"]*)"/i)?.[1]

  // TCX laps carry authoritative totals; prefer them over integrating GPS.
  const lapDistances = eachTag(xml, 'Lap')
    .map((lap) => tagNumber(lap, 'DistanceMeters'))
    .filter((value): value is number => value != null)

  return {
    points,
    sportHint: activity,
    totalDistance: lapDistances.length
      ? lapDistances.reduce((sum, value) => sum + value, 0)
      : undefined,
  }
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

const SPORT_MAP: Record<string, AppleWorkoutType> = {
  running: 'running',
  run: 'running',
  biking: 'cycling',
  cycling: 'cycling',
  bike: 'cycling',
  ride: 'cycling',
  swimming: 'swimming',
  swim: 'swimming',
  walking: 'walking',
  walk: 'walking',
  hiking: 'hiking',
  rowing: 'rowing',
  elliptical: 'elliptical',
  other: 'other',
}

function resolveWorkoutType(hint: string | undefined, fallback: AppleWorkoutType): AppleWorkoutType {
  if (!hint) return fallback
  return SPORT_MAP[hint.trim().toLowerCase()] ?? fallback
}

/**
 * Stable synthetic HealthKit id.
 *
 * Imports have no HealthKit UUID, so one is derived from the file's own
 * content (sport + start + end + point count). Re-importing the same file
 * therefore upserts rather than creating a duplicate activity.
 */
function syntheticHealthkitId(
  workoutType: AppleWorkoutType,
  start: Date,
  end: Date,
  pointCount: number
): string {
  const seed = `${workoutType}|${start.toISOString()}|${end.toISOString()}|${pointCount}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return `import-${Math.abs(hash).toString(36)}-${Math.floor(start.getTime() / 1000).toString(36)}`
}

export function parseActivityFile(
  filename: string,
  contents: string,
  options: { sport?: string } = {}
): ImportedActivity {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  const warnings: string[] = []

  if (extension === 'fit') {
    throw new Error(
      'FIT files are not supported. Export the activity as TCX or GPX (Garmin Connect offers both) and upload that instead.'
    )
  }

  let points: TrackPoint[]
  let sportHint: string | undefined
  let declaredDistance: number | undefined

  if (extension === 'gpx') {
    const parsed = parseGpx(contents)
    points = parsed.points
    sportHint = parsed.sportHint
  } else if (extension === 'tcx') {
    const parsed = parseTcx(contents)
    points = parsed.points
    sportHint = parsed.sportHint
    declaredDistance = parsed.totalDistance
  } else {
    throw new Error(`Unsupported file type ".${extension}". Upload a .gpx or .tcx file.`)
  }

  if (points.length < 2) {
    throw new Error('No track points found in the file.')
  }

  points.sort((a, b) => a.time.getTime() - b.time.getTime())

  const start = points[0]!.time
  const end = points[points.length - 1]!.time
  const durationSeconds = Math.max(1, Math.round((end.getTime() - start.getTime()) / 1000))

  const workoutType = resolveWorkoutType(options.sport ?? sportHint, 'other')
  if (workoutType === 'other') {
    warnings.push('Could not determine the sport from the file; imported as "other".')
  }

  // Distance: declared totals beat cumulative fields, which beat integrating GPS.
  let distanceMeters = declaredDistance
  if (distanceMeters == null) {
    const cumulative = points[points.length - 1]?.distanceMeters
    const first = points[0]?.distanceMeters
    if (cumulative != null && first != null && cumulative > first) {
      distanceMeters = cumulative - first
    }
  }
  if (distanceMeters == null) {
    let total = 0
    for (let i = 1; i < points.length; i++) {
      total += haversine(points[i - 1]!, points[i]!)
    }
    distanceMeters = total > 0 ? total : undefined
    if (distanceMeters) {
      warnings.push('Distance was integrated from GPS points and may differ slightly from the device total.')
    }
  }

  let elevationGain = 0
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]!.altitude
    const current = points[i]!.altitude
    if (previous != null && current != null && current > previous) {
      elevationGain += current - previous
    }
  }

  const heartRateSamples: HeartRateSample[] = points
    .filter((point) => point.heartRate != null && point.heartRate > 0)
    .map((point) => ({
      timestamp: point.time.toISOString(),
      bpm: Math.round(point.heartRate!),
    }))

  const hrValues = heartRateSamples.map((sample) => sample.bpm)
  const cadenceValues = points
    .map((point) => point.cadence)
    .filter((value): value is number => value != null && value > 0)

  if (hrValues.length === 0) {
    warnings.push('No heart rate data in this file; training load will be estimated from duration.')
  }

  const routeSamples = points
    .filter((point) => point.lat != null && point.lon != null)
    .map((point) => ({
      timestamp: point.time.toISOString(),
      latitude: point.lat!,
      longitude: point.lon!,
      altitude: point.altitude ?? 0,
      speed: point.speed ?? 0,
      course: 0,
      horizontalAccuracy: 0,
      verticalAccuracy: 0,
    }))

  const avgCadence = cadenceValues.length
    ? cadenceValues.reduce((a, b) => a + b, 0) / cadenceValues.length
    : null

  const avgSpeedMps =
    distanceMeters && durationSeconds > 0 ? distanceMeters / durationSeconds : null
  const avgPaceMinPerMile = avgSpeedMps && avgSpeedMps > 0 ? 26.8224 / avgSpeedMps : null

  const workout: AppleHealthWorkout = {
    id: syntheticHealthkitId(workoutType, start, end, points.length),
    workoutType,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    duration: durationSeconds,
    activeCalories: 0,
    totalCalories: 0,
    distance: distanceMeters,
    distanceMiles: distanceMeters != null ? distanceMeters / 1609.344 : undefined,
    elevationGain: elevationGain > 0 ? Math.round(elevationGain) : undefined,
    heartRate: {
      average: hrValues.length
        ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
        : 0,
      min: hrValues.length ? Math.min(...hrValues) : 0,
      max: hrValues.length ? Math.max(...hrValues) : 0,
      // Zones are computed server side from user_hr_zones_config.
      zones: [],
    },
    heartRateSamples,
    runningMetrics:
      workoutType === 'running' && avgCadence != null
        ? {
            cadence: {
              // GPX/TCX report running cadence per leg; double for steps/min.
              average: Math.round(avgCadence * 2),
              samples: [],
            },
            pace: {
              average: avgPaceMinPerMile ?? 0,
              best: avgPaceMinPerMile ?? 0,
              samples: [],
            },
          }
        : undefined,
    cyclingMetrics:
      workoutType === 'cycling' && avgCadence != null
        ? {
            avgCadence: Math.round(avgCadence),
            avgSpeed: avgSpeedMps != null ? avgSpeedMps * 2.236936 : undefined,
          }
        : undefined,
    route: routeSamples.length
      ? {
          totalDistance: distanceMeters ?? 0,
          totalElevationGain: elevationGain,
          totalElevationLoss: 0,
          samples: routeSamples,
        }
      : undefined,
    source: 'FileImport',
    isIndoor: routeSamples.length === 0,
  }

  return { workout, warnings }
}
