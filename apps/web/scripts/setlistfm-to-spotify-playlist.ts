/**
 * Build a Spotify playlist from likely setlists for one or more bands.
 *
 * Usage:
 *   yarn setlist:spotify "Bilmuri" "Dance Gavin Dance"
 *   yarn setlist:spotify Bilmuri, "Dance Gavin Dance" --shows 5 --name "Riot Fest"
 *   yarn setlist:spotify Bilmuri --auth
 */

import http from 'http'
import readline from 'readline'
import { URL } from 'url'
import { exec } from 'child_process'
import { config as loadDotenv } from 'dotenv'
import { SetlistFMService } from '../lib/services/setlistfm.service'
import { SpotifyService } from '../lib/services/spotify.service'
import { getSpotifyTokens, setSpotifyTokens } from '../lib/services/token-storage'
import type { SetlistData, SetlistFMSetlist, SetlistSong } from '../lib/types/setlistfm.types'

loadDotenv({ path: '.env.local' })
loadDotenv({ path: '.env' })

const DEFAULT_SHOWS = 5
const DEFAULT_MIN_FREQ = 0.5
/** Dedicated CLI callback — does not fight the web app on :1337. */
const DEFAULT_AUTH_REDIRECT_URI = 'http://127.0.0.1:8765/callback'

function getAuthRedirectUri(): string {
  return (
    process.env.SPOTIFY_REDIRECT_URI ||
    process.env.NEXT_SPOTIFY_REDIRECT_URI ||
    DEFAULT_AUTH_REDIRECT_URI
  )
}

function getAuthListen(): { host: string; port: number; path: string } {
  const redirectUri = getAuthRedirectUri()
  const parsed = new URL(redirectUri)
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 80,
    path: parsed.pathname || '/callback',
  }
}

interface CliArgs {
  artists: string[]
  playlistName?: string
  public?: boolean
  shows: number
  minFreq: number
  forceAuth: boolean
}

interface RankedSong {
  name: string
  artistName: string
  appearances: number
  avgPosition: number
  encore: boolean
}

interface BandConsensus {
  inputName: string
  resolvedName: string
  songs: RankedSong[]
  sourceShows: Array<{ date: string; venue: string; url: string }>
}

function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*-\s*(live|remaster(ed)?|radio edit|edit|mono|stereo).*$/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function songKey(name: string): string {
  return normalizeForMatch(name)
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2)
  const artistParts: string[] = []
  let playlistName: string | undefined
  let publicFlag: boolean | undefined
  let shows = DEFAULT_SHOWS
  let minFreq = DEFAULT_MIN_FREQ
  let forceAuth = false

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i]
    if (!a) continue

    if (a === '--name') {
      playlistName = args[i + 1]
      i += 1
      continue
    }
    if (a === '--shows') {
      const n = Number(args[i + 1])
      if (!Number.isFinite(n) || n < 1) {
        throw new Error('--shows must be a positive number')
      }
      shows = Math.floor(n)
      i += 1
      continue
    }
    if (a === '--min-freq') {
      const n = Number(args[i + 1])
      if (!Number.isFinite(n) || n <= 0 || n > 1) {
        throw new Error('--min-freq must be between 0 and 1')
      }
      minFreq = n
      i += 1
      continue
    }
    if (a === '--public') {
      publicFlag = true
      continue
    }
    if (a === '--private') {
      publicFlag = false
      continue
    }
    if (a === '--auth') {
      forceAuth = true
      continue
    }
    if (a === '--help' || a === '-h') {
      printUsage()
      process.exit(0)
    }

    artistParts.push(a)
  }

  // Prefer shell-split args as separate bands when there are no commas.
  // "Bilmuri" "Dance Gavin Dance" → two bands
  // Bilmuri, "Dance Gavin Dance" → join + split on commas
  const hasComma = artistParts.some((p) => p.includes(','))
  const resolvedArtists = hasComma
    ? artistParts
        .join(' ')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : artistParts.map((s) => s.trim()).filter(Boolean)

  if (resolvedArtists.length === 0) {
    printUsage()
    throw new Error('Provide at least one band name.')
  }

  return {
    artists: resolvedArtists,
    playlistName,
    public: publicFlag,
    shows,
    minFreq,
    forceAuth,
  }
}

