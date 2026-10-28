const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('qqspeed', {
  syncOfficial: () => ipcRenderer.invoke('official:sync'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  openExternal: (url) => ipcRenderer.invoke('external:open', url),
})
