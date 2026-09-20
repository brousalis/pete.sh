/**
 * PeteCoach historical backfill.
 *
 * Restores the training history that predates PeteCoach, from three sources:
 *
 *   plans   — fitness_routine_versions rows become coach_plan_history, so the
 *             coach can reason about what was actually prescribed last year
 *             instead of being told about it.
 *   apple   — Apple Health export.xml (Health app > profile > Export All Health
 *             Data). Streamed line by line; the file is routinely over 1 GB.
 *   files   — a directory of TCX/GPX files, which is what Garmin Connect's
 *             account export contains. Covers the 265S history now that the
 *             device is retired.
 *
 * Every path dedupes against apple_health_workouts by time overlap, so running
 * this repeatedly is safe and sources can be layered in any order.
 *
 * Usage:
 *   yarn tsx scripts/coach-backfill.ts plans
 *   yarn tsx scripts/coach-backfill.ts apple --file ~/Downloads/export.xml
 *   yarn tsx scripts/coach-backfill.ts files --dir ~/Downloads/garmin-export
 *   yarn tsx scripts/coach-backfill.ts all --file ... --dir ...
 */

import { createReadStream } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline'

import { config as loadEnv } from 'dotenv'

import { parseActivityFile } from '../lib/services/coach/activity-import.service'
import { appleHealthService } from '../lib/services/apple-health.service'
import { getSupabaseServiceClient } from '../lib/supabase/client'

loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Args {
  command: string
  file?: string
  dir?: string
  dryRun: boolean
}

function parseArgs(): Args {
  const [, , command = 'help', ...rest] = process.argv
  const args: Args = { command, dryRun: false }

  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i]
    if (flag === '--file') args.file = rest[++i]
    else if (flag === '--dir') args.dir = rest[++i]
    else if (flag === '--dry-run') args.dryRun = true
  }

  return args
}

function log(message: string): void {
  console.log(`[backfill] ${message}`)
}

// ---------------------------------------------------------------------------
// Dedupe
// ---------------------------------------------------------------------------

interface ExistingActivity {
  id: string
  start: number
  end: number
  sport: string
}

let existingCache: ExistingActivity[] | null = null

async function loadExisting(): Promise<ExistingActivity[]> {
  if (existingCache) return existingCache

  const supabase = getSupabaseServiceClient()
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for backfill')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('apple_health_workouts')
    .select('id, start_date, end_date, workout_type')
    .order('start_date', { ascending: true })

  if (error) throw new Error(`Failed to load existing activities: ${error.message}`)

  existingCache = (data ?? []).map(
    (row: { id: string; start_date: string; end_date: string; workout_type: string }) => ({
      id: row.id,
      start: new Date(row.start_date).getTime(),
      end: new Date(row.end_date).getTime(),
      sport: row.workout_type,
    })
  )

  return existingCache!
}

/**
 * Two records are the same session if they overlap by more than 80% of the
 * shorter one. Device clocks differ by a few seconds and Garmin/Apple round
 * durations differently, so exact timestamp matching misses real duplicates.
 */
async function isDuplicate(startIso: string, endIso: string): Promise<boolean> {
  const existing = await loadExisting()
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  const duration = end - start
  if (duration <= 0) return false

  for (const candidate of existing) {
    const overlap = Math.min(end, candidate.end) - Math.max(start, candidate.start)
    if (overlap <= 0) continue

    const shorter = Math.min(duration, candidate.end - candidate.start)
    if (shorter > 0 && overlap / shorter > 0.8) return true
  }

  return false
}

function rememberImported(startIso: string, endIso: string, sport: string, id: string): void {
  existingCache?.push({
    id,
    start: new Date(startIso).getTime(),
    end: new Date(endIso).getTime(),
    sport,
  })
}

// ---------------------------------------------------------------------------
// plans: fitness_routine_versions -> coach_plan_history
// ---------------------------------------------------------------------------

