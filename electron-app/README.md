# petehome Desktop App

A dedicated Electron app for accessing your petehome smart home dashboard.

## Features

- Dedicated window for pete.sh
- System tray support (Windows)
- Menu bar and Dock integration (Mac)
- Window position/size persistence
- Quick access via tray icon

## Development

### Prerequisites

- Node.js 18+
- Yarn or npm

### Setup

```bash
cd electron-app
yarn install
```

### Run in Development

```bash
yarn start
```

### Generate Icons

Before building, generate the Windows ICO file:

```bash
yarn icons
```

For Mac builds, you'll need to create `build/icon.icns` manually:

- On macOS: Use `iconutil` or Image2icon app
- Online: Use cloudconvert.com
- electron-builder can auto-generate from PNG when building on macOS

## Building

### Windows

```bash
yarn build:win
```

Creates:

- `dist/petehome Setup X.X.X.exe` - NSIS installer
- `dist/petehome X.X.X.exe` - Portable executable

### Mac

```bash
yarn build:mac
```

Creates:

- `dist/petehome-X.X.X.dmg` - DMG installer
- `dist/petehome-X.X.X-mac.zip` - Zipped app

### Both Platforms

```bash
yarn build
```

Note: Cross-compilation has limitations. Building for Mac requires macOS.

## Usage

### Windows

- The app runs in the system tray
- Double-click the tray icon to show/hide the window
- Right-click for menu options
- Close button minimizes to tray instead of quitting
- Use "Quit" from tray menu or Alt+F4 to fully exit

### Mac

- Standard Mac app behavior
- Cmd+Q to quit
- Click Dock icon to show window
- Optional: Can also show in menu bar

## Configuration

Window settings are automatically saved to:

- Windows: `%APPDATA%/petehome-desktop/config.json`
- Mac: `~/Library/Application Support/petehome-desktop/config.json`

## Future Enhancements

- [ ] Native notifications
- [ ] Global keyboard shortcuts
- [ ] Auto-launch on startup
- [ ] Auto-updates via electron-updater
- [ ] Integration with desktop service (volume, display control)
