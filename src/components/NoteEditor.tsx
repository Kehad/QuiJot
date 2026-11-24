import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bold, Italic, Underline, List } from 'lucide-react';
import { formatInitialContent, isHtmlEmpty } from '../utils/textUtils';
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
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>('');
  const [isEmpty, setIsEmpty] = useState<boolean>(true);

  // Formatting active states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isBullet, setIsBullet] = useState(false);

  const updateActiveStates = useCallback(() => {
    if (typeof document === 'undefined') return;
    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      setIsBullet(document.queryCommandState('insertUnorderedList'));
    } catch {
      // Ignore if document queryCommandState fails
    }
  }, []);

  // Initialize and focus on launch
  useEffect(() => {
    if (editorRef.current) {
      const formatted = formatInitialContent(content);
      editorRef.current.innerHTML = formatted;
      lastHtmlRef.current = formatted;
      setIsEmpty(isHtmlEmpty(formatted));
      editorRef.current.focus();
    }
  }, []);

  // Update editor innerHTML when content prop changes from outside
  useEffect(() => {
    if (editorRef.current) {
      const formatted = formatInitialContent(content);
      if (editorRef.current.innerHTML !== formatted && formatted !== lastHtmlRef.current) {
        editorRef.current.innerHTML = formatted;
        lastHtmlRef.current = formatted;
        setIsEmpty(isHtmlEmpty(formatted));
      }
    }
  }, [content]);

  // Keep formatting button states in sync with caret position
  useEffect(() => {
    const handleSelectionChange = () => {
      if (
        editorRef.current &&
        (document.activeElement === editorRef.current || editorRef.current.contains(document.activeElement))
      ) {
        updateActiveStates();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateActiveStates]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastHtmlRef.current = html;
    setIsEmpty(isHtmlEmpty(html));
    onChange(html);
    updateActiveStates();
  };

  const handleCommand = (command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
    if (!editorRef.current) return;
    if (document.activeElement !== editorRef.current && !editorRef.current.contains(document.activeElement)) {
      editorRef.current.focus();
    }
    document.execCommand(command, false);
    const newHtml = editorRef.current.innerHTML;
    lastHtmlRef.current = newHtml;
    setIsEmpty(isHtmlEmpty(newHtml));
    onChange(newHtml);
    updateActiveStates();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Tab key: insert two spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
      handleInput();
      return;
    }

    // Ctrl+B: Bold
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handleCommand('bold');
      return;
    }

    // Ctrl+I: Italic
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handleCommand('italic');
      return;
    }

    // Ctrl+U: Underline
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      handleCommand('underline');
      return;
    }

    // Ctrl+Shift+8 or Ctrl+Shift+L: Bullet list
    if (
      (e.ctrlKey || e.metaKey) &&
      e.shiftKey &&
      !e.altKey &&
      (e.key === '8' || e.key.toLowerCase() === 'l' || e.key === '*')
    ) {
      e.preventDefault();
      handleCommand('insertUnorderedList');
      return;
    }

    // Auto-bullet on typing "- " or "* "
    if (e.key === ' ') {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.anchorNode) {
        const text = sel.anchorNode.textContent || '';
        const offset = sel.anchorOffset;
        if (offset === 1 && (text === '-' || text === '*')) {
          e.preventDefault();
          sel.anchorNode.textContent = '';
          document.execCommand('insertUnorderedList', false);
          handleInput();
          return;
        }
      }
    }
  };

  return (
    <main className={styles.appBody}>
      {/* Formatting Toolbar */}
      <div className={styles.formattingToolbar}>
        <button
          type="button"
          className={`${styles.formatBtn} ${isBold ? styles.isActive : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('bold');
          }}
          title="Bold (Ctrl+B)"
        >
          <Bold size={13} strokeWidth={2.6} />
        </button>

        <button
          type="button"
          className={`${styles.formatBtn} ${isItalic ? styles.isActive : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('italic');
          }}
          title="Italic (Ctrl+I)"
        >
          <Italic size={13} strokeWidth={2.4} />
        </button>

        <button
          type="button"
          className={`${styles.formatBtn} ${isUnderline ? styles.isActive : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('underline');
          }}
          title="Underline (Ctrl+U)"
        >
          <Underline size={13} strokeWidth={2.4} />
        </button>

        <span className={styles.toolbarDivider} />

        <button
          type="button"
          className={`${styles.formatBtn} ${isBullet ? styles.isActive : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand('insertUnorderedList');
          }}
          title="Bullet List (Ctrl+Shift+8 or Ctrl+Shift+L, or type '- ')"
        >
          <List size={14} strokeWidth={2.4} />
        </button>
      </div>

      {/* ContentEditable Note Body */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={updateActiveStates}
        onMouseUp={updateActiveStates}
        data-empty={isEmpty}
        data-placeholder="Type your quick notes, tokens, or reminders here..."
        className={`${styles.noteEditorArea} ${isMonospace ? styles.fontMonoActive : ''}`}
        style={{ fontSize: `${fontSize}px` }}
        spellCheck="false"
      />
    </main>
  );
};