async function backfillPlans(dryRun: boolean): Promise<void> {
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: versions, error } = await db
    .from('fitness_routine_versions')
    .select('*')
    .order('version_number', { ascending: true })

  if (error) throw new Error(`Failed to read routine versions: ${error.message}`)
  if (!versions?.length) {
    log('No routine versions found')
    return
  }

  log(`Found ${versions.length} routine versions`)

  const rows = versions.map(
    (
      version: Record<string, unknown> & {
        id: string
        version_number: number
        name?: string
        change_summary?: string
        created_at: string
      },
      index: number
    ) => {
      const next = versions[index + 1] as { created_at?: string } | undefined
      return {
        source: 'fitness_routine_versions',
        source_id: version.id,
        effective_from: version.created_at?.slice(0, 10) ?? null,
        effective_to: next?.created_at?.slice(0, 10) ?? null,
        name: version.name ?? `Routine v${version.version_number}`,
        summary: version.change_summary ?? null,
        payload: {
          version_number: version.version_number,
          user_profile: version.user_profile,
          injury_protocol: version.injury_protocol,
          schedule: version.schedule,
          daily_routines: version.daily_routines,
          workout_definitions: version.workout_definitions,
        },
      }
    }
  )

  if (dryRun) {
    log(`[dry run] Would insert ${rows.length} plan history rows`)
    return
  }

  // Replace wholesale: this is a derived mirror, not an append-only log.
  await db.from('coach_plan_history').delete().eq('source', 'fitness_routine_versions')

  const { error: insertError } = await db.from('coach_plan_history').insert(rows)
  if (insertError) throw new Error(`Failed to insert plan history: ${insertError.message}`)

  log(`Imported ${rows.length} plan versions into coach_plan_history`)
}

// ---------------------------------------------------------------------------
// apple: export.xml
// ---------------------------------------------------------------------------

const APPLE_TYPE_MAP: Record<string, string> = {
  HKWorkoutActivityTypeRunning: 'running',
  HKWorkoutActivityTypeCycling: 'cycling',
  HKWorkoutActivityTypeSwimming: 'swimming',
  HKWorkoutActivityTypeWalking: 'walking',
  HKWorkoutActivityTypeHiking: 'hiking',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'functionalStrengthTraining',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'traditionalStrengthTraining',
  HKWorkoutActivityTypeCoreTraining: 'coreTraining',
  HKWorkoutActivityTypeHighIntensityIntervalTraining: 'hiit',
  HKWorkoutActivityTypeRowing: 'rowing',
  HKWorkoutActivityTypeElliptical: 'elliptical',
  HKWorkoutActivityTypeStairClimbing: 'stairClimbing',
}

function xmlAttr(line: string, name: string): string | undefined {
  const match = line.match(new RegExp(`${name}="([^"]*)"`))
  return match?.[1]
}

