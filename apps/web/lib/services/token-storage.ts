/**
 * Server-side token storage for OAuth tokens
 *
 * Stores tokens in a JSON file on disk instead of cookies.
 * This solves the cross-origin cookie problem when pete.sh makes
 * requests to localhost:3000 - cookies set on localhost aren't
 * sent with cross-origin fetch requests.
 *
 * The local server can read/write this file regardless of which
 * domain initiated the request.
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

// Store tokens in the project root (gitignored)
const TOKEN_FILE = path.join(process.cwd(), '.tokens.json')

/**
 * Read all tokens from storage
 */
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

/**
 * Write tokens to storage
 * Uses fsync to ensure data is flushed to disk (prevents race conditions)
 */
function writeTokens(tokens: StoredTokens): void {
  try {
    const data = JSON.stringify(tokens, null, 2)
    // Open, write, fsync, close - ensures data is on disk before returning
    const fd = fs.openSync(TOKEN_FILE, 'w')
    fs.writeSync(fd, data, 0, 'utf-8')
    fs.fsyncSync(fd)
    fs.closeSync(fd)
    console.log('[TokenStorage] Tokens written and synced to disk')
  } catch (error) {
    console.error('[TokenStorage] Error writing tokens:', error)
  }
}

// ============================================
// Google Calendar Tokens
// ============================================

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

  // Check if access token is expired
  if (calendarTokens.expiry_date && Date.now() > calendarTokens.expiry_date) {
    console.log('[TokenStorage] Google Calendar access token expired')
    return {
      accessToken: null,
      refreshToken: calendarTokens.refresh_token || null,
      expiryDate: null
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
    refresh_token: tokens.refresh_token || allTokens.google_calendar?.refresh_token || undefined,
    expiry_date: tokens.expiry_date || undefined,
    updated_at: new Date().toISOString(),
  }

  writeTokens(allTokens)
  console.log('[TokenStorage] Google Calendar tokens saved')
}

export function clearGoogleCalendarTokens(): void {
  const tokens = readTokens()
  delete tokens.google_calendar
  writeTokens(tokens)
  console.log('[TokenStorage] Google Calendar tokens cleared')
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

  // Check if access token is expired
  if (spotifyTokens.expiry_date && Date.now() > spotifyTokens.expiry_date) {
    console.log('[TokenStorage] Spotify access token expired')
    return {
      accessToken: null,
      refreshToken: spotifyTokens.refresh_token || null,
      expiryDate: null
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
  console.log('[TokenStorage] Spotify tokens saved')
}

export function clearSpotifyTokens(): void {
  const tokens = readTokens()
  delete tokens.spotify
  writeTokens(tokens)
  console.log('[TokenStorage] Spotify tokens cleared')
}
