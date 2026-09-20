/**
 * Export a swim workout from Supabase as a Strava-importable .tcx file.
 *
 * Usage (from apps/web):
 *   yarn export:swim --date 2026-08-03
 *   yarn export:swim --id 3ff7eda8-75d3-4e2c-b919-35865e432e72
 *   yarn export:swim --date 2026-08-03 --pool-length-yd 25
 *   yarn export:swim --date 2026-08-03 --pool-length-m 25 --out ./exports
 */

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { buildTcxDocument, yardsToMeters } from '../lib/utils/tcx-export'

function loadEnv(): void {
  const candidates = ['.env.local', '.env']
  for (const file of candidates) {
    const fullPath = path.resolve(process.cwd(), file)
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath })
    }
  }
}

interface CliArgs {
  id?: string
  date?: string
  poolLengthMeters?: number
  outDir: string
  list: boolean
}

function printUsage(): void {
  console.log(`Export a swim workout to .tcx for Strava manual upload.

Usage:
  yarn export:swim --date YYYY-MM-DD [--pool-length-yd N | --pool-length-m N]
  yarn export:swim --id <workout-uuid> [--pool-length-yd N | --pool-length-m N]
  yarn export:swim --list [--date YYYY-MM-DD]

Options:
  --out <dir>           Output directory (default: ./exports)
  --pool-length-yd N    Estimate distance as laps × yards (when DB distance is missing)
  --pool-length-m N     Estimate distance as laps × meters
  --list                List swimming workouts instead of exporting
`)
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2)
  let id: string | undefined
  let date: string | undefined
  let poolLengthMeters: number | undefined
  let outDir = path.resolve(process.cwd(), 'exports')
  let list = false

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i]
    if (!a) continue

    if (a === '--help' || a === '-h') {
      printUsage()
      process.exit(0)
    }
    if (a === '--list') {
      list = true
      continue
    }
    if (a === '--id') {
      id = args[++i]
      continue
    }
    if (a === '--date') {
      date = args[++i]
      continue
    }
    if (a === '--out') {
      outDir = path.resolve(process.cwd(), args[++i] ?? 'exports')
      continue
    }
    if (a === '--pool-length-m') {
      poolLengthMeters = Number(args[++i])
      continue
    }
    if (a === '--pool-length-yd') {
      const yards = Number(args[++i])
      poolLengthMeters = yardsToMeters(yards)
      continue
    }

    console.error(`Unknown argument: ${a}`)
    printUsage()
    process.exit(1)
  }

  if (poolLengthMeters != null && (!Number.isFinite(poolLengthMeters) || poolLengthMeters <= 0)) {
    console.error('Pool length must be a positive number')
    process.exit(1)
  }

  return { id, date, poolLengthMeters, outDir, list }
}

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key)')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function dayRange(date: string): { start: string; end: string } {
  // Interpret as America/Chicago calendar day boundaries in UTC-ish ISO;
  // workouts are stored as timestamptz so a UTC day window is fine for listing.
  return {
    start: `${date}T00:00:00.000Z`,
    end: `${date}T23:59:59.999Z`,
  }
}

async function listSwims(
  supabase: ReturnType<typeof createSupabase>,
  date?: string
): Promise<void> {
  let query = supabase
    .from('apple_health_workouts')
    .select(
      'id, start_date, duration, distance_meters, active_calories, hr_average, workout_type, workout_type_raw, swimming_pool_length_meters, swimming_stroke_count'
    )
    .or('workout_type.eq.swimming,workout_type_raw.eq.46')
    .order('start_date', { ascending: false })
    .limit(50)

  if (date) {
    const { start, end } = dayRange(date)
    query = query.gte('start_date', start).lte('start_date', end)
  }

  const { data, error } = await query
  if (error) throw error

  if (!data?.length) {
    console.log('No swimming workouts found.')
    return
  }

  for (const row of data) {
    const mins = Math.round((row.duration ?? 0) / 60)
    const dist =
      row.distance_meters != null ? `${Number(row.distance_meters).toFixed(0)}m` : 'no distance'
    console.log(
      `${row.id}  ${row.start_date}  ${mins}min  ${dist}  cal=${row.active_calories ?? '?'}  hr=${row.hr_average ?? '?'}`
    )
  }
}