/** Apple writes "2026-09-20 06:12:33 -0500", which Date parses reliably. */
function appleDate(value: string | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function backfillAppleExport(file: string, dryRun: boolean): Promise<void> {
  log(`Streaming ${file}`)

  const stream = createReadStream(file, { encoding: 'utf8' })
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity })

  let seen = 0
  let imported = 0
  let skipped = 0
  let failed = 0

  for await (const line of lines) {
    if (!line.includes('<Workout ')) continue
    seen++

    const rawType = xmlAttr(line, 'workoutActivityType')
    const start = appleDate(xmlAttr(line, 'startDate'))
    const end = appleDate(xmlAttr(line, 'endDate'))

    if (!rawType || !start || !end) {
      failed++
      continue
    }

    const workoutType = APPLE_TYPE_MAP[rawType] ?? 'other'
    const startIso = start.toISOString()
    const endIso = end.toISOString()

    if (await isDuplicate(startIso, endIso)) {
      skipped++
      continue
    }

    const durationRaw = Number(xmlAttr(line, 'duration') ?? '0')
    const durationUnit = xmlAttr(line, 'durationUnit') ?? 'min'
    const duration = durationUnit === 'min' ? durationRaw * 60 : durationRaw

    // Older exports put distance/energy on the element; newer ones use nested
    // <WorkoutStatistics>, which a line-oriented pass cannot see. Summary rows
    // are still worth importing: they carry duration and date, which is what
    // long-range CTL and consistency analysis need.
    const distanceMiles = Number(xmlAttr(line, 'totalDistance') ?? '0')
    const energy = Number(xmlAttr(line, 'totalEnergyBurned') ?? '0')

    if (dryRun) {
      imported++
      continue
    }

    try {
      const saved = await appleHealthService.saveWorkout({
        workout: {
          id: `apple-export-${start.getTime()}-${workoutType}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          workoutType: workoutType as any,
          startDate: startIso,
          endDate: endIso,
          duration: Math.round(duration),
          activeCalories: energy,
          totalCalories: energy,
          distance: distanceMiles > 0 ? distanceMiles * 1609.344 : undefined,
          distanceMiles: distanceMiles > 0 ? distanceMiles : undefined,
          heartRate: { average: 0, min: 0, max: 0, zones: [] },
          heartRateSamples: [],
          source: 'AppleHealthExport',
        },
      })

      rememberImported(startIso, endIso, workoutType, saved.id)
      imported++
    } catch (error) {
      failed++
      if (failed <= 5) {
        log(`  failed ${startIso}: ${error instanceof Error ? error.message : error}`)
      }
    }

    if (imported > 0 && imported % 100 === 0) {
      log(`  ${imported} imported (${seen} seen)`)
    }
  }

  log(
    `Apple export complete: ${imported} imported, ${skipped} duplicates skipped, ${failed} failed (${seen} workouts seen)`
  )
}

// ---------------------------------------------------------------------------
// files: directory of TCX/GPX
// ---------------------------------------------------------------------------

async function backfillFiles(dir: string, dryRun: boolean): Promise<void> {
  const entries = await readdir(dir)
  const candidates = entries.filter((name) => /\.(tcx|gpx)$/i.test(name))
  const fitCount = entries.filter((name) => /\.fit$/i.test(name)).length

  if (fitCount > 0) {
    log(
      `Note: ${fitCount} .fit files ignored. Garmin Connect can export TCX; re-export in that format to include them.`
    )
  }

  log(`Found ${candidates.length} TCX/GPX files in ${dir}`)

  let imported = 0
  let skipped = 0
  let failed = 0

  for (const name of candidates) {
    try {
      const contents = await readFile(path.join(dir, name), 'utf8')
      const { workout, warnings } = parseActivityFile(name, contents)

      if (await isDuplicate(workout.startDate, workout.endDate)) {
        skipped++
        continue
      }

      if (dryRun) {
        imported++
        continue
      }

      const saved = await appleHealthService.saveWorkout({ workout })
      rememberImported(workout.startDate, workout.endDate, workout.workoutType, saved.id)
      imported++

      if (warnings.length) {
        log(`  ${name}: ${warnings.join('; ')}`)
      }
    } catch (error) {
      failed++
      log(`  failed ${name}: ${error instanceof Error ? error.message : error}`)
    }
  }

  log(`Files complete: ${imported} imported, ${skipped} duplicates skipped, ${failed} failed`)
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs()

  if (args.command === 'help') {
    console.log(`
PeteCoach backfill

  plans                      Import fitness_routine_versions into coach_plan_history
  apple --file <export.xml>  Import workouts from an Apple Health export
  files --dir <directory>    Import TCX/GPX files (Garmin Connect export)
  all --file ... --dir ...   Run all three

  --dry-run                  Report what would happen without writing
`)
    return
  }

  if (args.dryRun) log('DRY RUN — no writes')

  const run = args.command
  if (run === 'plans' || run === 'all') {
    await backfillPlans(args.dryRun)
  }
  if (run === 'apple' || run === 'all') {
    if (!args.file) throw new Error('apple requires --file <path to export.xml>')
    await backfillAppleExport(args.file, args.dryRun)
  }
  if (run === 'files' || run === 'all') {
    if (!args.dir) throw new Error('files requires --dir <directory>')
    await backfillFiles(args.dir, args.dryRun)
  }

  log('Done')
}

main().catch((error) => {
  console.error('[backfill] Fatal:', error instanceof Error ? error.message : error)
  process.exit(1)
})
