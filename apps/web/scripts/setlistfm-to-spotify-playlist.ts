import fs from "fs"
import path from "path"
import dotenv from "dotenv"
import { SetlistFMService } from "../lib/services/setlistfm.service"
import { SpotifyService } from "../lib/services/spotify.service"
import { getSpotifyTokens, setSpotifyTokens } from "../lib/services/token-storage"

function loadEnv(): void {
  const candidates = [".env.local", ".env"]
  for (const file of candidates) {
    const fullPath = path.resolve(process.cwd(), file)
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath })
    }
  }
}

function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*-\s*(live|remaster(ed)?|radio edit|edit|mono|stereo).*$/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function parseArgs(argv: string[]): {
  artistName: string
  playlistName?: string
  public?: boolean
} {
  const args = argv.slice(2)
  const artistParts: string[] = []
  let playlistName: string | undefined
  let publicFlag: boolean | undefined

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i]
    if (!a) continue

    if (a === "--name") {
      playlistName = args[i + 1]
      i += 1
      continue
    }

    if (a === "--public") {
      publicFlag = true
      continue
    }
    if (a === "--private") {
      publicFlag = false
      continue
    }

    artistParts.push(a)
  }

  const artistName = artistParts.join(" ").trim()
  if (!artistName) {
    throw new Error('Usage: yarn setlist:spotify "Bilmuri" [--name "Custom playlist name"] [--public|--private]')
  }

  return { artistName, playlistName, public: publicFlag }
}

async function getAuthenticatedSpotifyServiceForScript(): Promise<SpotifyService> {
  const service = new SpotifyService()
  if (!service.isConfigured()) {
    throw new Error(
      "Spotify not configured. Set NEXT_SPOTIFY_CLIENT_ID and NEXT_SPOTIFY_CLIENT_SECRET."
    )
  }

  const stored = getSpotifyTokens()
  if (!stored.accessToken && !stored.refreshToken) {
    throw new Error(
      "Not authenticated with Spotify yet. Start the web app and connect Spotify so .tokens.json is created."
    )
  }

  if (stored.accessToken) {
    service.setCredentials(stored.accessToken, stored.refreshToken || undefined)
    return service
  }

  if (!stored.refreshToken) {
    throw new Error("Missing refresh token; reconnect Spotify in the web app.")
  }

  const tokens = await service.refreshAccessToken(stored.refreshToken)
  const expiryDate = Date.now() + tokens.expires_in * 1000
  setSpotifyTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || stored.refreshToken,
    expiry_date: expiryDate,
  })
  service.setCredentials(tokens.access_token, tokens.refresh_token || stored.refreshToken)
  return service
}

async function main(): Promise<void> {
  loadEnv()
  const { artistName, playlistName, public: publicFlag } = parseArgs(process.argv)

  const setlistService = new SetlistFMService()
  if (!setlistService.isConfigured()) {
    throw new Error("setlist.fm not configured. Set SETLISTFM_API_KEY.")
  }

  const { setlists } = await setlistService.searchSetlistsByName(artistName)
  const newestWithSongs =
    setlists.find((s) => (s.sets?.set || []).some((set) => (set.song || []).length > 0)) || setlists[0]

  if (!newestWithSongs) {
    throw new Error(`No setlists found for "${artistName}".`)
  }

  const normalized = setlistService.normalizeSetlist(newestWithSongs)
  const songs = normalized.sets.flatMap((s) => s.song).filter((s) => !s.tape)

  if (songs.length === 0) {
    throw new Error(`Found a setlist for "${artistName}", but it had no songs.`)
  }

  const spotify = await getAuthenticatedSpotifyServiceForScript()
  const user = await spotify.getCurrentUser()

  const playlistTitle =
    playlistName ||
    `${normalized.artist.name} — ${normalized.eventDate}${normalized.venue?.name ? ` (${normalized.venue.name})` : ""}`

  const description = `From setlist.fm: ${normalized.url}`

  const playlist = await spotify.createPlaylist(user.id, playlistTitle, {
    description,
    public: publicFlag ?? false,
  })

  const trackUris: string[] = []
  const missing: { song: string; search: string }[] = []

  for (const song of songs) {
    const primaryArtist = song.cover?.name || normalized.artist.name
    const q = `track:"${song.name}" artist:"${primaryArtist}"`
    const result = await spotify.search(q, ["track"], 5)
    const items = result.tracks?.items || []

    const desired = normalizeForMatch(song.name)
    const best =
      items.find((t) => normalizeForMatch(t.name) === desired) ||
      items.find((t) => normalizeForMatch(t.name).includes(desired)) ||
      items[0]

    if (!best?.uri) {
      missing.push({ song: `${song.name} — ${primaryArtist}`, search: q })
      continue
    }

    trackUris.push(best.uri)
  }

  for (const batch of chunk(trackUris, 100)) {
    await spotify.addTracksToPlaylist(playlist.id, batch)
  }

  // eslint-disable-next-line no-console
  console.log(`Created playlist: ${playlist.name}`)
  // eslint-disable-next-line no-console
  console.log(`Tracks added: ${trackUris.length}/${songs.length}`)
  // eslint-disable-next-line no-console
  console.log(`Open: ${playlist.external_urls?.spotify || playlist.uri}`)

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.log("\nMissing tracks (could not match on Spotify):")
    for (const m of missing) {
      // eslint-disable-next-line no-console
      console.log(`- ${m.song} (search: ${m.search})`)
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})