function printUsage(): void {
  console.log(`Usage: yarn setlist:spotify <band> [band...] [options]

Options:
  --shows N          Recent shows to consider (default ${DEFAULT_SHOWS})
  --min-freq 0.5     Min appearance rate to keep a song (default ${DEFAULT_MIN_FREQ})
  --name "..."       Playlist name (default: BandA / BandB)
  --public|--private Playlist visibility (default private)
  --auth             Force Spotify OAuth (loopback callback)

Env:
  SPOTIFY_REDIRECT_URI   Override callback (default ${DEFAULT_AUTH_REDIRECT_URI})
                         Must match a Redirect URI in the Spotify developer app.
`)
}

function hasNonTapeSongs(setlist: SetlistFMSetlist): boolean {
  return (setlist.sets?.set || []).some((set) =>
    (set.song || []).some((song) => song.name && !song.tape)
  )
}

function extractSongsWithPositions(
  normalized: SetlistData
): Array<{ song: SetlistSong; position: number; encore: boolean }> {
  const out: Array<{ song: SetlistSong; position: number; encore: boolean }> = []
  let position = 0

  for (const set of normalized.sets) {
    const encore = Boolean(set.encore)
    for (const song of set.song) {
      if (!song.name || song.tape) continue
      out.push({ song, position, encore })
      position += 1
    }
  }

  return out
}

function buildConsensus(
  setlists: SetlistFMSetlist[],
  setlistService: SetlistFMService,
  artistFallbackName: string,
  shows: number,
  minFreq: number
): { songs: RankedSong[]; sourceShows: BandConsensus['sourceShows'] } {
  const recent = setlists.filter(hasNonTapeSongs).slice(0, shows)
  if (recent.length === 0) {
    return { songs: [], sourceShows: [] }
  }

  const stats = new Map<
    string,
    {
      name: string
      artistName: string
      appearances: number
      positions: number[]
      encoreCount: number
    }
  >()

  const sourceShows: BandConsensus['sourceShows'] = []

  for (const raw of recent) {
    const normalized = setlistService.normalizeSetlist(raw)
    sourceShows.push({
      date: normalized.eventDate,
      venue: normalized.venue?.name || 'Unknown venue',
      url: normalized.url,
    })

    const entries = extractSongsWithPositions(normalized)
    const seenInShow = new Set<string>()

    for (const { song, position, encore } of entries) {
      const key = songKey(song.name)
      if (!key || seenInShow.has(key)) continue
      seenInShow.add(key)

      const artistName = song.cover?.name || artistFallbackName
      const existing = stats.get(key)
      if (existing) {
        existing.appearances += 1
        existing.positions.push(position)
        if (encore) existing.encoreCount += 1
      } else {
        stats.set(key, {
          name: song.name,
          artistName,
          appearances: 1,
          positions: [position],
          encoreCount: encore ? 1 : 0,
        })
      }
    }
  }

  const showCount = recent.length
  const minAppearances =
    showCount < 4 ? Math.min(2, showCount) : Math.ceil(minFreq * showCount)

  const ranked: RankedSong[] = []
  for (const entry of stats.values()) {
    if (entry.appearances < minAppearances) continue
    const avgPosition =
      entry.positions.reduce((sum, p) => sum + p, 0) / entry.positions.length
    ranked.push({
      name: entry.name,
      artistName: entry.artistName,
      appearances: entry.appearances,
      avgPosition,
      encore: entry.encoreCount > entry.appearances / 2,
    })
  }

  ranked.sort((a, b) => {
    if (a.encore !== b.encore) return a.encore ? 1 : -1
    return a.avgPosition - b.avgPosition
  })

  return { songs: ranked, sourceShows }
}

