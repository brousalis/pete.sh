/**
 * Polar AccessLink client — sleep only, for Apple HealthKit comparison.
 *
 * Leave Polar Flow → Apple Health sleep sync OFF while comparing; otherwise
 * HealthKit mixes sources and petehome-ios prefers Watch samples.
 *
 * AccessLink retains sleep for 28 days. Tokens are typically ~1 year and do
 * not include a refresh_token; re-run scripts/polar-oauth.ts when expired.
 */

import { getSupabaseMedicalClient } from '@/lib/supabase/client'

const ACCESSLINK_BASE = 'https://www.polaraccesslink.com'
const AUTH_URL = 'https://flow.polar.com/oauth2/authorization'
const TOKEN_URL = 'https://polarremote.com/v2/oauth2/token'
const SCOPE = 'accesslink.read_all'

export interface PolarTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  x_user_id: number
  refresh_token?: string
}

export interface PolarSleepNightApi {
  polar_user?: string
  date: string
  sleep_start_time?: string
  sleep_end_time?: string
  device_id?: string
  continuity?: number
  continuity_class?: number
  light_sleep?: number
  deep_sleep?: number
  rem_sleep?: number
  unrecognized_sleep_stage?: number
  sleep_score?: number
  total_interruption_duration?: number
  sleep_charge?: number
  sleep_goal?: number
  sleep_rating?: number
  short_interruption_duration?: number
  long_interruption_duration?: number
  sleep_cycles?: number
  group_duration_score?: number
  group_solidity_score?: number
  group_regeneration_score?: number
  hypnogram?: Record<string, number>
  heart_rate_samples?: Record<string, number>
}

export interface PolarSleepNightRow {
  date: string
  deviceId: string | null
  sleepStart: string | null
  sleepEnd: string | null
  lightSleep: number | null
  deepSleep: number | null
  remSleep: number | null
  unrecognizedSleepStage: number | null
  totalInterruptionDuration: number | null
  shortInterruptionDuration: number | null
  longInterruptionDuration: number | null
  sleepScore: number | null
  continuity: number | null
  continuityClass: number | null
  sleepCharge: number | null
  sleepGoal: number | null
  sleepRating: number | null
  sleepCycles: number | null
  groupDurationScore: number | null
  groupSolidityScore: number | null
  groupRegenerationScore: number | null
  syncedAt: string
}

export interface PolarSleepCompareNight {
  date: string
  hours: number | null
  efficiencyPct: number | null
  lightMinutes: number | null
  deepMinutes: number | null
  remMinutes: number | null
  awakeMinutes: number | null
  unrecognizedMinutes: number | null
  sleepScore: number | null
  start: string | null
  end: string | null
}

interface PolarOauthRow {
  id: string
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  polar_user_id: string | null
  needs_reauth: boolean
}

function polarConfig(): {
  clientId: string
  clientSecret: string
  redirectUri: string
} | null {
  const clientId = process.env.POLAR_CLIENT_ID?.trim()
  const clientSecret = process.env.POLAR_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return {
    clientId,
    clientSecret,
    redirectUri:
      process.env.POLAR_REDIRECT_URI?.trim() || 'http://127.0.0.1:18765/callback',
  }
}

export function isPolarConfigured(): boolean {
  return polarConfig() !== null
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
}

