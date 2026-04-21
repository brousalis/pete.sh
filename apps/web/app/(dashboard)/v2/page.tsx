import { DashboardPerfBoundary } from '@/components/dashboard-v2/dashboard-perf-boundary'
import { DashboardV2 } from '@/components/dashboard-v2/dashboard-v2'
import type { DashboardV2SeedData } from '@/hooks/use-dashboard-v2-data'
import { getFitnessAdapter } from '@/lib/adapters/fitness.adapter'
import { getDashboardAggregate } from '@/lib/server/dashboard-aggregate'
import type { DayOfWeek } from '@/lib/types/fitness.types'
import { format, startOfWeek } from 'date-fns'

function getDayOfWeek(date: Date): DayOfWeek {
  return format(date, 'EEEE').toLowerCase() as DayOfWeek
}

function parseDayParam(dayParam: string | undefined): Date {
  if (dayParam) {
    const parsed = new Date(dayParam + 'T00:00:00')
    if (!isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

async function buildSeed(selectedDate: Date): Promise<DashboardV2SeedData> {
  const day = getDayOfWeek(selectedDate)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const fitnessAdapter = getFitnessAdapter()
  const weekNumber = fitnessAdapter.getCurrentWeekNumber()
  const year = selectedDate.getFullYear()

  const { data, errors } = await getDashboardAggregate({
    day,
    weekStart,
    weekNumber,
    year,
  })

  return {
    data: {
      ...data,
      spotifyTrack: null,
    },
    errors,
    selectedDateISO: selectedDate.toISOString(),
    weekStartISO: weekStartStr,
  }
}

export default async function V2DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>
}) {
  const params = await searchParams
  const selectedDate = parseDayParam(params.day)

  let seed: DashboardV2SeedData | undefined
  try {
    seed = await buildSeed(selectedDate)
  } catch (err) {
    console.error('[v2] Failed to build seed data on the server', err)
    seed = undefined
  }

  // Emit resource hints so browser opens TCP + TLS to Supabase before the first
  // client-side fetch fires. Rendered in the document <head> via React's hoist.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <>
      {supabaseUrl ? (
        <>
          <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
          <link rel="dns-prefetch" href={supabaseUrl} />
        </>
      ) : null}
      <DashboardPerfBoundary />
      <div className="-m-3 sm:-m-5 md:-mx-6 md:-my-6 h-[calc(100%+1.5rem)] sm:h-[calc(100%+2.5rem)] md:h-[calc(100%+3rem)]">
        <DashboardV2 seed={seed} />
      </div>
    </>
  )
}
