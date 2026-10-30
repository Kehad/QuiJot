const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getInitialData: () => ipcRenderer.invoke('get-initial-data'),
  saveNote: (content, noteId) => ipcRenderer.invoke('save-note', content, noteId),
  saveNotesList: (payload) => ipcRenderer.invoke('save-notes-list', payload),
  saveConfig: (partialConfig) => ipcRenderer.invoke('save-config', partialConfig),
  setAlwaysOnTop: (isTop) => ipcRenderer.invoke('set-always-on-top', isTop),
  setOpacity: (opacity) => ipcRenderer.invoke('set-opacity', opacity),
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  hideToTray: () => ipcRenderer.send('window-hide-tray'),
  setStartup: (enable) => ipcRenderer.invoke('set-startup', enable),
  exportFile: (content, defaultName) => ipcRenderer.invoke('export-file', { content, defaultName }),
  startRectangularSnip: () => ipcRenderer.invoke('start-rectangular-snip'),
  captureFullScreen: () => ipcRenderer.invoke('capture-full-screen'),
  captureWindow: (sourceId) => ipcRenderer.invoke('capture-window', sourceId),
  getCapturableSources: () => ipcRenderer.invoke('get-capturable-sources'),
  selectScreenshotFolder: () => ipcRenderer.invoke('select-screenshot-folder'),
  openScreenshotFolder: () => ipcRenderer.invoke('open-screenshot-folder'),
  openScreenshotFile: (filePath) => ipcRenderer.invoke('open-screenshot-file', filePath),
  copyScreenshotToClipboard: (dataUrl) => ipcRenderer.invoke('copy-screenshot', dataUrl),
  saveScreenshot: (dataUrl, defaultName) => ipcRenderer.invoke('save-screenshot', { dataUrl, defaultName }),
  onNoteExternalUpdate: (callback) => {
    const subscription = (_event, content) => callback(content);
    ipcRenderer.on('external-note-update', subscription);
    return () => ipcRenderer.removeListener('external-note-update', subscription);
  },
  onConfigExternalUpdate: (callback) => {
    const subscription = (_event, config) => callback(config);
    ipcRenderer.on('external-config-update', subscription);
    return () => ipcRenderer.removeListener('external-config-update', subscription);
  },
  onTriggerScreenshot: (callback) => {
    const subscription = (_event, mode) => callback(mode);
    ipcRenderer.on('trigger-screenshot', subscription);
    return () => ipcRenderer.removeListener('trigger-screenshot', subscription);
  },
  onScreenshotCaptured: (callback) => {
    const subscription = (_event, result) => callback(result);
    ipcRenderer.on('screenshot-captured', subscription);
    return () => ipcRenderer.removeListener('screenshot-captured', subscription);
  },
  onTriggerNewNote: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('trigger-new-note', subscription);
    return () => ipcRenderer.removeListener('trigger-new-note', subscription);
  },
  onTriggerNotesList: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('trigger-notes-list', subscription);
    return () => ipcRenderer.removeListener('trigger-notes-list', subscription);
  },
});


