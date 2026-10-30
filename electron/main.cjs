const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, screen, desktopCapturer, clipboard, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const store = require('./store.cjs');


// Enforce single application instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Ensure Windows taskbar correctly groups and displays full-size icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.fastnote.app');
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Create a crisp 16x16 / 32x32 yellow pin icon buffer for the system tray
function createTrayIcon() {
  // A clean 16x16 RGBA buffer depicting a crisp yellow pin
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);

  // Fill transparent initially
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Draw a sleek yellow sticky pin shape
      const isHeader = y >= 2 && y <= 5 && x >= 3 && x <= 12;
      const isBody = y >= 6 && y <= 10 && x >= 5 && x <= 10;
      const isNeedle = y >= 11 && y <= 14 && x === 8;
      const isHighlight = y === 3 && x >= 5 && x <= 7;

      if (isHighlight) {
        buffer[idx] = 255; // R
        buffer[idx + 1] = 255; // G
        buffer[idx + 2] = 255; // B
        buffer[idx + 3] = 230; // A
      } else if (isHeader || isBody) {
        buffer[idx] = 250; // R (Amber/Yellow)
        buffer[idx + 1] = 204; // G
        buffer[idx + 2] = 21; // B
        buffer[idx + 3] = 255; // A
      } else if (isNeedle) {
        buffer[idx] = 200;
        buffer[idx + 1] = 200;
        buffer[idx + 2] = 200;
        buffer[idx + 3] = 255;
      } else {
        buffer[idx + 3] = 0; // Transparent
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

function createWindow() {
  const config = store.readConfig();
  const clampedBounds = store.clampToViewport(config.bounds);

  const initialBounds = clampedBounds || {
    width: config.bounds.width || 340,
    height: config.bounds.height || 380,
  };

  const iconPath = path.join(__dirname, '../assests/web/icon-512x512.png');

  mainWindow = new BrowserWindow({
    ...initialBounds,
    minWidth: 240,
    minHeight: 160,
    icon: iconPath,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    show: false, // Show once ready-to-show to prevent visual flicker
    alwaysOnTop: Boolean(config.isAlwaysOnTop),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  try {
    mainWindow.setIcon(iconPath);
  } catch {}

  // Always on top level: 'screen-saver' keeps it above full-screen windows & editors
  if (config.isAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  }

  // Set initial opacity
  const targetOpacity = typeof config.opacity === 'number' ? config.opacity : 0.95;
  mainWindow.setOpacity(Math.max(0.3, Math.min(1.0, targetOpacity)));

  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
  const devUrl = 'http://localhost:5199';

  if (isDev) {
    mainWindow.loadURL(devUrl).catch(() => {
      // If dev server not yet active, fallback to retry
      setTimeout(() => mainWindow && mainWindow.loadURL(devUrl), 1000);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    showWindow();
  });

  // Debounced bounds saver
  let saveBoundsTimeout = null;
  const handleBoundsChange = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    clearTimeout(saveBoundsTimeout);
    saveBoundsTimeout = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const bounds = mainWindow.getBounds();
      store.saveConfig({ bounds });
    }, 400);
  };

  mainWindow.on('resize', handleBoundsChange);
  mainWindow.on('move', handleBoundsChange);

  // Close to tray behavior: hide window instead of quitting so global shortcuts remain active
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      updateTrayContextMenu();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    updateTrayContextMenu();
  });

  mainWindow.on('show', () => {
    updateTrayContextMenu();
  });

  mainWindow.on('hide', () => {
    updateTrayContextMenu();
  });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  const config = store.readConfig();
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  // Elevate above all windows on Windows to guarantee bringing to the foreground
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.show();
  mainWindow.focus();

  // If the user unpinned AlwaysOnTop, release top level back to normal after bringing forward
  if (!config.isAlwaysOnTop) {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const currentConf = store.readConfig();
        if (!currentConf.isAlwaysOnTop) {
          mainWindow.setAlwaysOnTop(false);
        }
      }
    }, 200);
  }
  updateTrayContextMenu();
}

function toggleAppVisibility() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible()) {
    if (mainWindow.isFocused()) {
      mainWindow.hide();
      updateTrayContextMenu();
    } else {
      showWindow();
    }
  } else {
    showWindow();
  }
}

