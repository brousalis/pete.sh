/**
 * Knowledge base search.
 *
 * Hybrid retrieval: vector similarity for meaning, full-text for exact terms.
 * Both matter here — "ACWR" and "pes anserine" are precise terms that
 * embeddings blur, while "how hard should easy running be" needs semantics.
 *
 * Every result carries a citation. A coach that says "studies show" without
 * naming the study is not usable for decisions about a knee.
 */

import { cachedFetch as fetch } from './fetch-cache'
import { embedText, toVectorLiteral } from './embedding.service'
import { coachDb } from './coach-data.service'

export interface KnowledgeResult {
  chunkId: string
  documentId: string
  title: string
  citation: string | null
  heading: string | null
  content: string
  similarity: number
  matchType: 'semantic' | 'keyword' | 'both'
}

/**
 * Search the library.
 *
 * Results are fused with reciprocal rank fusion rather than a weighted score,
 * because similarity scores and text-rank scores are not on comparable scales
 * and normalising them tends to let one dominate.
 */
export async function searchKnowledge(query: string, limit = 6): Promise<KnowledgeResult[]> {
  const db = coachDb()

  const [semantic, keyword] = await Promise.all([
    semanticSearch(query, limit * 2),
    keywordSearch(query, limit * 2),
  ])

  const K = 60 // RRF damping constant
  const scores = new Map<string, { score: number; result: KnowledgeResult; types: Set<string> }>()

  semantic.forEach((result, index) => {
    const entry = scores.get(result.chunkId) ?? {
      score: 0,
      result,
      types: new Set<string>(),
    }
    entry.score += 1 / (K + index + 1)
    entry.types.add('semantic')
    scores.set(result.chunkId, entry)
  })

  keyword.forEach((result, index) => {
    const entry = scores.get(result.chunkId) ?? {
      score: 0,
      result,
      types: new Set<string>(),
    }
    entry.score += 1 / (K + index + 1)
    entry.types.add('keyword')
    scores.set(result.chunkId, entry)
  })

  void db

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      ...entry.result,
      matchType: entry.types.size > 1 ? 'both' : (entry.types.values().next().value as 'semantic' | 'keyword'),
    }))
}

async function semanticSearch(query: string, limit: number): Promise<KnowledgeResult[]> {
  const embedding = await embedText(query, 'query')
  if (!embedding) return []

  const { data, error } = await coachDb().rpc('coach_match_chunks', {
    query_embedding: toVectorLiteral(embedding),
    match_count: limit,
    min_similarity: 0.15,
  })

  if (error) {
    console.error('[coach] Semantic knowledge search failed:', error.message)
    return []
  }

  return (data ?? []).map(
    (row: {
      chunk_id: string
      document_id: string
      title: string
      citation: string | null
      heading: string | null
      content: string
      similarity: number
    }) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      title: row.title,
      citation: row.citation,
      heading: row.heading,
      content: row.content,
      similarity: Number(row.similarity),
      matchType: 'semantic' as const,
    })
  )
}

async function keywordSearch(query: string, limit: number): Promise<KnowledgeResult[]> {
  // websearch_to_tsquery handles quoted phrases and OR naturally, which suits
  // a query written by a model rather than a search box.
  const { data, error } = await coachDb()
    .from('coach_chunk')
    .select('id, document_id, content, heading, coach_document(title, citation)')
    .textSearch('tsv', query, { type: 'websearch', config: 'english' })
    .limit(limit)

  if (error) {
    // Malformed tsquery is a normal outcome for free-text input; the semantic
    // half of the hybrid still returns results.
    return []
  }

  return (data ?? []).map(
    (row: {
      id: string
      document_id: string
      content: string
      heading: string | null
      coach_document?: { title?: string; citation?: string | null }
    }) => ({
      chunkId: row.id,
      documentId: row.document_id,
      title: row.coach_document?.title ?? 'Untitled',
      citation: row.coach_document?.citation ?? null,
      heading: row.heading,
      content: row.content,
      similarity: 0,
      matchType: 'keyword' as const,
    })
  )
}

// ---------------------------------------------------------------------------
// PubMed
// ---------------------------------------------------------------------------

export interface PubmedResult {
  pmid: string
  title: string
  abstract: string | null
  journal: string | null
  year: number | null
  authors: string | null
  url: string
}

/**
 * Search PubMed for current research.
 *
 * Results are cached, both to respect NCBI's rate limits and because the same
 * clinical questions recur across a season.
 */
