const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('snipAPI', {
  onInitSnip: (callback) => {
    ipcRenderer.on('init-snip', (_e, data) => callback(data));
  },
  finishSnip: (result) => {
    ipcRenderer.send('finish-snip', result);
  },
  cancelSnip: () => {
    ipcRenderer.send('cancel-snip');
  },
});