function updateTrayContextMenu() {
  if (!tray) return;
  const config = store.readConfig();
  const isWinVisible = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isWinVisible ? 'Hide FastNote (Alt+Shift+N)' : 'Open FastNote (Alt+Shift+N)',
      click: () => {
        toggleAppVisibility();
      },
    },
    {
      label: '➕ New Note (Ctrl+N)',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          createWindow();
          mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('trigger-new-note');
          });
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          if (!mainWindow.isVisible()) mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('trigger-new-note');
        }
      },
    },
    {
      label: '📋 Notes List (Ctrl+L)',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          createWindow();
          mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('trigger-notes-list');
          });
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          if (!mainWindow.isVisible()) mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('trigger-notes-list');
        }
      },
    },
    { type: 'separator' },
    {
      label: '📸 FastSnap',
      submenu: [
        {
          label: '📐 Rectangular Snip',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) {
              createWindow();
              mainWindow.once('ready-to-show', () => {
                mainWindow.webContents.send('trigger-screenshot', 'rect');
              });
            } else {
              mainWindow.webContents.send('trigger-screenshot', 'rect');
            }
          },
        },
        {
          label: '🪟 Snip Window...',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) {
              createWindow();
              mainWindow.once('ready-to-show', () => {
                mainWindow.show();
                mainWindow.focus();
                mainWindow.webContents.send('trigger-screenshot', 'window');
              });
            } else {
              if (mainWindow.isMinimized()) mainWindow.restore();
              if (!mainWindow.isVisible()) mainWindow.show();
              mainWindow.focus();
              mainWindow.webContents.send('trigger-screenshot', 'window');
            }
          },
        },
        {
          label: '🖥️ Full Screen Snip',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) {
              createWindow();
              mainWindow.once('ready-to-show', () => {
                mainWindow.webContents.send('trigger-screenshot', 'screen');
              });
            } else {
              mainWindow.webContents.send('trigger-screenshot', 'screen');
            }
          },
        },
        { type: 'separator' },
        {
          label: '📁 Open Screenshots Folder',
          click: () => {
            const conf = store.readConfig();
            if (conf.screenshotFolder) shell.openPath(conf.screenshotFolder);
          },
        },
      ],
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: Boolean(config.isAlwaysOnTop),
      click: (item) => {
        const isTop = item.checked;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(isTop, 'screen-saver', 1);
          mainWindow.webContents.send('external-config-update', { isAlwaysOnTop: isTop });
        }
        store.saveConfig({ isAlwaysOnTop: isTop });
        updateTrayContextMenu();
      },
    },
    {
      label: 'Opacity',
      submenu: [1.0, 0.8, 0.6, 0.4].map((level) => ({
        label: `${Math.round(level * 100)}%`,
        type: 'radio',
        checked: Math.abs((config.opacity || 0.95) - level) < 0.05,
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setOpacity(level);
            mainWindow.webContents.send('external-config-update', { opacity: level });
          }
          store.saveConfig({ opacity: level });
          updateTrayContextMenu();
        },
      })),
    },
    {
      label: 'New / Clear Note',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          createWindow();
          mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('external-note-update', '');
          });
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          if (!mainWindow.isVisible()) mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('external-note-update', '');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit FastNote',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function setupTray() {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('FastNote — Sticky Note & FastSnap');

  tray.on('click', () => {
    toggleAppVisibility();
  });

  tray.on('right-click', () => {
    updateTrayContextMenu();
  });

  updateTrayContextMenu();
}

// IPC Handlers
ipcMain.handle('get-initial-data', async () => {
  const notesPayload = store.readNotes();
  const config = store.readConfig();
  const activeNote = notesPayload.notes.find((n) => n.id === notesPayload.activeNoteId) || notesPayload.notes[0];
  return {
    notesPayload,
    note: activeNote ? { content: activeNote.content, updatedAt: activeNote.updatedAt, id: activeNote.id, title: activeNote.title } : { content: '', updatedAt: new Date().toISOString() },
    config,
  };
});

ipcMain.handle('save-note', async (_event, content, noteId) => {
  const current = store.readNotes();
  const targetId = noteId || current.activeNoteId;
  const activeIdx = current.notes.findIndex((n) => n.id === targetId);
  const now = new Date().toISOString();
  const firstLine = content.split('\n')[0].trim().slice(0, 30) || 'Untitled Note';

  if (activeIdx >= 0) {
    current.notes[activeIdx].content = content;
    current.notes[activeIdx].title = firstLine;
    current.notes[activeIdx].updatedAt = now;
  } else {
    const newNote = {
      id: targetId || ('note_' + Date.now()),
      title: firstLine,
      content,
      createdAt: now,
      updatedAt: now,
    };
    current.notes.unshift(newNote);
    current.activeNoteId = newNote.id;
  }
  store.atomicWrite(store.notesFile, current);
  return { content, updatedAt: now, id: targetId, title: firstLine };
});