export async function searchPubmed(query: string, limit = 5): Promise<PubmedResult[]> {
  const db = coachDb()

  try {
    const searchUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi')
    searchUrl.searchParams.set('db', 'pubmed')
    searchUrl.searchParams.set('term', query)
    searchUrl.searchParams.set('retmax', String(limit))
    searchUrl.searchParams.set('retmode', 'json')
    searchUrl.searchParams.set('sort', 'relevance')

    const searchResponse = await fetch(searchUrl, { revalidateSeconds: 86400 })
    if (!searchResponse.ok) return []

    const searchPayload = (await searchResponse.json()) as {
      esearchresult?: { idlist?: string[] }
    }
    const ids = searchPayload.esearchresult?.idlist ?? []
    if (ids.length === 0) return []

    const cached = await db.from('coach_pubmed_cache').select('*').in('pmid', ids)
    const cachedById = new Map(
      ((cached.data ?? []) as Record<string, unknown>[]).map((row) => [row.pmid as string, row])
    )

    const missing = ids.filter((id) => !cachedById.has(id))
    const fetched: PubmedResult[] = []

    if (missing.length > 0) {
      const summaryUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi')
      summaryUrl.searchParams.set('db', 'pubmed')
      summaryUrl.searchParams.set('id', missing.join(','))
      summaryUrl.searchParams.set('retmode', 'json')

      const summaryResponse = await fetch(summaryUrl, { revalidateSeconds: 86400 })
      if (summaryResponse.ok) {
        const summaryPayload = (await summaryResponse.json()) as {
          result?: Record<string, unknown>
        }

        for (const id of missing) {
          const entry = summaryPayload.result?.[id] as
            | {
                title?: string
                fulljournalname?: string
                pubdate?: string
                authors?: { name: string }[]
              }
            | undefined

          if (!entry?.title) continue

          const year = entry.pubdate ? Number(entry.pubdate.slice(0, 4)) : null
          const authors = entry.authors?.slice(0, 3).map((author) => author.name).join(', ')

          const result: PubmedResult = {
            pmid: id,
            title: entry.title,
            abstract: null,
            journal: entry.fulljournalname ?? null,
            year: Number.isFinite(year) ? year : null,
            authors: authors ?? null,
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          }

          fetched.push(result)

          await db.from('coach_pubmed_cache').upsert(
            {
              pmid: id,
              title: result.title,
              abstract: result.abstract,
              journal: result.journal,
              year: result.year,
              authors: result.authors,
              query,
            },
            { onConflict: 'pmid' }
          )
        }
      }
    }

    const fromCache: PubmedResult[] = [...cachedById.values()].map((row) => ({
      pmid: row.pmid as string,
      title: row.title as string,
      abstract: (row.abstract as string | null) ?? null,
      journal: (row.journal as string | null) ?? null,
      year: (row.year as number | null) ?? null,
      authors: (row.authors as string | null) ?? null,
      url: `https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/`,
    }))

    // Preserve PubMed's relevance ordering.
    const byId = new Map([...fromCache, ...fetched].map((result) => [result.pmid, result]))
    return ids.map((id) => byId.get(id)).filter((result): result is PubmedResult => Boolean(result))
  } catch (error) {
    console.error('[coach] PubMed search failed:', error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

export interface IngestDocumentInput {
  title: string
  docType: 'book' | 'paper' | 'guideline' | 'medical' | 'plan' | 'note'
  content: string
  authors?: string
  year?: number
  citation?: string
  sourceUrl?: string
  storagePath?: string
  isMedical?: boolean
}

/**
 * Split a document and store it with embeddings.
 *
 * Chunks are split on paragraph boundaries with overlap, so a passage that
 * spans a break is still retrievable. Headings are carried onto each chunk
 * because a chunk that says "keep this below 1.3" is useless without knowing
 * it is about ACWR.
 */
export async function ingestDocument(input: IngestDocumentInput): Promise<{
  documentId: string
  chunkCount: number
  embeddedCount: number
}> {
  const db = coachDb()

  const { data: document, error } = await db
    .from('coach_document')
    .insert({
      title: input.title,
      doc_type: input.docType,
      authors: input.authors ?? null,
      year: input.year ?? null,
      citation: input.citation ?? buildCitation(input),
      source_url: input.sourceUrl ?? null,
      storage_path: input.storagePath ?? null,
      is_medical: input.isMedical ?? input.docType === 'medical',
      ingested_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create document: ${error.message}`)

  const chunks = chunkDocument(input.content)

  const { embedBatch } = await import('./embedding.service')
  const embeddings = await embedBatch(
    chunks.map((chunk) => (chunk.heading ? `${chunk.heading}\n\n${chunk.content}` : chunk.content)),
    'document'
  )

  const rows = chunks.map((chunk, index) => ({
    document_id: document.id,
    chunk_index: index,
    content: chunk.content,
    heading: chunk.heading,
    token_count: Math.ceil(chunk.content.length / 3.6),
    embedding: embeddings[index] ? toVectorLiteral(embeddings[index]!) : null,
  }))

  // Insert in batches; a full book can produce thousands of chunks.
  const BATCH = 200
  for (let offset = 0; offset < rows.length; offset += BATCH) {
    const { error: insertError } = await db
      .from('coach_chunk')
      .insert(rows.slice(offset, offset + BATCH))
    if (insertError) throw new Error(`Failed to insert chunks: ${insertError.message}`)
  }

  await db.from('coach_document').update({ chunk_count: rows.length }).eq('id', document.id)

  return {
    documentId: document.id,
    chunkCount: rows.length,
    embeddedCount: embeddings.filter(Boolean).length,
  }
}

interface Chunk {
  content: string
  heading: string | null
}

const TARGET_CHARS = 2400
const OVERLAP_CHARS = 250

export function chunkDocument(text: string): Chunk[] {
  const lines = text.split('\n')
  const chunks: Chunk[] = []

  let heading: string | null = null
  let buffer: string[] = []
  let bufferLength = 0

  const flush = () => {
    const content = buffer.join('\n').trim()
    if (content.length > 50) chunks.push({ content, heading })

    // Carry the tail forward so a passage split across a boundary is still
    // retrievable from either side.
    const tail = content.slice(-OVERLAP_CHARS)
    buffer = tail ? [tail] : []
    bufferLength = tail.length
  }

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/)
    if (headingMatch) {
      if (bufferLength > TARGET_CHARS / 2) flush()
      heading = headingMatch[1]!.trim()
      continue
    }

    buffer.push(line)
    bufferLength += line.length + 1

    if (bufferLength >= TARGET_CHARS && line.trim() === '') flush()
    else if (bufferLength >= TARGET_CHARS * 1.5) flush()
  }

  const remaining = buffer.join('\n').trim()
  if (remaining.length > 50) chunks.push({ content: remaining, heading })

  return chunks
}

function buildCitation(input: IngestDocumentInput): string {
  const parts = [input.authors, input.year ? `(${input.year})` : null, input.title].filter(Boolean)
  return parts.join(' ')
}
