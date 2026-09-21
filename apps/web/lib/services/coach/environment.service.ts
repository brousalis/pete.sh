/**
 * Environmental context.
 *
 * Wind is the reason this exists. Without a power meter, bike speed is the
 * only performance signal available, and a 10 mph headwind on the Lakefront
 * changes required power at 20 mph by well over 100 W. Fetching wind is what
 * stops the coach reading a windy Tuesday as a loss of fitness.
 *
 * Lake temperature decides when open-water swimming starts and whether the
 * race will be wetsuit legal, which changes the swim split materially.
 */

import { config } from '@/lib/config'
import { cachedFetch as fetch } from './fetch-cache'

export interface WeatherContext {
  date: string
  summary: string
  temperatureF: number | null
  feelsLikeF: number | null
  windMph: number | null
  windDirection: string | null
  windGustMph: number | null
  precipitationChance: number | null
  humidity: number | null
  airQuality: number | null
  sunrise: string | null
  sunset: string | null
  alerts: string[]
  /** Practical guidance the coach can act on. */
  trainingNotes: string[]
}

const CHICAGO_LAT = config.weather.latitude
const CHICAGO_LON = config.weather.longitude

/**
 * Forecast from Open-Meteo.
 *
 * The existing weather.service uses api.weather.gov, which is authoritative
 * for alerts but does not expose hourly wind and AQI in a convenient form.
 * Both are used: NWS for alerts, Open-Meteo for the numbers.
 */
export async function getWeatherContext(date?: string): Promise<WeatherContext> {
  const target = date ?? new Date().toISOString().slice(0, 10)

  const context: WeatherContext = {
    date: target,
    summary: 'Forecast unavailable',
    temperatureF: null,
    feelsLikeF: null,
    windMph: null,
    windDirection: null,
    windGustMph: null,
    precipitationChance: null,
    humidity: null,
    airQuality: null,
    sunrise: null,
    sunset: null,
    alerts: [],
    trainingNotes: [],
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(CHICAGO_LAT))
    url.searchParams.set('longitude', String(CHICAGO_LON))
    url.searchParams.set(
      'daily',
      'temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset'
    )
    url.searchParams.set('temperature_unit', 'fahrenheit')
    url.searchParams.set('wind_speed_unit', 'mph')
    url.searchParams.set('timezone', 'America/Chicago')
    url.searchParams.set('start_date', target)
    url.searchParams.set('end_date', target)

    const response = await fetch(url, { revalidateSeconds: 1800 })
    if (response.ok) {
      const payload = (await response.json()) as {
        daily?: Record<string, (number | string)[]>
      }
      const daily = payload.daily

      if (daily) {
        const at = <T>(key: string): T | null => (daily[key]?.[0] as T | undefined) ?? null

        const high = at<number>('temperature_2m_max')
        const low = at<number>('temperature_2m_min')

        context.temperatureF = high
        context.feelsLikeF = at<number>('apparent_temperature_max')
        context.windMph = at<number>('wind_speed_10m_max')
        context.windGustMph = at<number>('wind_gusts_10m_max')
        context.precipitationChance = at<number>('precipitation_probability_max')

        const direction = at<number>('wind_direction_10m_dominant')
        context.windDirection = direction != null ? compassPoint(direction) : null

        context.sunrise = formatTimeOfDay(at<string>('sunrise'))
        context.sunset = formatTimeOfDay(at<string>('sunset'))

        if (high != null && low != null) {
          context.summary = `${Math.round(low)}–${Math.round(high)}°F`
        }
      }
    }
  } catch (error) {
    console.error('[coach] Weather fetch failed:', error)
  }

  try {
    const aqiUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
    aqiUrl.searchParams.set('latitude', String(CHICAGO_LAT))
    aqiUrl.searchParams.set('longitude', String(CHICAGO_LON))
    aqiUrl.searchParams.set('current', 'us_aqi')
    aqiUrl.searchParams.set('timezone', 'America/Chicago')

    const response = await fetch(aqiUrl, { revalidateSeconds: 3600 })
    if (response.ok) {
      const payload = (await response.json()) as { current?: { us_aqi?: number } }
      context.airQuality = payload.current?.us_aqi ?? null
    }
  } catch {
    // AQI is a nice-to-have; a failure here should not affect the briefing.
  }

  context.alerts = await getNwsAlerts()
  context.trainingNotes = buildTrainingNotes(context)

  return context
}

