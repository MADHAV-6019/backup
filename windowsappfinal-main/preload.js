const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  downloadSong: (url, filename) => ipcRenderer.invoke('download-song', url, filename),
  listDownloads: () => ipcRenderer.invoke('list-downloads'),
  playDownloadedSong: (path) => ipcRenderer.invoke('play-downloaded-song', path) // optional, might just use file:// url
});