function db() {
  const client = getSupabaseMedicalClient()
  if (!client) {
    throw new Error(
      'Polar sync requires SUPABASE_SERVICE_ROLE_KEY (polar_* tables deny anon).'
    )
  }
  return client
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function secondsToMinutes(seconds: number | null): number | null {
  if (seconds == null) return null
  return Math.round(seconds / 60)
}

/** Asleep seconds = light + deep + rem + unrecognized (Polar Sleep Plus Stages). */
export function polarAsleepSeconds(night: {
  lightSleep: number | null
  deepSleep: number | null
  remSleep: number | null
  unrecognizedSleepStage: number | null
}): number | null {
  const parts = [
    night.lightSleep,
    night.deepSleep,
    night.remSleep,
    night.unrecognizedSleepStage,
  ]
  if (parts.every((p) => p == null)) return null
  return parts.reduce<number>((sum, p) => sum + (p ?? 0), 0)
}

export function mapPolarNightForCompare(row: PolarSleepNightRow): PolarSleepCompareNight {
  const asleep = polarAsleepSeconds(row)
  let efficiencyPct: number | null = null
  if (asleep != null && row.sleepStart && row.sleepEnd) {
    const windowSec =
      (new Date(row.sleepEnd).getTime() - new Date(row.sleepStart).getTime()) / 1000
    if (windowSec > 0) {
      efficiencyPct = Math.round((asleep / windowSec) * 100)
    }
  }

  return {
    date: row.date,
    hours: asleep != null ? Math.round((asleep / 3600) * 10) / 10 : null,
    efficiencyPct,
    lightMinutes: secondsToMinutes(row.lightSleep),
    deepMinutes: secondsToMinutes(row.deepSleep),
    remMinutes: secondsToMinutes(row.remSleep),
    awakeMinutes: secondsToMinutes(row.totalInterruptionDuration),
    unrecognizedMinutes: secondsToMinutes(row.unrecognizedSleepStage),
    sleepScore: row.sleepScore,
    start: row.sleepStart,
    end: row.sleepEnd,
  }
}

function rowFromDb(data: Record<string, unknown>): PolarSleepNightRow {
  return {
    date: String(data.date),
    deviceId: (data.device_id as string | null) ?? null,
    sleepStart: (data.sleep_start as string | null) ?? null,
    sleepEnd: (data.sleep_end as string | null) ?? null,
    lightSleep: toNumber(data.light_sleep),
    deepSleep: toNumber(data.deep_sleep),
    remSleep: toNumber(data.rem_sleep),
    unrecognizedSleepStage: toNumber(data.unrecognized_sleep_stage),
    totalInterruptionDuration: toNumber(data.total_interruption_duration),
    shortInterruptionDuration: toNumber(data.short_interruption_duration),
    longInterruptionDuration: toNumber(data.long_interruption_duration),
    sleepScore: toNumber(data.sleep_score),
    continuity: toNumber(data.continuity),
    continuityClass: toNumber(data.continuity_class),
    sleepCharge: toNumber(data.sleep_charge),
    sleepGoal: toNumber(data.sleep_goal),
    sleepRating: toNumber(data.sleep_rating),
    sleepCycles: toNumber(data.sleep_cycles),
    groupDurationScore: toNumber(data.group_duration_score),
    groupSolidityScore: toNumber(data.group_solidity_score),
    groupRegenerationScore: toNumber(data.group_regeneration_score),
    syncedAt: String(data.synced_at ?? new Date().toISOString()),
  }
}

export function getPolarAuthUrl(state: string): string {
  const cfg = polarConfig()
  if (!cfg) throw new Error('POLAR_CLIENT_ID and POLAR_CLIENT_SECRET are required')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: SCOPE,
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

export function getPolarRedirectUri(): string {
  return polarConfig()?.redirectUri ?? 'http://127.0.0.1:18765/callback'
}

export async function exchangePolarCode(code: string): Promise<PolarTokenResponse> {
  const cfg = polarConfig()
  if (!cfg) throw new Error('POLAR_CLIENT_ID and POLAR_CLIENT_SECRET are required')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(cfg.clientId, cfg.clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })

  const json = (await res.json()) as PolarTokenResponse & { error?: string; error_description?: string }
  if (!res.ok || json.error) {
    throw new Error(
      `Polar token exchange failed: ${json.error ?? res.status} ${json.error_description ?? ''}`.trim()
    )
  }
  return json
}

/** Persist tokens after OAuth. Replaces any existing single row. */
export async function savePolarOAuth(tokens: PolarTokenResponse): Promise<void> {
  const supabase = db()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const polarUserId = String(tokens.x_user_id)
  const payload = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: expiresAt,
    polar_user_id: polarUserId,
    needs_reauth: false,
    connected_at: new Date().toISOString(),
  }

  const existing = await getStoredOAuth()
  if (existing) {
    const { error } = await supabase.from('polar_oauth').update(payload).eq('id', existing.id)
    if (error) throw new Error(`Failed to update polar_oauth: ${error.message}`)
    return
  }

  const { error } = await supabase.from('polar_oauth').insert(payload)
  if (error) throw new Error(`Failed to save polar_oauth: ${error.message}`)
}

/**
 * Register the AccessLink user after OAuth.
 * 409 = already registered — treat as success and keep x_user_id.
 */
