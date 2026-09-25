/**
 * Server-side token storage for Google Calendar and Spotify OAuth.
 * Tokens live in `.tokens.json` (gitignored) so local HTTPS / LAN clients
 * can share credentials without cookie cross-origin issues.
 */

import fs from 'fs'
import path from 'path'

interface StoredTokens {
  google_calendar?: {
    access_token: string
    refresh_token?: string
    expiry_date?: number
    updated_at: string
  }
  spotify?: {
    access_token: string
    refresh_token?: string
    expiry_date?: number
    updated_at: string
  }
}

const TOKEN_FILE = path.join(process.cwd(), '.tokens.json')

function readTokens(): StoredTokens {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = fs.readFileSync(TOKEN_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('[TokenStorage] Error reading tokens:', error)
  }
  return {}
}

function writeTokens(tokens: StoredTokens): void {
  try {
    const data = JSON.stringify(tokens, null, 2)
    const fd = fs.openSync(TOKEN_FILE, 'w')
    fs.writeSync(fd, data, 0, 'utf-8')
    fs.fsyncSync(fd)
    fs.closeSync(fd)
  } catch (error) {
    console.error('[TokenStorage] Error writing tokens:', error)
  }
}

export function getGoogleCalendarTokens(): {
  accessToken: string | null
  refreshToken: string | null
  expiryDate: number | null
} {
  const tokens = readTokens()
  const calendarTokens = tokens.google_calendar

  if (!calendarTokens) {
    return { accessToken: null, refreshToken: null, expiryDate: null }
  }

  if (calendarTokens.expiry_date && Date.now() > calendarTokens.expiry_date) {
    return {
      accessToken: null,
      refreshToken: calendarTokens.refresh_token || null,
      expiryDate: null,
    }
  }

  return {
    accessToken: calendarTokens.access_token || null,
    refreshToken: calendarTokens.refresh_token || null,
    expiryDate: calendarTokens.expiry_date || null,
  }
}

export function setGoogleCalendarTokens(tokens: {
  access_token: string
  refresh_token?: string | null
  expiry_date?: number | null
}): void {
  const allTokens = readTokens()

  allTokens.google_calendar = {
    access_token: tokens.access_token,
    refresh_token:
      tokens.refresh_token || allTokens.google_calendar?.refresh_token || undefined,
    expiry_date: tokens.expiry_date || undefined,
    updated_at: new Date().toISOString(),
  }

  writeTokens(allTokens)
}

export function clearGoogleCalendarTokens(): void {
  const tokens = readTokens()
  delete tokens.google_calendar
  writeTokens(tokens)
}

export function hasLegacyGoogleCalendarTokens(): boolean {
  const tokens = readTokens()
  return Boolean(
    tokens.google_calendar?.access_token || tokens.google_calendar?.refresh_token
  )
}

export function getLegacyGoogleCalendarTokensRaw(): {
  accessToken: string | null
  refreshToken: string | null
  expiryDate: number | null
} {
  const tokens = readTokens()
  const ct = tokens.google_calendar
  if (!ct) return { accessToken: null, refreshToken: null, expiryDate: null }
  return {
    accessToken: ct.access_token || null,
    refreshToken: ct.refresh_token || null,
    expiryDate: ct.expiry_date || null,
  }
}

// ============================================
// Spotify Tokens
// ============================================

export function getSpotifyTokens(): {
  accessToken: string | null
  refreshToken: string | null
  expiryDate: number | null
} {
  const tokens = readTokens()
  const spotifyTokens = tokens.spotify

  if (!spotifyTokens) {
    return { accessToken: null, refreshToken: null, expiryDate: null }
  }

  if (spotifyTokens.expiry_date && Date.now() > spotifyTokens.expiry_date) {
    return {
      accessToken: null,
      refreshToken: spotifyTokens.refresh_token || null,
      expiryDate: null,
    }
  }

  return {
    accessToken: spotifyTokens.access_token || null,
    refreshToken: spotifyTokens.refresh_token || null,
    expiryDate: spotifyTokens.expiry_date || null,
  }
}

export function setSpotifyTokens(tokens: {
  access_token: string
  refresh_token?: string | null
  expiry_date?: number | null
}): void {
  const allTokens = readTokens()

  allTokens.spotify = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || allTokens.spotify?.refresh_token || undefined,
    expiry_date: tokens.expiry_date || undefined,
    updated_at: new Date().toISOString(),
  }

  writeTokens(allTokens)
}

export function clearSpotifyTokens(): void {
  const tokens = readTokens()
  delete tokens.spotify
  writeTokens(tokens)
}