ipcMain.handle('save-notes-list', async (_event, payload) => {
  return store.saveNotes(payload);
});

ipcMain.handle('save-config', async (_event, partialConfig) => {
  const updated = store.saveConfig(partialConfig);
  updateTrayContextMenu();
  return updated;
});

ipcMain.handle('set-always-on-top', async (_event, isTop) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(isTop, 'screen-saver', 1);
  }
  store.saveConfig({ isAlwaysOnTop: isTop });
  updateTrayContextMenu();
  return isTop;
});

ipcMain.handle('set-opacity', async (_event, opacity) => {
  const clamped = Math.max(0.3, Math.min(1.0, opacity));
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setOpacity(clamped);
  }
  store.saveConfig({ opacity: clamped });
  updateTrayContextMenu();
  return clamped;
});

ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const config = store.readConfig();
    if (config.closeToTray !== false) {
      mainWindow.hide();
    } else {
      mainWindow.close();
    }
    updateTrayContextMenu();
  }
});

ipcMain.on('window-hide-tray', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
});

ipcMain.handle('set-startup', async (_event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: Boolean(enable),
    path: app.getPath('exe'),
  });
  store.saveConfig({ startOnBoot: Boolean(enable) });
  return Boolean(enable);
});

ipcMain.handle('export-file', async (_event, { content, defaultName }) => {
  if (!mainWindow) return false;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Sticky Note',
    defaultPath: defaultName || 'FastNote.txt',
    filters: [
      { name: 'Text Documents', extensions: ['txt'] },
      { name: 'Markdown Documents', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (canceled || !filePath) return false;

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to export note:', err);
    return false;
  }
});

// ==========================================================================
// Snipping Tool & Screenshot Management Engine
// ==========================================================================
let snippingWindow = null;

// Helper: Save screenshot to designated folder & copy to clipboard
function saveScreenshotFile(dataUrl, customLabel = 'Snip') {
  const config = store.readConfig();
  let targetFolder = config.screenshotFolder;
  if (!targetFolder) {
    const picDir = app.getPath('pictures') || app.getPath('documents') || app.getPath('home');
    targetFolder = path.join(picDir, 'FastNote Screenshots');
  }

  try {
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create screenshot folder:', err);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hours}${mins}${secs}`;

  const cleanLabel = (customLabel || 'Snip').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const filename = `FastNote_${cleanLabel}_${dateStr}_${timeStr}.png`;
  const filePath = path.join(targetFolder, filename);

  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

  // Automatically write image to system clipboard
  try {
    const img = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(img);
  } catch (err) {
    console.error('Failed to write image to clipboard:', err);
  }

  return {
    filePath,
    filename,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

// Helper: Capture the screen cleanly with FastNote hidden
async function captureDesktopScreen() {
  const wasVisible = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();
  if (wasVisible) {
    mainWindow.hide();
  }

  // Wait 160ms for desktop repaint
  await new Promise((r) => setTimeout(r, 160));

  const primaryDisplay = screen.getPrimaryDisplay();
  const sf = primaryDisplay.scaleFactor || 1;
  const screenW = Math.round(primaryDisplay.bounds.width * sf);
  const screenH = Math.round(primaryDisplay.bounds.height * sf);

  let targetImg = null;

  // Attempt 1: desktopCapturer
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: Math.max(1920, screenW), height: Math.max(1080, screenH) },
    });
    if (sources.length > 0 && !sources[0].thumbnail.isEmpty()) {
      targetImg = sources[0].thumbnail;
    }
  } catch (err) {
    console.warn('desktopCapturer screen capture notice:', err);
  }

  // Attempt 2: PowerShell screencap fallback
  if (!targetImg || targetImg.isEmpty()) {
    try {
      const tempPath = path.join(app.getPath('temp'), `fastnote_temp_${Date.now()}.png`);
      const psScript = path.join(__dirname, 'screencap.ps1');
      await new Promise((resolve) => {
        execFile(
          'powershell',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScript, '-OutFile', tempPath],
          (err) => {
            if (!err && fs.existsSync(tempPath)) {
              try {
                targetImg = nativeImage.createFromPath(tempPath);
                fs.unlinkSync(tempPath);
              } catch {}
            }
            resolve();
          }
        );
      });
    } catch (err) {
      console.warn('PowerShell fallback notice:', err);
    }
  }

  return { targetImg, wasVisible, primaryDisplay };
}

