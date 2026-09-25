# Scripts

Coach tooling for the local petehome app, plus a setlist → Spotify helper.

## Coach

From `apps/web`:

```bash
yarn coach:doctor
yarn coach:backfill plans
yarn coach:backfill apple --file <export.xml>
yarn coach:backfill files --dir <tcx-dir>
yarn coach:ingest --list
yarn coach:ingest --dir ./data/knowledge
yarn coach:eval
yarn export:swim
```

## Setlist → Spotify

```bash
yarn setlist:spotify "Bilmuri" "Dance Gavin Dance"
yarn setlist:spotify Bilmuri --shows 3 --name "Riot Fest prep"
yarn setlist:spotify Bilmuri --auth   # force OAuth if tokens are stale
```

Needs `SETLISTFM_API_KEY`, `NEXT_SPOTIFY_CLIENT_ID`, `NEXT_SPOTIFY_CLIENT_SECRET`
in `.env`.

**One-time Spotify setup:** in the [Spotify developer dashboard](https://developer.spotify.com/dashboard)
add this Redirect URI (exact match):

```
http://127.0.0.1:8765/callback
```

Override with `SPOTIFY_REDIRECT_URI` if you prefer a different registered URI.
Then run with `--auth` once to write `.tokens.json`.

From repo root (worker):

```bash
yarn p:start:worker
yarn coach:job briefing
```

See `PETEHOME-COACH.md` and `PETEHOME-NEXT-STEPS.md` at the monorepo root.
