// Preload script for petehome Electron app
// This runs in a sandboxed context with access to Node.js APIs
// but isolated from the renderer process for security.

const { contextBridge, ipcRenderer } = require('electron')

// Expose a minimal API to the renderer process
// This can be extended later for native integrations
contextBridge.exposeInMainWorld('petehome', {
  // Platform information
  platform: process.platform,

  // Future extension points:
  // - Native notifications
  // - Desktop integration (volume, display)
  // - Keyboard shortcuts
  // - Auto-launch settings
})

// Log when preload script is loaded (for debugging)
console.log('petehome preload script loaded')
