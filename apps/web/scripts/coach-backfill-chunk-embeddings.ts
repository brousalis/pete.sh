/**
 * Backfill Voyage embeddings for coach_chunk rows stored while rate-limited.
 *
 * Free Voyage without a payment method: ~3 RPM / 10K TPM. Batches stay small
 * and spaced so the corpus eventually gets vectors.
 *
 *   cd apps/web && yarn tsx scripts/coach-backfill-chunk-embeddings.ts
 */

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

const SLEEP_MS = 25_000
const BATCH = 6 // keep under ~10K TPM with ~1–2k char chunks

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  const { getSupabaseServiceClient } = await import('../lib/supabase/client')
  const { embedBatch, toVectorLiteral } = await import('../lib/services/coach/embedding.service')

  const db = getSupabaseServiceClient()
  if (!db) throw new Error('no supabase service client')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any

  const { count } = await client
    .from('coach_chunk')
    .select('id', { head: true, count: 'exact' })
    .is('embedding', null)

  console.log(`${count ?? 0} chunks missing embeddings\n`)

  let ok = 0
  let fail = 0
  let pass = 0

  for (;;) {
    const { data: rows, error } = await client
      .from('coach_chunk')
      .select('id, content, heading')
      .is('embedding', null)
      .order('id', { ascending: true })
      .limit(BATCH)

    if (error) throw new Error(error.message)
    const batch = (rows ?? []) as { id: string; content: string; heading: string | null }[]
    if (batch.length === 0) break

    pass++
    const texts = batch.map((row) => {
      const text = row.heading ? `${row.heading}\n\n${row.content}` : row.content
      return text.length > 5000 ? text.slice(0, 5000) : text
    })

    const embeddings = await embedBatch(texts, 'document')
    let batchOk = 0

    for (let i = 0; i < batch.length; i++) {
      const embedding = embeddings[i]
      if (!embedding) {
        fail++
        continue
      }
      const { error: updateError } = await client
        .from('coach_chunk')
        .update({ embedding: toVectorLiteral(embedding) })
        .eq('id', batch[i]!.id)
      if (updateError) {
        fail++
      } else {
        ok++
        batchOk++
      }
    }

    console.log(`pass ${pass}: embedded ${batchOk}/${batch.length} (total ok=${ok} fail=${fail})`)

    // If the whole batch failed (rate limit), wait longer before retrying
    if (batchOk === 0) {
      console.log('  rate limited — waiting 60s')
      await sleep(60_000)
    } else {
      await sleep(SLEEP_MS)
    }
  }

  console.log(`\nDone. embedded=${ok} failed=${fail}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
