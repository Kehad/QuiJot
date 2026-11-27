import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { NoteEditor } from './components/NoteEditor';
import { Footer } from './components/Footer';
import { SettingsModal } from './components/SettingsModal';
import { ScreenshotModal } from './components/ScreenshotModal';
import { NotesListModal } from './components/NotesListModal';
import { AppConfig, ThemeName, NoteItem, NotesPayload } from './types/electron';
import { htmlToPlainText, htmlToMarkdown } from './utils/textUtils';
import styles from './App.module.css';

const DEFAULT_CONFIG: AppConfig = {
  isAlwaysOnTop: true,
  opacity: 0.95,
  theme: 'yellow',
  startOnBoot: false,
  closeToTray: true,
  fontSize: 14,
  fontFamily: 'Inter',
};

const DEFAULT_NOTE = '';

export const App: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isMonospace, setIsMonospace] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState<boolean>(false);
  const [isNotesListOpen, setIsNotesListOpen] = useState<boolean>(false);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<string>(content);
  latestContentRef.current = content;

  const activeNoteIdRef = useRef<string>(activeNoteId);
  activeNoteIdRef.current = activeNoteId;

  const notesRef = useRef<NoteItem[]>(notes);
  notesRef.current = notes;

  const [screenshotTriggerMode, setScreenshotTriggerMode] = useState<'rect' | 'window' | 'screen' | null>(null);

  // Apply theme class to <body> whenever it changes
  useEffect(() => {
    document.body.className = `theme-${config.theme}`;
  }, [config.theme]);

  // Load initial notes and config
  useEffect(() => {
    const init = async () => {
      if (window.electronAPI) {
        try {
          const data = await window.electronAPI.getInitialData();
          if (data?.notesPayload && data.notesPayload.notes && data.notesPayload.notes.length > 0) {
            setNotes(data.notesPayload.notes);
            notesRef.current = data.notesPayload.notes;
            const targetId = data.notesPayload.activeNoteId || data.notesPayload.notes[0].id;
            setActiveNoteId(targetId);
            activeNoteIdRef.current = targetId;

            const activeNote = data.notesPayload.notes.find((n) => n.id === targetId) || data.notesPayload.notes[0];
            const loadedText = activeNote ? activeNote.content : '';
            setContent(loadedText);
            latestContentRef.current = loadedText;
          } else if (data?.note?.content !== undefined) {
            const defaultId = data.note.id || ('note_' + Date.now());
            const firstLine = data.note.title || htmlToPlainText(data.note.content).split('\n')[0].trim().slice(0, 30) || 'Untitled Note';
            const initialItem: NoteItem = {
              id: defaultId,
              title: firstLine,
              content: data.note.content,
              createdAt: data.note.updatedAt || new Date().toISOString(),
              updatedAt: data.note.updatedAt || new Date().toISOString(),
            };
            setNotes([initialItem]);
            notesRef.current = [initialItem];
            setActiveNoteId(defaultId);
            activeNoteIdRef.current = defaultId;
            setContent(data.note.content);
            latestContentRef.current = data.note.content;
          } else {
            const defaultId = 'note_' + Date.now();
            const initialItem: NoteItem = {
              id: defaultId,
              title: 'Untitled Note',
              content: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setNotes([initialItem]);
            notesRef.current = [initialItem];
            setActiveNoteId(defaultId);
            activeNoteIdRef.current = defaultId;
            setContent('');
            latestContentRef.current = '';
          }

          if (data?.config) {
            setConfig(data.config);
          }
        } catch (err) {
          console.error('Failed to load initial data from Electron:', err);
        }
      } else {
        // Fallback for browser preview / testing
        const savedPayload = localStorage.getItem('qikjot_notes_payload');
        const savedNote = localStorage.getItem('qikjot_content');
        const savedConfig = localStorage.getItem('qikjot_config');

        if (savedPayload) {
          try {
            const parsed = JSON.parse(savedPayload) as NotesPayload;
            if (parsed.notes && parsed.notes.length > 0) {
              setNotes(parsed.notes);
              notesRef.current = parsed.notes;
              const targetId = parsed.activeNoteId || parsed.notes[0].id;
              setActiveNoteId(targetId);
              activeNoteIdRef.current = targetId;
              const curNote = parsed.notes.find((n) => n.id === targetId) || parsed.notes[0];
              setContent(curNote ? curNote.content : '');
              latestContentRef.current = curNote ? curNote.content : '';
            }
          } catch { }
        } else {
          const defaultId = 'note_' + Date.now();
          const initialItem: NoteItem = {
            id: defaultId,
            title: savedNote ? htmlToPlainText(savedNote).split('\n')[0].trim().slice(0, 30) || 'Untitled Note' : 'Untitled Note',
            content: savedNote || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setNotes([initialItem]);
          notesRef.current = [initialItem];
          setActiveNoteId(defaultId);
          activeNoteIdRef.current = defaultId;
          setContent(initialItem.content);
          latestContentRef.current = initialItem.content;
        }

        if (savedConfig) {
          try {
            setConfig(JSON.parse(savedConfig));
          } catch { }
        }
      }
      setIsLoaded(true);
    };

    init();

    // Listen to tray actions, screenshot events, and external triggers
    if (window.electronAPI) {
      const unsubNote = window.electronAPI.onNoteExternalUpdate((newContent) => {
        setContent(newContent);
        latestContentRef.current = newContent;
      });
      const unsubConfig = window.electronAPI.onConfigExternalUpdate((newConfig) => {
        setConfig((prev) => ({ ...prev, ...newConfig }));
      });
      const unsubScreenshot = window.electronAPI.onTriggerScreenshot((mode) => {
        setScreenshotTriggerMode((mode as 'rect' | 'window' | 'screen') || null);
        setIsScreenshotOpen(true);
      });
      const unsubNewNote = window.electronAPI.onTriggerNewNote?.(() => {
        handleNewNote();
      });
      const unsubNotesList = window.electronAPI.onTriggerNotesList?.(() => {
        setIsNotesListOpen((prev) => !prev);
      });

      return () => {
        unsubNote();
        unsubConfig();
        unsubScreenshot();
        if (unsubNewNote) unsubNewNote();
        if (unsubNotesList) unsubNotesList();
      };
    }
  }, []);

  // Debounced atomic save handler (1000ms idle)
  const triggerAutoSave = useCallback((newContent: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setIsSaving(true);
    const activeId = activeNoteIdRef.current;
    const firstLine = htmlToPlainText(newContent).split('\n')[0].trim().slice(0, 30) || 'Untitled Note';

    // Update in-memory list preview instantly
    setNotes((prevNotes) => {
      const updated = prevNotes.map((n) =>
        n.id === activeId
          ? { ...n, content: newContent, title: firstLine, updatedAt: new Date().toISOString() }
          : n
      );
      notesRef.current = updated;
      return updated;
    });

    saveTimerRef.current = setTimeout(async () => {
      if (window.electronAPI) {
        await window.electronAPI.saveNote(newContent, activeId);
      } else {
        localStorage.setItem('qikjot_content', newContent);
        const payload: NotesPayload = { activeNoteId: activeId, notes: notesRef.current };
        localStorage.setItem('qikjot_notes_payload', JSON.stringify(payload));
      }
      setIsSaving(false);
    }, 1000);
  }, []);

  // Handle Note Content Changes
  const handleContentChange = (newText: string) => {
    setContent(newText);
    latestContentRef.current = newText;
    if (isLoaded) {
      triggerAutoSave(newText);
    }
  };

  // Immediate save on window blur / unmount
  useEffect(() => {
    const handleBlur = () => {
      if (window.electronAPI && latestContentRef.current) {
        window.electronAPI.saveNote(latestContentRef.current, activeNoteIdRef.current);
        setIsSaving(false);
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  // Switch to a selected note
  const handleSelectNote = (id: string) => {
    if (id === activeNoteIdRef.current) return;

    // Flush current note content first
    const curContent = latestContentRef.current;
    const curId = activeNoteIdRef.current;
    const currentNotes = [...notesRef.current];
    const curIdx = currentNotes.findIndex((n) => n.id === curId);
    if (curIdx >= 0) {
      currentNotes[curIdx].content = curContent;
      currentNotes[curIdx].title = htmlToPlainText(curContent).split('\n')[0].trim().slice(0, 30) || 'Untitled Note';
      currentNotes[curIdx].updatedAt = new Date().toISOString();
    }
    const targetNote = currentNotes.find((n) => n.id === id);
    const newContent = targetNote ? targetNote.content : '';

    setActiveNoteId(id);
    activeNoteIdRef.current = id;
    setContent(newContent);
    latestContentRef.current = newContent;
    setNotes(currentNotes);
    notesRef.current = currentNotes;

    const payload: NotesPayload = { activeNoteId: id, notes: currentNotes };
    if (window.electronAPI) {
      window.electronAPI.saveNotesList(payload);
    } else {
      localStorage.setItem('qikjot_notes_payload', JSON.stringify(payload));
    }
  };

  // Create a brand new note
  const handleNewNote = () => {
    // Flush current note
    const curContent = latestContentRef.current;
    const curId = activeNoteIdRef.current;
    const currentNotes = [...notesRef.current];
    const curIdx = currentNotes.findIndex((n) => n.id === curId);
    if (curIdx >= 0) {
      currentNotes[curIdx].content = curContent;
      currentNotes[curIdx].title = htmlToPlainText(curContent).split('\n')[0].trim().slice(0, 30) || 'Untitled Note';
      currentNotes[curIdx].updatedAt = new Date().toISOString();
    }

    const newId = 'note_' + Date.now();
    const newNote: NoteItem = {
      id: newId,
      title: 'Untitled Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedNotes = [newNote, ...currentNotes];
    setNotes(updatedNotes);
    notesRef.current = updatedNotes;
    setActiveNoteId(newId);
    activeNoteIdRef.current = newId;
    setContent('');
    latestContentRef.current = '';

    const payload: NotesPayload = { activeNoteId: newId, notes: updatedNotes };
    if (window.electronAPI) {
      window.electronAPI.saveNotesList(payload);
    } else {
      localStorage.setItem('qikjot_notes_payload', JSON.stringify(payload));
    }
  };

  // Delete a note
  const handleDeleteNote = (id: string) => {
    let updatedNotes = notesRef.current.filter((n) => n.id !== id);
    let newActiveId = activeNoteIdRef.current;
    let newContent = latestContentRef.current;

    if (updatedNotes.length === 0) {
      const fallbackId = 'note_' + Date.now();
      const blankNote: NoteItem = {
        id: fallbackId,
        title: 'Untitled Note',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedNotes = [blankNote];
      newActiveId = fallbackId;
      newContent = '';
    } else if (id === activeNoteIdRef.current) {
      newActiveId = updatedNotes[0].id;
      newContent = updatedNotes[0].content;
    }

    setNotes(updatedNotes);
    notesRef.current = updatedNotes;
    setActiveNoteId(newActiveId);
    activeNoteIdRef.current = newActiveId;
    setContent(newContent);
    latestContentRef.current = newContent;

    const payload: NotesPayload = { activeNoteId: newActiveId, notes: updatedNotes };
    if (window.electronAPI) {
      window.electronAPI.saveNotesList(payload);
    } else {
      localStorage.setItem('qikjot_notes_payload', JSON.stringify(payload));
    }
  };

  // Global keyboard shortcuts inside Qikjot:
  // - Ctrl+N: New Note
  // - Ctrl+L: Toggle Notes List
  // - Ctrl+Shift+S / Alt+S: FastSnap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N: New note
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewNote();
        return;
      }

      // Ctrl+L: Toggle Notes List
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsNotesListOpen((prev) => !prev);
        return;
      }

      // Ctrl+Shift+S or Alt+S: FastSnap
      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') ||
        (e.altKey && e.key.toLowerCase() === 's')
      ) {
        e.preventDefault();
        setIsScreenshotOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update Config
  const handleUpdateConfig = async (partial: Partial<AppConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);

    if (window.electronAPI) {
      await window.electronAPI.saveConfig(partial);
      if (partial.startOnBoot !== undefined) {
        await window.electronAPI.setStartup(partial.startOnBoot);
      }
    } else {
      localStorage.setItem('qikjot_config', JSON.stringify(updated));
    }
  };

  // Toggle Always on Top
  const handleTogglePin = async () => {
    const nextPin = !config.isAlwaysOnTop;
    setConfig((prev) => ({ ...prev, isAlwaysOnTop: nextPin }));
    if (window.electronAPI) {
      await window.electronAPI.setAlwaysOnTop(nextPin);
    }
  };

  // Set Opacity
  const handleSetOpacity = async (opacity: number) => {
    const clamped = Math.max(0.4, Math.min(1.0, opacity));
    setConfig((prev) => ({ ...prev, opacity: clamped }));
    if (window.electronAPI) {
      await window.electronAPI.setOpacity(clamped);
    }
  };

  // Theme change
  const handleSelectTheme = (theme: ThemeName) => {
    handleUpdateConfig({ theme });
  };

  // Window Minimize & Close
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    }
  };

  // Export
  const handleExportNote = async (format: 'txt' | 'md') => {
    const filename = `Qikjot-${new Date().toISOString().slice(0, 10)}.${format}`;
    const exportContent = format === 'txt' ? htmlToPlainText(content) : htmlToMarkdown(content);
    if (window.electronAPI) {
      await window.electronAPI.exportFile(exportContent, filename);
    } else {
      const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Clear Note
  const handleClearNote = () => {
    handleContentChange('');
  };

  // Insert text from screenshot action
  const handleInsertNoteText = (inserted: string) => {
    const newBlock = `<div>${inserted}</div>`;
    handleContentChange(content ? `${content}${newBlock}` : newBlock);
  };

  return (
    <div className={styles.appWindow}>
      <div className={styles.windowCard}>
        <Header
          config={config}
          onTogglePin={handleTogglePin}
          onSetOpacity={handleSetOpacity}
          onToggleSettings={() => setIsSettingsOpen(true)}
          onOpenScreenshot={() => {
            setScreenshotTriggerMode(null);
            setIsScreenshotOpen(true);
          }}
          onOpenNotesList={() => setIsNotesListOpen(true)}
          onNewNote={handleNewNote}
          notesCount={notes.length}
          isMonospace={isMonospace}
          onToggleMonospace={() => setIsMonospace(!isMonospace)}
          onMinimize={handleMinimize}
          onClose={handleClose}
        />

        <NoteEditor
          key={activeNoteId}
          content={content}
          onChange={handleContentChange}
          isMonospace={isMonospace}
          fontSize={config.fontSize || 14}
        />

        <Footer
          content={content}
          isSaving={isSaving}
          activeTheme={config.theme}
          onSelectTheme={handleSelectTheme}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onUpdateConfig={handleUpdateConfig}
          onExportNote={handleExportNote}
          onClearNote={handleClearNote}
        />

        <ScreenshotModal
          isOpen={isScreenshotOpen}
          onClose={() => {
            setIsScreenshotOpen(false);
            setScreenshotTriggerMode(null);
          }}
          config={config}
          onUpdateConfig={handleUpdateConfig}
          onInsertNoteText={handleInsertNoteText}
          initialMode={screenshotTriggerMode}
        />

        <NotesListModal
          isOpen={isNotesListOpen}
          onClose={() => setIsNotesListOpen(false)}
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={handleSelectNote}
          onNewNote={handleNewNote}
          onDeleteNote={handleDeleteNote}
        />
      </div>
    </div>
  );
};

export default App;
