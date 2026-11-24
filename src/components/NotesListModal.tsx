import React, { useState, useMemo } from 'react';
import { X, Plus, Search, Trash2, FileText, Clock } from 'lucide-react';
import { NoteItem } from '../types/electron';
import { htmlToPlainText } from '../utils/textUtils';
import styles from './NotesListModal.module.css';

interface NotesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: NoteItem[];
  activeNoteId: string;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string) => void;
}

export const NotesListModal: React.FC<NotesListModalProps> = ({
  isOpen,
  onClose,
  notes,
  activeNoteId,
  onSelectNote,
  onNewNote,
  onDeleteNote,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter((n) => {
      const plain = htmlToPlainText(n.content).toLowerCase();
      return n.title.toLowerCase().includes(q) || plain.includes(q);
    });
  }, [notes, searchQuery]);

  if (!isOpen) return null;

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.modalHeader} style={{ paddingBottom: '6px' }}>
          <div className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={styles.notesListIconBubble}>
              <FileText size={14} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600 }}>Notes List</span>
                <span className={styles.notesCountBadge}>
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </span>
              </div>
              <span className={styles.modalSubtext} style={{ fontSize: '10px' }}>
                Click any note to switch or create a new one
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.btnIcon}
            onClick={onClose}
            title="Close list (Esc or Ctrl+L)"
            style={{ width: '24px', height: '24px' }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Action & Search Bar */}
        <div className={styles.notesListActionsBar}>
          <div className={styles.notesSearchWrapper}>
            <Search size={11} className={styles.notesSearchIcon} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.notesSearchInput}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
              >
                <X size={9} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`${styles.btnPrimary} ${styles.newNoteBtn}`}
            onClick={() => {
              onNewNote();
              onClose();
            }}
            title="Create a new note (Ctrl+N)"
          >
            <Plus size={12} />
            <span>New Note</span>
          </button>
        </div>

        {/* Scrollable List of Notes */}
        <div className={styles.notesCardsContainer}>
          {filteredNotes.length === 0 ? (
            <div className={styles.notesEmptyState}>
              <FileText size={28} className={styles.notesEmptyIcon} />
              <span style={{ fontSize: '11.5px', fontWeight: 600 }}>
                {searchQuery ? 'No matching notes found' : 'No notes yet'}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--app-text-muted)' }}>
                {searchQuery ? 'Try a different search word' : 'Click "+ New Note" above to create one'}
              </span>
            </div>
          ) : (
            filteredNotes.map((item) => {
              const isActive = item.id === activeNoteId;
              const plainSnippet = htmlToPlainText(item.content).trim();
              const previewText = plainSnippet || 'Empty note...';
              const timeDisplay = formatTimestamp(item.updatedAt);

              return (
                <div
                  key={item.id}
                  className={`${styles.noteListCard} ${isActive ? styles.isActiveNote : ''}`}
                  onClick={() => {
                    onSelectNote(item.id);
                    onClose();
                  }}
                  title="Click to open this note"
                >
                  <div className={styles.noteCardTopRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      {isActive && <div className={styles.noteActiveDot} title="Currently active" />}
                      <span className={styles.noteCardTitle}>{item.title || 'Untitled Note'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {isActive && <span className={styles.activeTagChip}>Active</span>}
                      <button
                        type="button"
                        className={styles.noteCardDeleteBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            !item.content.trim() ||
                            window.confirm(`Are you sure you want to delete "${item.title || 'this note'}"?`)
                          ) {
                            onDeleteNote(item.id);
                          }
                        }}
                        title="Delete note"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  <p className={styles.noteCardSnippet}>{previewText}</p>

                  {timeDisplay && (
                    <div className={styles.noteCardFooter}>
                      <div className={styles.noteCardTime}>
                        <Clock size={9} color="var(--app-text-muted)" />
                        <span>{timeDisplay}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className={styles.notesModalFooter}>
          <span>Shortcuts: <kbd>Ctrl+N</kbd> New Note • <kbd>Ctrl+L</kbd> Notes List</span>
        </div>
      </div>
    </div>
  );
};
