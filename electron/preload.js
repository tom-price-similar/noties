const { contextBridge } = require('electron')

// Expose isElectron flag to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true
})