async function getNwsAlerts(): Promise<string[]> {
  try {
    const url = `https://api.weather.gov/alerts/active?point=${CHICAGO_LAT},${CHICAGO_LON}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'petehome (pete.sh)' },
      revalidateSeconds: 900,
    })

    if (!response.ok) return []

    const payload = (await response.json()) as {
      features?: { properties?: { event?: string; severity?: string } }[]
    }

    return (payload.features ?? [])
      .map((feature) => feature.properties?.event)
      .filter((event): event is string => Boolean(event))
      .slice(0, 5)
  } catch {
    return []
  }
}

/**
 * Turn conditions into decisions.
 *
 * The coach can reason about raw numbers, but encoding the recurring Chicago
 * ones here keeps them consistent and off the token budget.
 */
function buildTrainingNotes(context: WeatherContext): string[] {
  const notes: string[] = []

  if (context.windMph != null && context.windMph >= 15) {
    notes.push(
      `Wind ${Math.round(context.windMph)} mph${context.windDirection ? ` from the ${context.windDirection}` : ''}. Judge the ride on effort, not speed — the pace will read slow on the outbound leg regardless of fitness.`
    )
  }

  if (context.temperatureF != null) {
    if (context.temperatureF >= 85) {
      notes.push('Hot. Move the session earlier, add fluid and electrolytes, and expect heart rate to run high for the same effort.')
    } else if (context.temperatureF <= 25) {
      notes.push('Cold. The Lakefront is likely icy; a treadmill or indoor trainer is the safer choice with a knee in rehab.')
    } else if (context.temperatureF <= 35) {
      notes.push('Near freezing. Extend the warm-up before any intensity and check the path for ice.')
    }
  }

  if (context.precipitationChance != null && context.precipitationChance >= 60) {
    notes.push('Rain likely. Wet descents on the Lakefront path are a crash risk; consider the trainer.')
  }

  if (context.airQuality != null && context.airQuality > 100) {
    notes.push(`AQI ${Math.round(context.airQuality)}. Move hard aerobic work indoors.`)
  }

  if (context.alerts.length) {
    notes.push(`Active weather alerts: ${context.alerts.join(', ')}.`)
  }

  return notes
}

// ---------------------------------------------------------------------------
// Lake Michigan
// ---------------------------------------------------------------------------

export interface LakeConditions {
  waterTempF: number | null
  observedAt: string | null
  wetsuitLegal: boolean | null
  openWaterViable: boolean
  note: string
}

/**
 * Nearshore water temperature from NOAA NDBC.
 *
 * Race-day water is typically 65–74°F and therefore wetsuit legal, which is
 * worth roughly 4% swim speed. Below about 60°F open-water training is
 * unpleasant and below 55°F it is a safety question rather than a preference.
 */
export async function getLakeConditions(): Promise<LakeConditions> {
  const stationId = config.coach.noaaStationId

  try {
    const response = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`, {
      revalidateSeconds: 3600,
    })

    if (!response.ok) throw new Error(`NDBC returned ${response.status}`)

    const text = await response.text()
    const lines = text.split('\n').filter((line) => line.trim() && !line.startsWith('#'))

    // Columns: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP ...
    for (const line of lines) {
      const fields = line.trim().split(/\s+/)
      const waterTempC = Number(fields[14])

      if (Number.isFinite(waterTempC) && waterTempC < 99) {
        const waterTempF = waterTempC * 1.8 + 32
        const observedAt = `${fields[0]}-${fields[1]}-${fields[2]} ${fields[3]}:${fields[4]} UTC`

        return {
          waterTempF: Math.round(waterTempF * 10) / 10,
          observedAt,
          // USAT: wetsuits are permitted below 78°F.
          wetsuitLegal: waterTempF < 78,
          openWaterViable: waterTempF >= 60,
          note: buildLakeNote(waterTempF),
        }
      }
    }

    throw new Error('No valid water temperature in the feed')
  } catch (error) {
    // The buoy is pulled from the water over winter, so this is expected for
    // part of the year rather than an error worth surfacing.
    return {
      waterTempF: null,
      observedAt: null,
      wetsuitLegal: null,
      openWaterViable: false,
      note:
        error instanceof Error && error.message.includes('404')
          ? 'Buoy offline for the season. Assume open-water swimming is unavailable until spring.'
          : 'Lake temperature unavailable.',
    }
  }
}

