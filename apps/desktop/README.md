# petehome Desktop App

Legacy Electron wrapper that used to open the petehome web UI.

**Note:** `apps/web` is now a local petehome PWA only (`/coach`). It is not published to
pete.sh / Vercel. This desktop shell is outdated unless you retarget it at a local origin
(e.g. `https://localhost:3000/coach`). Prefer the browser for daily coaching.

## Features (historical)

- Dedicated window for the web app
- System tray support (Windows)
- Menu bar and Dock integration (Mac)
- Window position/size persistence

## Development

```bash
cd apps/desktop
yarn install
yarn start
```

Generate Windows ICO before packaging: `yarn icons`.

## Building

```bash
yarn build:win   # NSIS + portable
yarn build:mac   # requires macOS
```

## Config

Window settings:

- Windows: `%APPDATA%/petehome-desktop/config.json`
- Mac: `~/Library/Application Support/petehome-desktop/config.json`
