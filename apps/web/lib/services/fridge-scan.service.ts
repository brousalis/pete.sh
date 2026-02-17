/**
 * Fridge Scan Service
 * Handles AI-powered ingredient identification from photos and voice transcripts,
 * plus CRUD operations for scan persistence in Supabase.
 */

import { config } from '@/lib/config'
import { getSupabaseClientForOperation } from '@/lib/supabase/client'
import type { FridgeScan } from '@/lib/types/cooking.types'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

// ============================================
// ANTHROPIC CLIENT
// ============================================

function getAnthropicClient() {
  const apiKey = config.aiCoach.anthropicApiKey || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  return createAnthropic({ apiKey })
}

// ============================================
// IMAGE ANALYSIS (Claude Vision)
// ============================================

/**
 * Analyze a refrigerator photo using Claude Vision.
 * Returns canonical ingredient names (e.g. "chicken breast" not "2 lbs frozen chicken").
 */
export interface ScanAnalysisResult {
  items: string[]
  debug: {
    model: string
    rawResponse: string
    inputTokens: number
    outputTokens: number
    latencyMs: number
  }
}

export async function analyzeImage(base64: string): Promise<ScanAnalysisResult> {
  const anthropic = getAnthropicClient()
  const modelId = 'claude-sonnet-4-20250514'
  const model = anthropic(modelId)

  const startTime = Date.now()
  const result = await generateText({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: base64,
          },
          {
            type: 'text',
            text: `Identify every food item visible in this refrigerator photo. Return ONLY a valid JSON array of canonical ingredient names. Be specific but concise — use names like "chicken breast", "cheddar cheese", "whole milk", "romaine lettuce". Do NOT include quantities, brands, or packaging descriptions. If the image is unclear or not a refrigerator, return an empty array []. Example output: ["chicken breast", "cheddar cheese", "whole milk", "eggs", "butter"]`,
          },
        ],
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 1024,
  })
  const latencyMs = Date.now() - startTime

  const rawText = result.text.trim()
  const debug = {
    model: modelId,
    rawResponse: rawText,
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    latencyMs,
  }

  try {
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return { items: [], debug }
    const items = JSON.parse(jsonMatch[0])
    if (!Array.isArray(items)) return { items: [], debug }
    return {
      items: items.filter((item: unknown) => typeof item === 'string' && item.length > 0),
      debug,
    }
  } catch (err) {
    console.error('[Fridge Scan] Failed to parse image analysis response:', err)
    return { items: [], debug }
  }
}

// ============================================
// VOICE TRANSCRIPT NORMALIZATION
// ============================================

/**
 * Parse messy voice transcript into clean canonical ingredient names.
 * Handles filler words, quantities, and conversational speech.
 */
export async function parseVoiceTranscript(transcript: string): Promise<ScanAnalysisResult> {
  const anthropic = getAnthropicClient()
  const modelId = 'claude-sonnet-4-20250514'
  const model = anthropic(modelId)

  const startTime = Date.now()
  const result = await generateText({
    model,
    messages: [
      {
        role: 'user',
        content: `Parse this voice transcript of someone listing food items in their refrigerator. Extract the food items and return ONLY a valid JSON array of canonical ingredient names. Ignore filler words, quantities, and non-food items. Be specific but concise — normalize to standard cooking ingredient names (e.g. "chicken breast" not "some chicken"). If the transcript is empty or contains no food items, return an empty array [].

Transcript: "${transcript}"

Example input: "uh I have some chicken breasts and also rice, there's milk in here and I think some cheddar cheese"
Example output: ["chicken breast", "rice", "milk", "cheddar cheese"]`,
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 1024,
  })
  const latencyMs = Date.now() - startTime

  const rawText = result.text.trim()
  const debug = {
    model: modelId,
    rawResponse: rawText,
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    latencyMs,
  }

  try {
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return { items: [], debug }
    const items = JSON.parse(jsonMatch[0])
    if (!Array.isArray(items)) return { items: [], debug }
    return {
      items: items.filter((item: unknown) => typeof item === 'string' && item.length > 0),
      debug,
    }
  } catch (err) {
    console.error('[Fridge Scan] Failed to parse voice transcript response:', err)
    return { items: [], debug }
  }
}

// ============================================
// SUPABASE CRUD
// ============================================

/**
 * Save a new fridge scan record.
 */
export async function saveManualScan(items: string[]): Promise<FridgeScan> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('fridge_scans')
    .insert({
      scan_type: 'manual',
      raw_transcript: null,
      identified_items: items,
      confirmed_items: items,
      recipes_matched: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[Fridge Scan] Error saving manual scan:', error)
    throw new Error(`Failed to save manual scan: ${error.message}`)
  }

  return data as unknown as FridgeScan
}

export async function saveScan(input: {
  scan_type: 'voice' | 'photo'
  raw_transcript?: string
  identified_items: string[]
}): Promise<FridgeScan> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('fridge_scans')
    .insert({
      scan_type: input.scan_type,
      raw_transcript: input.raw_transcript || null,
      identified_items: input.identified_items,
      confirmed_items: [],
      recipes_matched: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[Fridge Scan] Error saving scan:', error)
    throw new Error(`Failed to save scan: ${error.message}`)
  }

  return data as unknown as FridgeScan
}

/**
 * Get the most recent fridge scan.
 */
export async function getLatestScan(): Promise<FridgeScan | null> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('fridge_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[Fridge Scan] Error fetching latest scan:', error)
    return null
  }

  return data as FridgeScan
}

/**
 * Get scan history with optional limit.
 */
export async function getScanHistory(limit: number = 20): Promise<FridgeScan[]> {
  const supabase = getSupabaseClientForOperation('read')
  if (!supabase) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('fridge_scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[Fridge Scan] Error fetching scan history:', error)
    return []
  }

  return (data || []) as FridgeScan[]
}

/**
 * Update a scan's confirmed items and recipes matched count.
 */
export async function confirmScan(
  id: string,
  confirmedItems: string[],
  recipesMatched: number
): Promise<FridgeScan> {
  const supabase = getSupabaseClientForOperation('write')
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('fridge_scans')
    .update({
      confirmed_items: confirmedItems,
      recipes_matched: recipesMatched,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[Fridge Scan] Error confirming scan:', error)
    throw new Error(`Failed to confirm scan: ${error.message}`)
  }

  return data as FridgeScan
}
