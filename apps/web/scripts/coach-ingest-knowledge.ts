/**
 * Knowledge base ingestion.
 *
 * Chunks documents, embeds them, and stores them in pgvector so the coach can
 * cite sources instead of asserting training science from memory.
 *
 * Medical documents (MRI reports, PT notes) are marked so they go to the
 * private storage bucket and are never exposed through any read-only surface.
 *
 * Usage:
 *   yarn coach:ingest --file ./data/knowledge/friel-training-bible.md \
 *     --title "The Triathlete's Training Bible" --type book \
 *     --authors "Joe Friel" --year 2016
 *
 *   yarn coach:ingest --dir ./data/knowledge      ingest a whole directory
 *   yarn coach:ingest --list                      show what is already indexed
 *   yarn coach:ingest --search "acwr"             test retrieval
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

type DocType = 'book' | 'paper' | 'guideline' | 'medical' | 'plan' | 'note'

interface Args {
  file?: string
  dir?: string
  title?: string
  type: DocType
  authors?: string
  year?: number
  citation?: string
  list: boolean
  search?: string
  medical: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const args: Args = { type: 'note', list: false, medical: false }

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--file':
        args.file = argv[++i]
        break
      case '--dir':
        args.dir = argv[++i]
        break
      case '--title':
        args.title = argv[++i]
        break
      case '--type':
        args.type = argv[++i] as DocType
        break
      case '--authors':
        args.authors = argv[++i]
        break
      case '--year':
        args.year = Number(argv[++i])
        break
      case '--citation':
        args.citation = argv[++i]
        break
      case '--medical':
        args.medical = true
        break
      case '--list':
        args.list = true
        break
      case '--search':
        args.search = argv[++i]
        break
    }
  }

  return args
}

/**
 * Infer metadata from a filename so a directory of files can be ingested
 * without a flag per document.
 *
 * Convention: `type__author__year__title.md`, with any part optional.
 * Example: `paper__seiler__2010__polarized-training.md`
 */