async function loadWorkout(
  supabase: ReturnType<typeof createSupabase>,
  args: CliArgs
) {
  let query = supabase
    .from('apple_health_workouts')
    .select('*')
    .or('workout_type.eq.swimming,workout_type_raw.eq.46')
    .order('start_date', { ascending: false })
    .limit(1)

  if (args.id) {
    query = supabase
      .from('apple_health_workouts')
      .select('*')
      .eq('id', args.id)
      .limit(1)
  } else if (args.date) {
    const { start, end } = dayRange(args.date)
    query = supabase
      .from('apple_health_workouts')
      .select('*')
      .or('workout_type.eq.swimming,workout_type_raw.eq.46')
      .gte('start_date', start)
      .lte('start_date', end)
      .order('start_date', { ascending: true })
      .limit(1)
  } else {
    throw new Error('Provide --id or --date (or --list)')
  }

  const { data, error } = await query
  if (error) throw error
  const workout = data?.[0]
  if (!workout) {
    throw new Error('No matching swim workout found')
  }
  return workout
}

async function main(): Promise<void> {
  loadEnv()
  const args = parseArgs(process.argv)
  const supabase = createSupabase()

  if (args.list) {
    await listSwims(supabase, args.date)
    return
  }

  const workout = await loadWorkout(supabase, args)

  const [{ data: hrSamples, error: hrError }, { data: events, error: eventsError }, { data: routes, error: routesError }] =
    await Promise.all([
      supabase
        .from('apple_health_hr_samples')
        .select('timestamp, bpm')
        .eq('workout_id', workout.id)
        .order('timestamp', { ascending: true }),
      supabase
        .from('apple_health_workout_events')
        .select('event_type, timestamp, duration, lap_number, distance_meters, split_time')
        .eq('workout_id', workout.id)
        .eq('event_type', 'lap')
        .order('timestamp', { ascending: true }),
      supabase
        .from('apple_health_routes')
        .select('samples')
        .eq('workout_id', workout.id)
        .maybeSingle(),
    ])

  if (hrError) throw hrError
  if (eventsError) throw eventsError
  if (routesError) throw routesError

  const poolLengthMeters =
    args.poolLengthMeters ??
    (workout.swimming_pool_length_meters != null
      ? Number(workout.swimming_pool_length_meters)
      : null)

  const routeSamples = Array.isArray(routes?.samples)
    ? (routes.samples as Array<{
        timestamp: string
        latitude: number
        longitude: number
        altitude?: number
      }>).map((s) => ({
        timestamp: s.timestamp,
        latitude: s.latitude,
        longitude: s.longitude,
        altitude: s.altitude,
      }))
    : []

  const tcx = buildTcxDocument({
    startDate: workout.start_date,
    endDate: workout.end_date,
    durationSeconds: Number(workout.duration) || 0,
    distanceMeters: workout.distance_meters != null ? Number(workout.distance_meters) : null,
    activeCalories: workout.active_calories != null ? Number(workout.active_calories) : null,
    hrAverage: workout.hr_average,
    hrMin: workout.hr_min,
    hrMax: workout.hr_max,
    heartRateSamples: (hrSamples ?? []).map((s) => ({
      timestamp: s.timestamp,
      bpm: s.bpm,
    })),
    lapEvents: (events ?? []).map((e) => ({
      timestamp: e.timestamp,
      durationSeconds: Number(e.duration ?? e.split_time ?? 0),
      distanceMeters: e.distance_meters != null ? Number(e.distance_meters) : null,
      lapNumber: e.lap_number,
    })),
    routeSamples,
    poolLengthMeters,
    sport: 'Swimming',
    notes: `Exported from petehome swim ${workout.id}`,
  })

  fs.mkdirSync(args.outDir, { recursive: true })
  const start = new Date(workout.start_date)
  const stamp = start.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
  const filename = `swim_${stamp}.tcx`
  const outPath = path.join(args.outDir, filename)
  fs.writeFileSync(outPath, tcx, 'utf8')

  const lapCount = events?.length ?? 0
  const effectiveDistance =
    workout.distance_meters != null && Number(workout.distance_meters) > 0
      ? Number(workout.distance_meters)
      : poolLengthMeters != null && lapCount > 0
        ? poolLengthMeters * lapCount
        : 0

  console.log(`Wrote ${outPath}`)
  console.log(
    `Workout ${workout.id} | ${Math.round((workout.duration ?? 0) / 60)}min | ${lapCount} laps | distance=${effectiveDistance ? `${effectiveDistance.toFixed(0)}m` : 'unknown'} | HR samples=${hrSamples?.length ?? 0}`
  )
  if (!effectiveDistance) {
    console.log(
      'Warning: no distance available. Re-sync from iOS after swim auth fix, or pass --pool-length-yd / --pool-length-m.'
    )
  }
  console.log('Upload at https://www.strava.com/upload/select')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