function buildLakeNote(tempF: number): string {
  if (tempF >= 70) return 'Comfortable for open water. Wetsuit optional but legal and faster.'
  if (tempF >= 65) return 'Good open-water conditions in a wetsuit. Close to expected race-day temperature.'
  if (tempF >= 60) return 'Cold but swimmable in a full wetsuit. Keep sessions short and acclimatise gradually.'
  if (tempF >= 55) return 'Very cold. Only with a wetsuit, neoprene cap, and someone on shore.'
  return 'Too cold for open-water training. Stay in the pool.'
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface CalendarWindow {
  date: string
  busyBlocks: { start: string; end: string; summary: string }[]
  /** Largest uninterrupted gap during waking hours, in minutes. */
  longestFreeMinutes: number
}

/**
 * Read the athlete's calendar so the planner can avoid scheduling a two-hour
 * ride into a meeting block.
 *
 * Reuses the existing Google Calendar service; returns an empty result rather
 * than failing when it is not configured.
 */
export async function getCalendarWindows(days: number): Promise<CalendarWindow[]> {
  try {
    const { CalendarService } = await import('@/lib/services/calendar.service')

    const service = new CalendarService()
    if (!service.isConfigured()) return []

    // Roughly six events a day is enough to find the free windows.
    const events = await service.getEvents('primary', Math.min(100, days * 6))
    if (!Array.isArray(events)) return []

    const byDate = new Map<string, { start: string; end: string; summary: string }[]>()

    for (const event of events) {
      const start = event?.start?.dateTime ?? event?.start
      const end = event?.end?.dateTime ?? event?.end
      if (typeof start !== 'string' || typeof end !== 'string') continue

      const date = start.slice(0, 10)
      const list = byDate.get(date) ?? []
      list.push({ start, end, summary: String(event?.summary ?? 'Busy') })
      byDate.set(date, list)
    }

    return [...byDate].map(([date, busyBlocks]) => ({
      date,
      busyBlocks: busyBlocks.sort((a, b) => a.start.localeCompare(b.start)),
      longestFreeMinutes: longestGapMinutes(busyBlocks),
    }))
  } catch {
    return []
  }
}

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]

function compassPoint(degrees: number): string {
  const index = Math.round(((degrees % 360) / 22.5)) % 16
  return COMPASS_POINTS[index] ?? 'N'
}

/** Open-Meteo returns local ISO timestamps; keep just the clock time. */
function formatTimeOfDay(iso: string | null): string | null {
  if (!iso) return null
  const time = iso.includes('T') ? iso.split('T')[1] : iso
  return time?.slice(0, 5) ?? null
}

/** Largest free gap between 05:00 and 21:00. */
function longestGapMinutes(blocks: { start: string; end: string }[]): number {
  if (blocks.length === 0) return 16 * 60

  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start))
  const first = sorted[0]
  if (!first) return 16 * 60

  const day = first.start.slice(0, 10)
  const dayStart = new Date(`${day}T05:00:00`).getTime()
  const dayEnd = new Date(`${day}T21:00:00`).getTime()

  let cursor = dayStart
  let longest = 0

  for (const block of sorted) {
    const start = new Date(block.start).getTime()
    const end = new Date(block.end).getTime()

    if (start > cursor) longest = Math.max(longest, start - cursor)
    cursor = Math.max(cursor, end)
  }

  if (dayEnd > cursor) longest = Math.max(longest, dayEnd - cursor)

  return Math.round(longest / 60000)
}