function inferMetadata(filename: string): {
  title: string
  type: DocType
  authors?: string
  year?: number
} {
  const base = path.basename(filename, path.extname(filename))
  const parts = base.split('__')

  const VALID_TYPES: DocType[] = ['book', 'paper', 'guideline', 'medical', 'plan', 'note']

  let type: DocType = 'note'
  let authors: string | undefined
  let year: number | undefined
  let titleParts: string[] = []

  for (const part of parts) {
    if (VALID_TYPES.includes(part as DocType)) {
      type = part as DocType
    } else if (/^\d{4}$/.test(part)) {
      year = Number(part)
    } else if (!authors && parts.length > 2 && titleParts.length === 0) {
      authors = titleCase(part)
    } else {
      titleParts.push(part)
    }
  }

  if (titleParts.length === 0) titleParts = [base]

  return {
    title: titleCase(titleParts.join(' ').replace(/[-_]/g, ' ')),
    type,
    authors,
    year,
  }
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .map((word) => (word.length > 3 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(' ')
}

async function ingestFile(filePath: string, overrides: Partial<Args>): Promise<void> {
  const { ingestDocument } = await import('../lib/services/coach/knowledge.service')

  const content = await readFile(filePath, 'utf8')
  if (content.trim().length < 200) {
    console.log(`  skipped ${path.basename(filePath)} (too short)`)
    return
  }

  const inferred = inferMetadata(filePath)
  const type = (overrides.type && overrides.type !== 'note' ? overrides.type : inferred.type) as DocType

  const result = await ingestDocument({
    title: overrides.title ?? inferred.title,
    docType: type,
    content,
    authors: overrides.authors ?? inferred.authors,
    year: overrides.year ?? inferred.year,
    citation: overrides.citation,
    isMedical: overrides.medical || type === 'medical',
  })

  const embeddedNote =
    result.embeddedCount < result.chunkCount
      ? ` (${result.chunkCount - result.embeddedCount} without embeddings — check VOYAGE_API_KEY)`
      : ''

  console.log(
    `  ${overrides.title ?? inferred.title}: ${result.chunkCount} chunks${embeddedNote}`
  )
}

async function listDocuments(): Promise<void> {
  const { coachDb } = await import('../lib/services/coach/coach-data.service')

  const { data } = await coachDb()
    .from('coach_document')
    .select('title, doc_type, authors, year, chunk_count, is_medical, ingested_at')
    .order('doc_type')
    .order('title')

  if (!data?.length) {
    console.log('Nothing indexed yet.')
    return
  }

  console.log(`\n${data.length} documents indexed:\n`)

  for (const document of data as Record<string, unknown>[]) {
    const medical = document.is_medical ? ' [medical]' : ''
    const attribution = [document.authors, document.year].filter(Boolean).join(' ')
    console.log(
      `  ${String(document.doc_type).padEnd(10)} ${document.title}${attribution ? ` — ${attribution}` : ''}` +
        `  (${document.chunk_count} chunks)${medical}`
    )
  }

  const total = (data as { chunk_count: number }[]).reduce(
    (sum, document) => sum + (document.chunk_count ?? 0),
    0
  )
  console.log(`\n${total} chunks total.\n`)
}

async function testSearch(query: string): Promise<void> {
  const { searchKnowledge } = await import('../lib/services/coach/knowledge.service')

  const results = await searchKnowledge(query, 5)

  if (results.length === 0) {
    console.log('No results. Check that documents are indexed and VOYAGE_API_KEY is set.')
    return
  }

  console.log(`\n${results.length} results for "${query}":\n`)

  for (const result of results) {
    console.log(`  ${result.citation ?? result.title}${result.heading ? ` — ${result.heading}` : ''}`)
    console.log(`  match: ${result.matchType}${result.similarity ? `, similarity ${result.similarity.toFixed(3)}` : ''}`)
    console.log(`  ${result.content.slice(0, 220).replace(/\s+/g, ' ')}…`)
    console.log('')
  }
}

async function main(): Promise<void> {
  const args = parseArgs()

  if (args.list) return listDocuments()
  if (args.search) return testSearch(args.search)

  if (args.file) {
    console.log(`Ingesting ${args.file}`)
    await ingestFile(args.file, args)
    console.log('Done.')
    return
  }

  if (args.dir) {
    const entries = await readdir(args.dir)
    const files: string[] = []

    for (const entry of entries) {
      const full = path.join(args.dir, entry)
      const info = await stat(full)
      if (info.isFile() && /\.(md|txt)$/i.test(entry)) files.push(full)
    }

    if (files.length === 0) {
      console.log(`No .md or .txt files in ${args.dir}`)
      return
    }

    console.log(`Ingesting ${files.length} files from ${args.dir}`)
    console.log('Filename convention: type__author__year__title.md\n')

    for (const file of files) {
      try {
        await ingestFile(file, { medical: args.medical, type: 'note' })
      } catch (error) {
        console.error(`  failed ${path.basename(file)}: ${error instanceof Error ? error.message : error}`)
      }
    }

    console.log('\nDone.')
    return
  }

  console.log(`
petehome knowledge ingestion

  --file <path>     Ingest one document
  --dir <path>      Ingest every .md/.txt in a directory
  --list            Show what is indexed
  --search <query>  Test retrieval

  --title, --type, --authors, --year, --citation, --medical

Types: book, paper, guideline, medical, plan, note

Suggested library:
  Friel, The Triathlete's Training Bible
  Dixon, The Well-Built Triathlete
  Daniels, Daniels' Running Formula
  Allen & Coggan, Training and Racing with a Power Meter
  Taormina, Swim Speed Secrets
  Dicharry, Running Rewired
  Seiler, polarised training papers
  Gabbett, acute:chronic workload papers
  JOSPT patellofemoral pain clinical practice guideline
  Cook & Purdam, tendinopathy continuum
  IOC 2023 RED-S consensus statement
  Jeukendrup, endurance fuelling
  Your own MRI report and PT notes (use --type medical)
`)
}

main().catch((error) => {
  console.error('Ingestion failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
