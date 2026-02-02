const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  shell,
} = require('electron')
const path = require('path')

const PETE_URL = 'https://pete.sh'

// Store instance (loaded dynamically since electron-store is ESM-only)
let store = null

// Default window settings
const defaults = {
  windowBounds: { width: 1200, height: 800 },
  windowPosition: null,
}

let mainWindow = null
let tray = null

async function initStore() {
  if (!store) {
    const Store = (await import('electron-store')).default
    store = new Store({ defaults })
  }
  return store
}

async function createWindow() {
  await initStore()

  const { width, height } = store.get('windowBounds')
  const position = store.get('windowPosition')

  const windowOptions = {
    width,
    height,
    minWidth: 400,
    minHeight: 300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'build', 'icon.png'),
    title: 'petehome',
    show: false, // Don't show until ready
    backgroundColor: '#000000',
  }

  // Restore position if saved
  if (position) {
    windowOptions.x = position.x
    windowOptions.y = position.y
  }

  mainWindow = new BrowserWindow(windowOptions)

  // Load the petehome URL
  mainWindow.loadURL(PETE_URL)

  // Show window when ready to prevent flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url !== PETE_URL && !url.startsWith(PETE_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Save window bounds on resize
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized() && store) {
      store.set('windowBounds', mainWindow.getBounds())
    }
  })

  // Save window position on move
  mainWindow.on('move', () => {
    if (!mainWindow.isMaximized() && store) {
      const bounds = mainWindow.getBounds()
      store.set('windowPosition', { x: bounds.x, y: bounds.y })
    }
  })

  // Platform-specific close behavior
  mainWindow.on('close', event => {
    if (process.platform === 'win32' && tray) {
      // On Windows, minimize to tray instead of closing
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  // Load tray icon
  const iconPath = path.join(__dirname, 'build', 'icon.png')
  let trayIcon = nativeImage.createFromPath(iconPath)

  // Resize for tray (16x16 on Windows, varies on Mac)
  if (process.platform === 'win32') {
    trayIcon = trayIcon.resize({ width: 16, height: 16 })
  } else if (process.platform === 'darwin') {
    trayIcon = trayIcon.resize({ width: 18, height: 18 })
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('petehome')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show petehome',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: 'Hide',
      click: () => {
        if (mainWindow) {
          mainWindow.hide()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Reload',
      click: () => {
        if (mainWindow) {
          mainWindow.reload()
        }
      },
    },
    {
      label: 'Open in Browser',
      click: () => {
        shell.openExternal(PETE_URL)
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  // Double-click on tray icon shows window (Windows)
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// macOS: Create application menu
function createAppMenu() {
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
        ],
      },
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  } else {
    // Hide menu bar on Windows (can be shown with Alt)
    Menu.setApplicationMenu(null)
  }
}

// App lifecycle
app.whenReady().then(async () => {
  createAppMenu()
  await createWindow()
  createTray()

  // macOS: Recreate window when dock icon is clicked
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On Windows, we handle this via tray minimize
    // This will only fire if the window is truly closed (not hidden)
  }
})

// Clean up before quit
app.on('before-quit', () => {
  // Allow window to actually close on quit
  if (mainWindow) {
    mainWindow.removeAllListeners('close')
  }
})
