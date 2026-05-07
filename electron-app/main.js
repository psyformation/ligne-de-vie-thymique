const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1340,
    height: 860,
    minWidth:  900,
    minHeight: 600,
    title: 'Ligne de Vie Thymique',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#f1f5f9',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── Application menu ──────────────────────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Exporter Excel',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu-export-excel'),
        },
        {
          label: 'Importer Excel',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow.webContents.send('menu-import-excel'),
        },
        { type: 'separator' },
        {
          label: 'Exporter PDF',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.send('menu-export-pdf'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'Quitter' },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo',  label: 'Annuler' },
        { role: 'redo',  label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut',   label: 'Couper' },
        { role: 'copy',  label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload',         label: 'Recharger' },
        { role: 'forceReload',    label: 'Forcer le rechargement' },
        { type: 'separator' },
        { role: 'resetZoom',      label: 'Zoom par défaut' },
        { role: 'zoomIn',         label: 'Zoom +' },
        { role: 'zoomOut',        label: 'Zoom −' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos',
          click: async () => {
            await dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'À propos',
              message: 'Ligne de Vie Thymique',
              detail: `Version ${app.getVersion()}\n\nApplication hors-ligne de suivi thymic.\nDonnées stockées localement sur cet appareil.\n\n© Ligne de Vie Thymique`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('save-excel', async (event, buffer, suggestedName) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Enregistrer le fichier Excel',
    defaultPath: suggestedName || 'suivi-thymic.xlsx',
    filters: [{ name: 'Fichier Excel', extensions: ['xlsx'] }],
  });
  if (canceled || !filePath) return { ok: false };
  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('open-excel', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: 'Ouvrir un fichier Excel',
    filters: [{ name: 'Fichier Excel', extensions: ['xlsx', 'xls'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return null;
  try {
    const data = fs.readFileSync(filePaths[0]);
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  } catch (err) {
    return null;
  }
});

ipcMain.handle('save-pdf', async (event, buffer, suggestedName) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Enregistrer le PDF',
    defaultPath: suggestedName || 'ligne-de-vie.pdf',
    filters: [{ name: 'Fichier PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { ok: false };
  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
