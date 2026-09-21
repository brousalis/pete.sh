/**
 * Configuration for PeteCoach / petehome web.
 */

import { z } from 'zod'

const envSchema = z.object({
  // Google Calendar (coach get_calendar tool)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().optional(),

  // Weather defaults (Open-Meteo / NWS via coach environment service)
  WEATHER_LATITUDE: z
    .string()
    .regex(/^-?\d+\.?\d*$/)
    .optional(),
  WEATHER_LONGITUDE: z
    .string()
    .regex(/^-?\d+\.?\d*$/)
    .optional(),

  ANTHROPIC_API_KEY: z.string().optional(),

  COACH_SESSION_SECRET: z.string().min(32).optional(),
  COACH_ACCESS_CODE: z.string().min(8).optional(),
  COACH_API_KEY: z.string().min(24).optional(),
  COACH_WORKER_URL: z.string().url().optional(),
  COACH_DAILY_BUDGET_USD: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  COACH_MONTHLY_BUDGET_USD: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  VOYAGE_API_KEY: z.string().optional(),
  NOAA_STATION_ID: z.string().optional(),
})

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.warn(
      'Environment variable validation warnings:',
      parsed.error.format()
    )
  }

  return parsed.success ? parsed.data : {}
}

const env = parseEnv()

export const config = {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    apiKey: env.GOOGLE_API_KEY,
    calendarId: env.GOOGLE_CALENDAR_ID || 'primary',
    isConfigured: Boolean(
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_API_KEY
    ),
  },
  weather: {
    latitude: env.WEATHER_LATITUDE ? parseFloat(env.WEATHER_LATITUDE) : 41.8781,
    longitude: env.WEATHER_LONGITUDE
      ? parseFloat(env.WEATHER_LONGITUDE)
      : -87.6298,
  },
  coach: {
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    apiKey: env.COACH_API_KEY,
    workerUrl: env.COACH_WORKER_URL,
    voyageApiKey: env.VOYAGE_API_KEY,
    noaaStationId: env.NOAA_STATION_ID || '45198',
    dailyBudgetUsd: env.COACH_DAILY_BUDGET_USD ? parseFloat(env.COACH_DAILY_BUDGET_USD) : 8,
    monthlyBudgetUsd: env.COACH_MONTHLY_BUDGET_USD
      ? parseFloat(env.COACH_MONTHLY_BUDGET_USD)
      : 120,
    isConfigured: Boolean(env.ANTHROPIC_API_KEY),
    isAuthConfigured: true,
    isEmbeddingConfigured: Boolean(env.VOYAGE_API_KEY),
  },
} as const

export const isDev = process.env.NODE_ENV === 'development'

export const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local') ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.'))
