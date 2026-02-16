/**
 * Configuration utility for environment variables
 * Validates and provides typed access to environment variables
 */

import { z } from 'zod'

// Schema for environment variables
const envSchema = z.object({
  // HUE Bridge
  HUE_BRIDGE_IP: z.string().ip().optional(),
  HUE_BRIDGE_USERNAME: z.string().optional(),
  HUE_CLIENT_KEY: z.string().optional(), // Required for entertainment streaming

  // Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().optional(),

  // Weather
  WEATHER_LATITUDE: z
    .string()
    .regex(/^-?\d+\.?\d*$/)
    .optional(),
  WEATHER_LONGITUDE: z
    .string()
    .regex(/^-?\d+\.?\d*$/)
    .optional(),

  // CTA
  CTA_API_KEY: z.string().optional(),
  CTA_TRAIN_API_KEY: z.string().optional(),

  // Spotify
  NEXT_SPOTIFY_CLIENT_ID: z.string().optional(),
  NEXT_SPOTIFY_CLIENT_SECRET: z.string().optional(),

  // Desktop/Display control
  CONTROL_MY_MONITOR_PATH: z.string().optional(),

  // AI Coach (Anthropic Claude)
  ANTHROPIC_API_KEY: z.string().optional(),

})

// Parse and validate environment variables
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

/**
 * Configuration object with typed environment variables
 */
export const config = {
  hue: {
    bridgeIp: env.HUE_BRIDGE_IP,
    username: env.HUE_BRIDGE_USERNAME,
    clientKey: env.HUE_CLIENT_KEY, // For entertainment streaming
    isConfigured: Boolean(env.HUE_BRIDGE_IP && env.HUE_BRIDGE_USERNAME),
    isEntertainmentConfigured: Boolean(
      env.HUE_BRIDGE_IP && env.HUE_BRIDGE_USERNAME && env.HUE_CLIENT_KEY
    ),
  },
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
    latitude: env.WEATHER_LATITUDE ? parseFloat(env.WEATHER_LATITUDE) : 41.8781, // Chicago default
    longitude: env.WEATHER_LONGITUDE
      ? parseFloat(env.WEATHER_LONGITUDE)
      : -87.6298, // Chicago default
  },
  cta: {
    apiKey: env.CTA_API_KEY,
    trainApiKey: env.CTA_TRAIN_API_KEY,
    isConfigured: Boolean(env.CTA_API_KEY),
    isTrainConfigured: Boolean(env.CTA_TRAIN_API_KEY),
  },
  spotify: {
    clientId: env.NEXT_SPOTIFY_CLIENT_ID,
    clientSecret: env.NEXT_SPOTIFY_CLIENT_SECRET,
    isConfigured: Boolean(
      env.NEXT_SPOTIFY_CLIENT_ID && env.NEXT_SPOTIFY_CLIENT_SECRET
    ),
    scopes: [
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-read-recently-played',
      'user-library-read',
      'playlist-read-private',
      'playlist-read-collaborative',
      'streaming',
      'user-read-email',
      'user-read-private',
    ],
  },
  desktop: {
    // Path to ControlMyMonitor.exe (NirSoft tool for DDC/CI monitor control)
    // Can be set via CONTROL_MY_MONITOR_PATH environment variable
    controlMyMonitorPath: env.CONTROL_MY_MONITOR_PATH || 'D:\\applications\\ControlMyMonitor.exe',
  },
  aiCoach: {
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    isConfigured: Boolean(env.ANTHROPIC_API_KEY),
    defaultModel: 'claude-sonnet-4-20250514' as const,
  },
} as const

/**
 * Check if running in development mode
 */
export const isDev = process.env.NODE_ENV === 'development'

/**
 * Check if running on localhost
 */
export const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local') ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.'))