function openBrowser(url: string): void {
  const platform = process.platform
  const cmd =
    platform === 'win32'
      ? `start "" "${url}"`
      : platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`
  exec(cmd, (err) => {
    if (err) {
      console.log(`Open this URL in your browser:\n${url}`)
    }
  })
}

function promptLine(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function extractCodeFromCallback(input: string, expectedState: string): string {
  let code: string | null = null
  let state: string | null = null
  let error: string | null = null

  try {
    const url = new URL(input)
    code = url.searchParams.get('code')
    state = url.searchParams.get('state')
    error = url.searchParams.get('error')
  } catch {
    // Treat bare code paste as the auth code.
    if (/^[A-Za-z0-9_-]+$/.test(input)) {
      return input
    }
    throw new Error('Paste the full redirect URL from the browser address bar.')
  }

  if (error) {
    throw new Error(`Spotify auth error: ${error}`)
  }
  if (state && state !== expectedState) {
    throw new Error('OAuth state mismatch — re-run with --auth.')
  }
  if (!code) {
    throw new Error('No code found in callback URL.')
  }
  return code
}

async function runPasteOAuth(
  service: SpotifyService,
  authUrl: string,
  state: string
): Promise<string> {
  openBrowser(authUrl)
  console.log('\nBrowser auth opened. After approving Spotify:')
  console.log('1. Your browser will land on a page that may fail to load — that is OK.')
  console.log('2. Copy the FULL URL from the address bar.')
  console.log('3. Paste it here and press Enter.\n')
  console.log(`Auth URL (if browser did not open):\n${authUrl}\n`)

  const pasted = await promptLine('Paste redirect URL (or code): ')
  return extractCodeFromCallback(pasted, state)
}

async function runLocalOAuth(service: SpotifyService): Promise<void> {
  const redirectUri = getAuthRedirectUri()
  const listen = getAuthListen()
  const state = `setlist-${Date.now()}`
  const authUrl = service.getAuthUrl(state)

  console.log(`\nSpotify OAuth redirect URI: ${redirectUri}`)
  console.log(
    'This exact URI must be listed under Redirect URIs in your Spotify developer app:'
  )
  console.log('  https://developer.spotify.com/dashboard → your app → Settings\n')

  let code: string

  try {
    code = await new Promise<string>((resolve, reject) => {
      const server = http.createServer((req, res) => {
        try {
          const reqUrl = new URL(req.url || '/', `http://${listen.host}:${listen.port}`)
          if (reqUrl.pathname !== listen.path) {
            res.writeHead(404)
            res.end('Not found')
            return
          }

          const error = reqUrl.searchParams.get('error')
          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end(`<h1>Auth failed</h1><p>${error}</p>`)
            server.close()
            reject(new Error(`Spotify auth error: ${error}`))
            return
          }

          const returnedState = reqUrl.searchParams.get('state')
          const authCode = reqUrl.searchParams.get('code')
          if (returnedState !== state || !authCode) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end('<h1>Invalid callback</h1>')
            server.close()
            reject(new Error('Invalid OAuth callback (state/code mismatch)'))
            return
          }

          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(
            '<h1>Spotify connected</h1><p>You can close this tab and return to the terminal.</p>'
          )
          server.close()
          resolve(authCode)
        } catch (err) {
          server.close()
          reject(err)
        }
      })

      server.on('error', (err: NodeJS.ErrnoException) => {
        reject(err)
      })

      server.listen(listen.port, listen.host, () => {
        openBrowser(authUrl)
        console.log(
          `Listening on ${listen.host}:${listen.port}${listen.path} for Spotify callback…`
        )
      })
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isBusy =
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'EADDRINUSE'

    console.log(
      isBusy
        ? `Port ${listen.port} is in use — falling back to paste-the-URL auth.`
        : `Could not start local callback server (${message}) — falling back to paste-the-URL auth.`
    )
    code = await runPasteOAuth(service, authUrl, state)
  }

  const tokens = await service.exchangeCode(code)
  const expiryDate = Date.now() + tokens.expires_in * 1000
  setSpotifyTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: expiryDate,
  })
  service.setCredentials(tokens.access_token, tokens.refresh_token)
  console.log('Spotify tokens saved to .tokens.json')
}

async function getAuthenticatedSpotifyService(
  forceAuth: boolean
): Promise<SpotifyService> {
  const service = new SpotifyService(getAuthRedirectUri())
  if (!service.isConfigured()) {
    throw new Error(
      'Spotify not configured. Set NEXT_SPOTIFY_CLIENT_ID and NEXT_SPOTIFY_CLIENT_SECRET.'
    )
  }

  if (forceAuth) {
    await runLocalOAuth(service)
    return service
  }

  const stored = getSpotifyTokens()

  if (stored.accessToken) {
    service.setCredentials(stored.accessToken, stored.refreshToken || undefined)
    return service
  }

  if (stored.refreshToken) {
    try {
      const tokens = await service.refreshAccessToken(stored.refreshToken)
      const expiryDate = Date.now() + tokens.expires_in * 1000
      setSpotifyTokens({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || stored.refreshToken,
        expiry_date: expiryDate,
      })
      service.setCredentials(
        tokens.access_token,
        tokens.refresh_token || stored.refreshToken
      )
      return service
    } catch {
      console.log('Refresh token failed; starting OAuth…')
    }
  }

  await runLocalOAuth(service)
  return service
}

