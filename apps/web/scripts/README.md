# Scripts

## `setlist:spotify` — create Spotify playlist from latest setlist.fm setlist

Creates a Spotify playlist in your account using the **newest setlist.fm setlist** found for an artist name.

### Prereqs

- **Env vars** (in `apps/web/.env.local` or `apps/web/.env`)
  - `SETLISTFM_API_KEY`
  - `NEXT_SPOTIFY_CLIENT_ID`
  - `NEXT_SPOTIFY_CLIENT_SECRET`

- **Spotify auth (one-time)**
  - Start the web app (`yarn dev:http` from repo root)
  - Connect Spotify in the UI (this repo stores tokens in `apps/web/.tokens.json`)

### Run

From repo root:

```bash
yarn --cwd apps/web setlist:spotify "Bilmuri"
```

Optional:

```bash
yarn --cwd apps/web setlist:spotify "Bilmuri" --public
yarn --cwd apps/web setlist:spotify "Bilmuri" --name "Bilmuri — last setlist"
```

### Notes

- Track matching uses Spotify search with `track:"..." artist:"..."`. If setlist.fm marks a song as a **cover**, the script searches using the cover artist name.
- If some tracks can’t be matched, the script will still create the playlist and print a “Missing tracks” list at the end.

