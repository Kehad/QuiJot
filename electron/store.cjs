const fs = require('fs');
const path = require('path');
const { app, screen } = require('electron');

class DataStore {
  constructor() {
    const baseDir = process.env.APPDATA || app.getPath('userData');
    this.userDataPath = path.join(baseDir, 'Qikjot');
    const legacyPaths = [path.join(baseDir, 'AlwaysOnTop')];
    if (!fs.existsSync(this.userDataPath)) {
      try {
        const found = legacyPaths.find((p) => fs.existsSync(p));
        if (found) {
          // Migrate existing notes and config from legacy directory
          fs.cpSync(found, this.userDataPath, { recursive: true });
        } else {
          fs.mkdirSync(this.userDataPath, { recursive: true });
        }
      } catch (err) {
        console.error('Failed to create user data dir:', err);
      }
    }

    this.notesFile = path.join(this.userDataPath, 'notes.json');
    this.configFile = path.join(this.userDataPath, 'config.json');

    let defaultScreenshots = '';
    try {
      const picDir = app.getPath('pictures') || app.getPath('documents') || app.getPath('home');
      defaultScreenshots = path.join(picDir, 'Qikjot Screenshots');
    } catch {
      defaultScreenshots = path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Pictures', 'Qikjot Screenshots');
    }

    this.defaultConfig = {
      bounds: {
        x: undefined,
        y: undefined,
        width: 340,
        height: 380,
      },
      isAlwaysOnTop: true,
      opacity: 0.95,
      theme: 'yellow', // 'yellow' | 'mint' | 'pink' | 'blue' | 'glass-dark'
      startOnBoot: false,
      closeToTray: true,
      fontSize: 14,
      fontFamily: 'Inter',
      screenshotFolder: defaultScreenshots,
      autoSaveScreenshots: true,
      autoCopyScreenshots: true,
    };

    this.defaultNotes = {
      content: '',
      updatedAt: new Date().toISOString(),
    };
  }


  /**
   * Atomic file writing: writes to a temporary file first,
   * flushes to disk, and then renames. This guarantees zero file corruption
   * in case of abrupt shutdown or power failure.
   */
  atomicWrite(filePath, data) {
    const tmpPath = `${filePath}.tmp`;
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const fd = fs.openSync(tmpPath, 'w');
      fs.writeFileSync(fd, jsonStr, 'utf-8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fs.renameSync(tmpPath, filePath);
      return true;
    } catch (err) {
      console.error(`Error in atomicWrite for ${filePath}:`, err);
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch { }
      return false;
    }
  }

  readNotes() {
    try {
      if (fs.existsSync(this.notesFile)) {
        const raw = fs.readFileSync(this.notesFile, 'utf-8');
        const parsed = JSON.parse(raw);

        // Multi-note payload
        if (parsed && Array.isArray(parsed.notes) && parsed.notes.length > 0) {
          const activeId = parsed.activeNoteId || parsed.notes[0].id;
          return {
            activeNoteId: activeId,
            notes: parsed.notes,
          };
        }

        // Migrate legacy single note payload
        if (parsed && typeof parsed.content === 'string') {
          const firstLine = parsed.content.split('\n')[0].trim().slice(0, 30) || 'Untitled Note';
          const singleNote = {
            id: 'note_1',
            title: firstLine,
            content: parsed.content,
            createdAt: parsed.updatedAt || new Date().toISOString(),
            updatedAt: parsed.updatedAt || new Date().toISOString(),
          };
          const migrated = {
            activeNoteId: 'note_1',
            notes: [singleNote],
          };
          this.atomicWrite(this.notesFile, migrated);
          return migrated;
        }
      }
    } catch (err) {
      console.error('Error reading notes.json:', err);
    }

    // Default: 1 fresh note
    const defaultItem = {
      id: 'note_' + Date.now(),
      title: 'New Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return {
      activeNoteId: defaultItem.id,
      notes: [defaultItem],
    };
  }

  saveNotes(payload) {
    if (typeof payload === 'string') {
      const current = this.readNotes();
      const activeIdx = current.notes.findIndex((n) => n.id === current.activeNoteId);
      const now = new Date().toISOString();
      const firstLine = payload.split('\n')[0].trim().slice(0, 30) || 'Untitled Note';

      if (activeIdx >= 0) {
        current.notes[activeIdx].content = payload;
        current.notes[activeIdx].title = firstLine;
        current.notes[activeIdx].updatedAt = now;
      } else {
        const newNote = {
          id: 'note_' + Date.now(),
          title: firstLine,
          content: payload,
          createdAt: now,
          updatedAt: now,
        };
        current.notes.unshift(newNote);
        current.activeNoteId = newNote.id;
      }
      this.atomicWrite(this.notesFile, current);
      return current;
    } else if (payload && Array.isArray(payload.notes)) {
      this.atomicWrite(this.notesFile, payload);
      return payload;
    }
  }

  readConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const raw = fs.readFileSync(this.configFile, 'utf-8');
        const parsed = JSON.parse(raw);
        const config = {
          ...this.defaultConfig,
          ...parsed,
          bounds: { ...this.defaultConfig.bounds, ...(parsed.bounds || {}) },
        };
        if (config.screenshotFolder) {
          try {
            if (!fs.existsSync(config.screenshotFolder)) {
              fs.mkdirSync(config.screenshotFolder, { recursive: true });
            }
          } catch { }
        }
        return config;
      }
    } catch (err) {
      console.error('Error reading config.json:', err);
    }
    if (this.defaultConfig.screenshotFolder) {
      try {
        if (!fs.existsSync(this.defaultConfig.screenshotFolder)) {
          fs.mkdirSync(this.defaultConfig.screenshotFolder, { recursive: true });
        }
      } catch { }
    }
    return this.defaultConfig;
  }


  saveConfig(partialConfig) {
    const current = this.readConfig();
    const updated = {
      ...current,
      ...partialConfig,
      bounds: partialConfig.bounds
        ? { ...current.bounds, ...partialConfig.bounds }
        : current.bounds,
    };
    this.atomicWrite(this.configFile, updated);
    return updated;
  }

  /**
   * Clamp window coordinates to current active displays.
   * Mitigates edge case when external monitors are disconnected.
   */
  clampToViewport(bounds) {
    if (!bounds || typeof bounds.x !== 'number' || typeof bounds.y !== 'number') {
      return null;
    }

    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay().workArea;

    // Check if the window top-left or a significant portion is within any display
    const isVisibleOnAnyDisplay = displays.some((d) => {
      const area = d.workArea;
      return (
        bounds.x >= area.x - 50 &&
        bounds.x < area.x + area.width - 50 &&
        bounds.y >= area.y - 20 &&
        bounds.y < area.y + area.height - 50
      );
    });

    if (isVisibleOnAnyDisplay) {
      return bounds;
    }

    // Default: place on the top-right of the primary display work area
    const safeWidth = Math.min(bounds.width || 340, primary.width);
    const safeHeight = Math.min(bounds.height || 380, primary.height);
    const safeX = primary.x + primary.width - safeWidth - 40;
    const safeY = primary.y + 40;

    return {
      x: safeX,
      y: safeY,
      width: safeWidth,
      height: safeHeight,
    };
  }
}

module.exports = new DataStore();
