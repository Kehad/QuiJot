# Qikjot — Sticky Note Desktop App

**Qikjot** is an ultra-lightweight, distraction-free desktop sticky note utility designed to remain permanently pinned above all windows—including full-screen IDEs, browsers, presentation slides, and media players.

---

## ✨ Features Implemented

### 📌 Core Must-Haves
- **True Always-on-Top Engine**: Electron window configured at `'screen-saver'` topmost level (`setAlwaysOnTop(true, 'screen-saver', 1)`), preventing context-switching friction when interacting with full-screen applications or code editors.
- **Dynamic Pin Toggle**: Quick header pin button (`📌`) with active glowing indicator to pin/unpin anytime.
- **Atomic Auto-Save**: Debounced auto-save (1000ms idle interval) writes to `%APPDATA%/Qikjot/notes.json` via temporary file write (`.tmp`), OS flush (`fs.fsyncSync`), and atomic rename. Ensures zero data loss or JSON corruption even on power loss or abrupt shutdown.
- **Frameless Window Mechanics**: Frameless (`frame: false`, `transparent: true`), custom draggable header bar (`-webkit-app-region: drag`), min-dimensions clamped to 240×160px.
- **Crash & Restart Persistence**: Restores note content, window position, size, opacity, and theme immediately on launch.
- **System Tray Integration**: Native tray icon, minimizing/closing to tray, click-to-toggle visibility, and full right-click context menu (Show/Hide, New Note, Toggle Topmost, Opacity submenus, Quit).

### 🎨 Experience Polish
- **Rich Text Formatting**: Built-in toolbar with **Bold** (Ctrl+B), *Italics* (Ctrl+I), <u>Underline</u> (Ctrl+U), and **Bullet List** (Ctrl+Shift+8 or typing `- `).
- **Window Opacity Controller**: Quick presets (40%, 60%, 80%, 100%) and interactive discrete slider updating native window alpha via `win.setOpacity(...)` and CSS backdrop blur.
- **Multi-Monitor Geometry Persistence**: Saves window coordinates ($x, y$) and dimensions ($w, h$). Includes `clampToViewport` logic to safely relocate the sticky note back onto the active primary display if an external monitor is disconnected.
- **5 Desktop Themes**: Canary Yellow, Mint Green, Soft Pink, Ice Blue, and Dark Obsidian Glass.
- **Launch on Windows Startup**: Native OS startup hook toggled via the settings modal using `app.setLoginItemSettings`.
- **Live Counter & Typography**: Live word and character stats, Tab-indentation handling (inserts 2 spaces without losing focus), and instant Monospace Code font toggle for developers.
- **Export Options**: Export scratchpad as `.txt` or `.md` at any time.

---

## 🛠️ Tech Stack & Architecture

- **Runtime**: Electron
- **Bundler & Dev Server**: Vite + React 19 + TypeScript
- **Styling**: Vanilla CSS Design System with CSS variables and Glassmorphism (`backdrop-filter: blur(14px) saturate(180%)`)
- **Icons**: Lucide Icons
- **Storage**: Local JSON files in `%APPDATA%/Qikjot/` (`notes.json` and `config.json`)

---

## 🚀 Getting Started

### 1. Development Mode
Run Vite and Electron concurrently with live hot-reloading:
```bash
npm run dev
```

Or run Vite alone in browser mode:
```bash
npm run dev:vite
```
Then visit `http://localhost:5199/` in your browser.

### 2. Production Build
Compile TypeScript and bundle the frontend into `dist/`:
```bash
npm run build
```

### 3. Launch App
Launch the desktop application:
```bash
npm start
```

---

## ⌨️ Shortcuts & Interactions
- **Drag Window**: Click and hold anywhere along the top header bar.
- **Tab Key**: Inserts two spaces in the scratchpad (no loss of focus).
- **Click 📌**: Toggle Always-on-Top mode on/off.
- **Click Opacity Pill**: Select from 40%, 60%, 80%, 100% or adjust slider.
- **Bottom Right Swatches**: Instant theme color switching.
- **Click Tray Icon**: Toggles note visibility from the Windows system tray.