async function resolveBandConsensus(
  setlistService: SetlistFMService,
  artistName: string,
  shows: number,
  minFreq: number
): Promise<BandConsensus> {
  console.log(`\n→ ${artistName}`)
  const { setlists, artistName: resolved } =
    await setlistService.searchSetlistsByName(artistName)

  if (!resolved || setlists.length === 0) {
    throw new Error(`No setlists found for "${artistName}".`)
  }

  const { songs, sourceShows } = buildConsensus(
    setlists,
    setlistService,
    resolved,
    shows,
    minFreq
  )

  if (songs.length === 0) {
    throw new Error(
      `Found setlists for "${resolved}", but none had enough shared songs (try lowering --min-freq).`
    )
  }

  console.log(
    `  Resolved: ${resolved} | shows used: ${sourceShows.length} | likely songs: ${songs.length}`
  )
  for (const show of sourceShows) {
    console.log(`  - ${show.date} @ ${show.venue}`)
  }

  return {
    inputName: artistName,
    resolvedName: resolved,
    songs,
    sourceShows,
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)

  const setlistService = new SetlistFMService()
  if (!setlistService.isConfigured()) {
    throw new Error('setlist.fm not configured. Set SETLISTFM_API_KEY.')
  }

  // Auth first so we do not burn setlist.fm quota before Spotify is ready.
  const spotify = await getAuthenticatedSpotifyService(args.forceAuth)
  const user = await spotify.getCurrentUser()
  console.log(`Spotify: signed in as ${user.display_name || user.id}`)

  const bands: BandConsensus[] = []
  for (const artist of args.artists) {
    bands.push(
      await resolveBandConsensus(setlistService, artist, args.shows, args.minFreq)
    )
  }

  const playlistTitle =
    args.playlistName || bands.map((b) => b.resolvedName).join(' / ')

  const descriptionParts = bands.map((b) => {
    const dates = b.sourceShows.map((s) => s.date).join(', ')
    return `${b.resolvedName}: ${dates}`
  })
  const description = `Likely setlists from setlist.fm (${args.shows} recent shows). ${descriptionParts.join(' | ')}`.slice(
    0,
    300
  )

  const playlist = await spotify.createPlaylist(user.id, playlistTitle, {
    description,
    public: args.public ?? false,
  })

  const trackUris: string[] = []
  const missing: { song: string; search: string }[] = []
  const perBandAdded: Array<{ band: string; added: number; total: number }> = []

  for (const band of bands) {
    let added = 0
    for (const song of band.songs) {
      const q = `track:"${song.name}" artist:"${song.artistName}"`
      const result = await spotify.search(q, ['track'], 5)
      const items = result.tracks?.items || []

      const desired = normalizeForMatch(song.name)
      const best =
        items.find((t) => normalizeForMatch(t.name) === desired) ||
        items.find((t) => normalizeForMatch(t.name).includes(desired)) ||
        items[0]

      if (!best?.uri) {
        missing.push({ song: `${song.name} — ${song.artistName}`, search: q })
        continue
      }

      trackUris.push(best.uri)
      added += 1
    }
    perBandAdded.push({ band: band.resolvedName, added, total: band.songs.length })
  }

  for (const batch of chunk(trackUris, 100)) {
    await spotify.addTracksToPlaylist(playlist.id, batch)
  }

  console.log(`\nCreated playlist: ${playlist.name}`)
  for (const row of perBandAdded) {
    console.log(`  ${row.band}: ${row.added}/${row.total} tracks`)
  }
  console.log(`Tracks added: ${trackUris.length}`)
  console.log(`Open: ${playlist.external_urls?.spotify || playlist.uri}`)

  if (missing.length > 0) {
    console.log('\nMissing tracks (could not match on Spotify):')
    for (const m of missing) {
      console.log(`- ${m.song} (search: ${m.search})`)
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