// 1. Rectangular Snip (Full-screen interactive overlay)
ipcMain.handle('start-rectangular-snip', async () => {
  try {
    const { targetImg, wasVisible, primaryDisplay } = await captureDesktopScreen();

    if (!targetImg || targetImg.isEmpty()) {
      if (wasVisible && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
      throw new Error('Could not capture desktop screen. Please check screen permissions.');
    }

    const bounds = primaryDisplay.bounds;
    const sf = primaryDisplay.scaleFactor || 1;

    return new Promise((resolve) => {
      if (snippingWindow && !snippingWindow.isDestroyed()) {
        snippingWindow.destroy();
      }

      snippingWindow = new BrowserWindow({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        fullscreen: true,
        resizable: false,
        movable: false,
        backgroundColor: '#00000000',
        webPreferences: {
          preload: path.join(__dirname, 'snipping-preload.cjs'),
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
        },
      });

      snippingWindow.setAlwaysOnTop(true, 'screen-saver', 2);
      snippingWindow.loadFile(path.join(__dirname, 'snipping-overlay.html'));

      snippingWindow.once('ready-to-show', () => {
        snippingWindow.show();
        snippingWindow.focus();
        snippingWindow.webContents.send('init-snip', {
          dataUrl: targetImg.toDataURL(),
          bounds,
          scaleFactor: sf,
        });
      });

      // Handle finish snip from overlay
      ipcMain.once('finish-snip', (_e, { dataUrl, width, height }) => {
        if (snippingWindow && !snippingWindow.isDestroyed()) {
          snippingWindow.destroy();
          snippingWindow = null;
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }

        const saved = saveScreenshotFile(dataUrl, 'Snip');
        const result = {
          dataUrl,
          width,
          height,
          name: 'Rectangular Snip',
          filePath: saved.filePath,
          timestamp: saved.timestamp,
        };

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('screenshot-captured', result);
        }
        resolve(result);
      });

      // Handle cancel snip
      ipcMain.once('cancel-snip', () => {
        if (snippingWindow && !snippingWindow.isDestroyed()) {
          snippingWindow.destroy();
          snippingWindow = null;
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
        resolve(null);
      });
    });
  } catch (err) {
    console.error('Rectangular snip failed:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
    throw err;
  }
});

// 2. Full Screen Snip
ipcMain.handle('capture-full-screen', async () => {
  try {
    const { targetImg, wasVisible } = await captureDesktopScreen();

    if (wasVisible && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }

    if (!targetImg || targetImg.isEmpty()) {
      throw new Error('Screen capture returned an empty frame.');
    }

    const dataUrl = targetImg.toDataURL();
    const size = targetImg.getSize();
    const saved = saveScreenshotFile(dataUrl, 'FullScreen');

    const result = {
      dataUrl,
      width: size.width,
      height: size.height,
      name: 'Full Screen',
      filePath: saved.filePath,
      timestamp: saved.timestamp,
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('screenshot-captured', result);
    }
    return result;
  } catch (err) {
    console.error('Full screen capture failed:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
    throw err;
  }
});

// 3. Window Snip: Get Open Windows
ipcMain.handle('get-capturable-sources', async () => {
  try {
    const myMediaId = mainWindow && !mainWindow.isDestroyed() ? mainWindow.getMediaSourceId() : null;
    let sources = [];
    try {
      sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 440, height: 260 },
        fetchWindowIcons: true,
      });
    } catch {
      sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 440, height: 260 },
        fetchWindowIcons: false,
      });
    }

    const ignoredNames = ['taskbar', 'program manager', 'windows input experience', 'default ime', 'msctfime ui'];

    const filtered = sources.filter((s) => {
      // Exclude FastNote's own sticky note window
      if (myMediaId && s.id === myMediaId) return false;
      const nameTrimmed = (s.name || '').trim();
      if (!nameTrimmed) return false;

      const nameLower = nameTrimmed.toLowerCase();
      // Only exclude FastNote's exact app title, DO NOT exclude other apps (VS Code, Chrome, etc.)
      if (nameLower === 'alwaysontop' || nameLower === 'fastnote' || nameLower === 'fastnote snipping tool' || nameLower === 'fastsnap') {
        return false;
      }
      if (ignoredNames.includes(nameLower)) return false;
      return true;
    });

    return filtered.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail ? s.thumbnail.toDataURL() : '',
      appIcon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : null,
      type: 'window',
    }));
  } catch (err) {
    console.error('Failed to get capturable window sources:', err);
    return [];
  }
});

