/**
 * PT player session persistence + protocol lookup for the interactive player.
 */

import { createInitialState, applyCommand, tick } from '@/lib/coach/pt/pt-state-machine'
import type { PtPlayerCommand, PtPlayerState, PtProtocolInput } from '@/lib/coach/pt/pt-types'
import { coachDb, getPtProtocolBySlug, type PtProtocol } from '@/lib/services/coach/coach-data.service'

function toInput(protocol: PtProtocol): PtProtocolInput {
  return {
    id: protocol.id,
    slug: protocol.slug,
    name: protocol.name,
    timeOfDay: protocol.timeOfDay,
    durationMinutes: protocol.durationMinutes,
    description: protocol.description,
    items: protocol.items.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      category: item.category,
      prescription: item.prescription,
      cues: item.cues,
      demoYoutubeId: item.demoYoutubeId,
      demoStartSeconds: item.demoStartSeconds,
      demoLoopSeconds: item.demoLoopSeconds,
    })),
  }
}

export async function loadProtocolForPlayer(slug: string): Promise<PtProtocolInput | null> {
  const protocol = await getPtProtocolBySlug(slug)
  if (!protocol) return null
  return toInput(protocol)
}

export interface PtPlayerSessionRow {
  id: string
  protocolId: string
  protocolSlug: string
  sessionDate: string
  state: PtPlayerState
  status: 'active' | 'completed' | 'abandoned'
  updatedAt: string
  expiresAt: string
}

function mapSession(row: Record<string, unknown>): PtPlayerSessionRow {
  return {
    id: row.id as string,
    protocolId: row.protocol_id as string,
    protocolSlug: row.protocol_slug as string,
    sessionDate: row.session_date as string,
    state: row.state as PtPlayerState,
    status: row.status as PtPlayerSessionRow['status'],
    updatedAt: row.updated_at as string,
    expiresAt: row.expires_at as string,
  }
}

export async function createPlayerSession(slug: string): Promise<PtPlayerSessionRow> {
  const protocol = await loadProtocolForPlayer(slug)
  if (!protocol) throw new Error(`Unknown PT protocol: ${slug}`)

  const state = createInitialState(protocol)
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  const { data, error } = await coachDb()
    .from('coach_pt_player_session')
    .insert({
      protocol_id: protocol.id,
      protocol_slug: protocol.slug,
      session_date: date,
      state,
      status: 'active',
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create PT session: ${error.message}`)
  return mapSession(data as Record<string, unknown>)
}

export async function getPlayerSession(id: string): Promise<PtPlayerSessionRow | null> {
  const { data, error } = await coachDb()
    .from('coach_pt_player_session')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Failed to load PT session: ${error.message}`)
  if (!data) return null

  const session = mapSession(data as Record<string, unknown>)
  if (new Date(session.expiresAt).getTime() < Date.now() && session.status === 'active') {
    return { ...session, status: 'abandoned' }
  }
  return session
}

export async function applyPlayerCommand(
  id: string,
  command: PtPlayerCommand
): Promise<PtPlayerSessionRow> {
  const session = await getPlayerSession(id)
  if (!session) throw new Error('Session not found')
  if (session.status !== 'active') return session

  const at = new Date()
  let next = tick(session.state, at)
  next = applyCommand(next, command, at)

  let status: PtPlayerSessionRow['status'] = 'active'
  if (next.status === 'completed') status = 'completed'
  if (next.status === 'abandoned') status = 'abandoned'

  const { data, error } = await coachDb()
    .from('coach_pt_player_session')
    .update({ state: next, status })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update PT session: ${error.message}`)
  return mapSession(data as Record<string, unknown>)
}

/** Advance timed phases without a remote command (display poll helper). */
export async function tickPlayerSession(id: string): Promise<PtPlayerSessionRow> {
  const session = await getPlayerSession(id)
  if (!session) throw new Error('Session not found')
  if (session.status !== 'active') return session

  const at = new Date()
  const next = tick(session.state, at)
  if (next.stepIndex === session.state.stepIndex && next.status === session.state.status) {
    // Still stamp serverTime so clients can skew-correct.
    if (next.serverTime === session.state.serverTime) return session
  }

  let status: PtPlayerSessionRow['status'] = 'active'
  if (next.status === 'completed') status = 'completed'
  if (next.status === 'abandoned') status = 'abandoned'

  const { data, error } = await coachDb()
    .from('coach_pt_player_session')
    .update({ state: next, status })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to tick PT session: ${error.message}`)
  return mapSession(data as Record<string, unknown>)
}

export async function recordPtCompletion(input: {
  protocolId: string
  completedItemIds: string[]
  skipped?: boolean
  notes?: string
}): Promise<void> {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const { error } = await coachDb().from('coach_pt_completion').upsert(
    {
      protocol_id: input.protocolId,
      completed_date: date,
      completed_items: input.completedItemIds,
      skipped: input.skipped ?? false,
      notes: input.notes ?? null,
    },
    { onConflict: 'protocol_id,completed_date' }
  )
  if (error) throw new Error(`Failed to record PT completion: ${error.message}`)
}