export async function registerPolarUser(
  accessToken: string,
  memberId: string = 'petehome'
): Promise<{ polarUserId: string; alreadyRegistered: boolean }> {
  const res = await fetch(`${ACCESSLINK_BASE}/v3/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ 'member-id': memberId }),
  })

  if (res.status === 409) {
    const oauth = await getStoredOAuth()
    return {
      polarUserId: oauth?.polar_user_id ?? 'unknown',
      alreadyRegistered: true,
    }
  }

  const json = (await res.json()) as {
    'polar-user-id'?: number
    error?: string
    message?: string
  }

  if (!res.ok) {
    throw new Error(
      `Polar user register failed (${res.status}): ${json.error ?? json.message ?? res.statusText}`
    )
  }

  const polarUserId = String(json['polar-user-id'] ?? '')
  if (polarUserId) {
    await db().from('polar_oauth').update({ polar_user_id: polarUserId }).neq('id', '')
  }

  return { polarUserId, alreadyRegistered: false }
}

async function getStoredOAuth(): Promise<PolarOauthRow | null> {
  const { data, error } = await db()
    .from('polar_oauth')
    .select('id, access_token, refresh_token, expires_at, polar_user_id, needs_reauth')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`polar_oauth read failed: ${error.message}`)
  return (data as PolarOauthRow | null) ?? null
}

async function markNeedsReauth(): Promise<void> {
  await db().from('polar_oauth').update({ needs_reauth: true }).neq('id', '')
}

async function getValidAccessToken(): Promise<string | null> {
  const row = await getStoredOAuth()
  if (!row || row.needs_reauth) return null

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now() + 60_000) {
    await markNeedsReauth()
    return null
  }

  return row.access_token
}

async function fetchSleepNights(accessToken: string): Promise<PolarSleepNightApi[]> {
  const res = await fetch(`${ACCESSLINK_BASE}/v3/users/sleep`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (res.status === 401 || res.status === 403) {
    await markNeedsReauth()
    throw new Error(`Polar sleep fetch unauthorized (${res.status}) — re-run polar-oauth`)
  }

  if (res.status === 204) return []

  const json = (await res.json()) as { nights?: PolarSleepNightApi[]; error?: string }
  if (!res.ok) {
    throw new Error(`Polar sleep list failed (${res.status}): ${json.error ?? res.statusText}`)
  }

  return json.nights ?? []
}

function upsertPayload(night: PolarSleepNightApi): Record<string, unknown> {
  return {
    date: night.date,
    device_id: night.device_id ?? null,
    sleep_start: night.sleep_start_time ?? null,
    sleep_end: night.sleep_end_time ?? null,
    light_sleep: night.light_sleep ?? null,
    deep_sleep: night.deep_sleep ?? null,
    rem_sleep: night.rem_sleep ?? null,
    unrecognized_sleep_stage: night.unrecognized_sleep_stage ?? null,
    total_interruption_duration: night.total_interruption_duration ?? null,
    short_interruption_duration: night.short_interruption_duration ?? null,
    long_interruption_duration: night.long_interruption_duration ?? null,
    sleep_score: night.sleep_score ?? null,
    continuity: night.continuity ?? null,
    continuity_class: night.continuity_class ?? null,
    sleep_charge: night.sleep_charge ?? null,
    sleep_goal: night.sleep_goal ?? null,
    sleep_rating: night.sleep_rating ?? null,
    sleep_cycles: night.sleep_cycles ?? null,
    group_duration_score: night.group_duration_score ?? null,
    group_solidity_score: night.group_solidity_score ?? null,
    group_regeneration_score: night.group_regeneration_score ?? null,
    hypnogram: night.hypnogram ?? null,
    heart_rate_samples: night.heart_rate_samples ?? null,
    raw: night,
    synced_at: new Date().toISOString(),
  }
}

/** Pull last 28 nights from AccessLink and upsert. */
export async function syncPolarSleep(): Promise<{
  upserted: number
  skipped: boolean
  reason?: string
}> {
  if (!isPolarConfigured()) {
    return { upserted: 0, skipped: true, reason: 'POLAR_CLIENT_ID/SECRET not set' }
  }

  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    return {
      upserted: 0,
      skipped: true,
      reason: 'No Polar OAuth tokens (or needs_reauth) — run scripts/polar-oauth.ts',
    }
  }

  const nights = await fetchSleepNights(accessToken)
  if (nights.length === 0) {
    return { upserted: 0, skipped: false, reason: 'No sleep nights returned (last 28 days)' }
  }

  const rows = nights.map(upsertPayload)
  const { error } = await db().from('polar_sleep_nights').upsert(rows, { onConflict: 'date' })
  if (error) throw new Error(`polar_sleep_nights upsert failed: ${error.message}`)

  return { upserted: rows.length, skipped: false }
}

export async function getPolarSleepNight(date: string): Promise<PolarSleepNightRow | null> {
  const { data, error } = await db()
    .from('polar_sleep_nights')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (error) throw new Error(`polar_sleep_nights read failed: ${error.message}`)
  if (!data) return null
  return rowFromDb(data as Record<string, unknown>)
}

export async function getPolarSleepNightsInRange(
  startDate: string,
  endDate: string
): Promise<PolarSleepNightRow[]> {
  const { data, error } = await db()
    .from('polar_sleep_nights')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw new Error(`polar_sleep_nights range read failed: ${error.message}`)
  return ((data as Record<string, unknown>[] | null) ?? []).map(rowFromDb)
}

export async function getPolarOAuthStatus(): Promise<{
  connected: boolean
  needsReauth: boolean
  polarUserId: string | null
  expiresAt: string | null
} | null> {
  if (!isPolarConfigured()) return null
  const row = await getStoredOAuth()
  if (!row) {
    return { connected: false, needsReauth: false, polarUserId: null, expiresAt: null }
  }
  return {
    connected: true,
    needsReauth: row.needs_reauth,
    polarUserId: row.polar_user_id,
    expiresAt: row.expires_at,
  }
}