// 4. Capture a Specific Window
ipcMain.handle('capture-window', async (_event, sourceId) => {
  try {
    let sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 2560, height: 1440 },
      fetchWindowIcons: true,
    });

    let target = sources.find((s) => s.id === sourceId);
    if (!target || target.thumbnail.isEmpty()) {
      // Fallback with standard 1080p if high-res failed
      sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1920, height: 1080 },
        fetchWindowIcons: false,
      });
      target = sources.find((s) => s.id === sourceId);
    }

    if (!target || target.thumbnail.isEmpty()) {
      throw new Error('Selected window is minimized, hidden, or could not be captured. Please make sure the window is open and visible on screen.');
    }

    const dataUrl = target.thumbnail.toDataURL();
    const size = target.thumbnail.getSize();
    const saved = saveScreenshotFile(dataUrl, target.name);

    const result = {
      dataUrl,
      width: size.width,
      height: size.height,
      name: target.name,
      filePath: saved.filePath,
      timestamp: saved.timestamp,
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('screenshot-captured', result);
    }
    return result;
  } catch (err) {
    console.error('Window capture failed:', err);
    throw err;
  }
});

// 5. Screenshot Folder & File Management
ipcMain.handle('select-screenshot-folder', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder for FastNote Screenshots',
    properties: ['openDirectory', 'createDirectory'],
  });

  if (canceled || !filePaths || filePaths.length === 0) return null;

  const chosenFolder = filePaths[0];
  store.saveConfig({ screenshotFolder: chosenFolder });
  mainWindow.webContents.send('external-config-update', { screenshotFolder: chosenFolder });
  return chosenFolder;
});

ipcMain.handle('open-screenshot-folder', async () => {
  const config = store.readConfig();
  if (config.screenshotFolder && fs.existsSync(config.screenshotFolder)) {
    shell.openPath(config.screenshotFolder);
    return true;
  }
  return false;
});

ipcMain.handle('open-screenshot-file', async (_event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.openPath(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('copy-screenshot', async (_event, dataUrl) => {
  try {
    const img = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(img);
    return true;
  } catch (err) {
    console.error('Failed to copy screenshot to clipboard:', err);
    return false;
  }
});

ipcMain.handle('save-screenshot', async (_event, { dataUrl, defaultName }) => {
  if (!mainWindow) return { success: false };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Screenshot As',
    defaultPath: defaultName || `Screenshot-${Date.now()}.png`,
    filters: [
      { name: 'PNG Images', extensions: ['png'] },
      { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (canceled || !filePath) return { success: false };

  try {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return { success: true, filePath };
  } catch (err) {
    console.error('Failed to save screenshot file:', err);
    return { success: false, error: err.message };
  }
});


app.on('second-instance', () => {
  toggleAppVisibility();
});

app.whenReady().then(() => {
  createWindow();
  setupTray();

  // Global Shortcuts for instant access anywhere:
  // - Alt+Shift+N (Standard sticky note toggle)
  // - Ctrl+Alt+N (Ergonomic alternative)
  // - Ctrl+Shift+Space (Fast single-hand thumb summon)
  // - Alt+N (Direct quick key)
  const openShortcuts = [
    'Alt+Shift+N',
    'CommandOrControl+Alt+N',
    'CommandOrControl+Shift+Space',
    'Alt+N',
  ];

  openShortcuts.forEach((shortcut) => {
    try {
      const success = globalShortcut.register(shortcut, toggleAppVisibility);
      if (success) {
        console.log(`Global open shortcut active: ${shortcut}`);
      }
    } catch (err) {
      console.warn(`Could not register ${shortcut}:`, err);
    }
  });

  // Global Shortcut 2: Ctrl+Shift+S for Snipping Tool
  try {
    globalShortcut.register('CommandOrControl+Shift+S', () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow();
        mainWindow.once('ready-to-show', () => {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('trigger-screenshot', 'rect');
        });
      } else {
        if (mainWindow.isMinimized()) mainWindow.restore();
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('trigger-screenshot', 'rect');
      }
    });
  } catch (err) {
    console.warn('Failed to register global shortcut:', err);
  }

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  });
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // FastNote runs as a resident background tray application.
  // Do NOT quit when the window is closed, so global shortcuts remain responsive.
  if (isQuitting) {
    app.quit();
  }
});
