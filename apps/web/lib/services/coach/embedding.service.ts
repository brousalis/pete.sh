/**
 * Embeddings for memory and knowledge search.
 *
 * Voyage is used because its retrieval quality is strong for technical prose
 * and the volume here is tiny — a one-time knowledge base ingest plus a few
 * queries a day, comfortably inside the free tier.
 *
 * Every call degrades to null rather than throwing. A missing embedding means
 * semantic recall is unavailable for that item; it must never take down a
 * briefing or a chat turn.
 */

import { config } from '@/lib/config'

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings'
const MODEL = 'voyage-3'

/** Matches the vector(1024) columns in migration 037. */
export const EMBEDDING_DIMENSIONS = 1024

export type EmbeddingInputType = 'query' | 'document'

export function isEmbeddingConfigured(): boolean {
  return Boolean(config.coach.voyageApiKey)
}

export async function embedText(
  text: string,
  inputType: EmbeddingInputType = 'document'
): Promise<number[] | null> {
  const [embedding] = await embedBatch([text], inputType)
  return embedding ?? null
}

/**
 * Embed a batch. Voyage accepts up to 128 inputs per request, so longer
 * batches are chunked.
 */
export async function embedBatch(
  texts: string[],
  inputType: EmbeddingInputType = 'document'
): Promise<(number[] | null)[]> {
  const apiKey = config.coach.voyageApiKey
  if (!apiKey || texts.length === 0) {
    return texts.map(() => null)
  }

  const results: (number[] | null)[] = []
  const BATCH_SIZE = 128

  for (let offset = 0; offset < texts.length; offset += BATCH_SIZE) {
    const batch = texts.slice(offset, offset + BATCH_SIZE)

    try {
      const response = await fetch(VOYAGE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: batch,
          model: MODEL,
          // Voyage embeds queries and documents differently; passing the
          // wrong one measurably degrades retrieval.
          input_type: inputType,
        }),
      })

      if (!response.ok) {
        console.error(`[coach] Voyage returned ${response.status}: ${await response.text()}`)
        results.push(...batch.map(() => null))
        continue
      }

      const payload = (await response.json()) as {
        data?: { index: number; embedding: number[] }[]
      }

      const byIndex = new Map((payload.data ?? []).map((item) => [item.index, item.embedding]))
      for (let i = 0; i < batch.length; i++) {
        results.push(byIndex.get(i) ?? null)
      }
    } catch (error) {
      console.error('[coach] Embedding request failed:', error)
      results.push(...batch.map(() => null))
    }
  }

  return results
}

/** pgvector accepts a bracketed, comma-separated literal. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}
