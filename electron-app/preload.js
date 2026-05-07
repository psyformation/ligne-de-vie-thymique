const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  saveExcel: (buffer, suggestedName) =>
    ipcRenderer.invoke('save-excel', buffer, suggestedName),

  openExcel: () =>
    ipcRenderer.invoke('open-excel'),

  savePDF: (buffer, suggestedName) =>
    ipcRenderer.invoke('save-pdf', buffer, suggestedName),

  getVersion: () =>
    ipcRenderer.invoke('get-version'),

  onMenuExport: (callback) =>
    ipcRenderer.on('menu-export-excel', () => callback('excel')),

  onMenuImport: (callback) =>
    ipcRenderer.on('menu-import-excel', () => callback()),

  onMenuPDF: (callback) =>
    ipcRenderer.on('menu-export-pdf', () => callback()),
});
