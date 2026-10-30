import React, { useRef, useEffect } from 'react';
import styles from './NoteEditor.module.css';

interface NoteEditorProps {
  content: string;
  onChange: (value: string) => void;
  isMonospace: boolean;
  fontSize: number;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  content,
  onChange,
  isMonospace,
  fontSize,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on launch
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle Tab key to insert spaces instead of jumping focus
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newContent);

      // Restore cursor position after inserted spaces
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  return (
    <main className={styles.appBody}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your quick notes, tokens, or reminders here..."
        className={`${styles.noteTextarea} ${isMonospace ? styles.fontMonoActive : ''}`}
        style={{ fontSize: `${fontSize}px` }}
        spellCheck="false"
      />
    </main>
  );
};
