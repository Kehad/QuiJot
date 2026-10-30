import React, { useState, useRef, useEffect } from 'react';
import { Pin, Minus, X, SlidersHorizontal, Settings, Code, Type, Camera, FileText, Plus } from 'lucide-react';
import { AppConfig } from '../types/electron';
import appLogo from '../../assests/web/icon-512x512.png';
import styles from './Header.module.css';

interface HeaderProps {
  config: AppConfig;
  onTogglePin: () => void;
  onSetOpacity: (opacity: number) => void;
  onToggleSettings: () => void;
  onOpenScreenshot: () => void;
  onOpenNotesList: () => void;
  onNewNote: () => void;
  notesCount?: number;
  isMonospace: boolean;
  onToggleMonospace: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onTogglePin,
  onSetOpacity,
  onToggleSettings,
  onOpenScreenshot,
  onOpenNotesList,
  onNewNote,
  notesCount = 1,
  isMonospace,
  onToggleMonospace,
  onMinimize,
  onClose,
}) => {
  const [showOpacityMenu, setShowOpacityMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close opacity menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOpacityMenu(false);
      }
    };
    if (showOpacityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOpacityMenu]);

  const opacityPercent = Math.round((config.opacity || 0.95) * 100);

  return (
    <header className={styles.appHeader}>
      <div className={styles.headerLeft}>
        <span className={styles.appBrandIcon} style={{ overflow: 'hidden' }}>
          <img src={appLogo} alt="FastNote" width="18" height="18" style={{ display: 'block', objectFit: 'cover' }} />
        </span>
        <div className={styles.appTitle}>
          <span>FastNote</span>
          {config.isAlwaysOnTop && <span className={styles.pinnedBadge}>Pinned</span>}
        </div>
      </div>

      <div className={styles.headerActions}>
        {/* Opacity Selector Pill */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            type="button"
            className={styles.opacityPill}
            onClick={() => setShowOpacityMenu(!showOpacityMenu)}
            title="Adjust Window Opacity (40% - 100%)"
          >
            <SlidersHorizontal size={11} />
            <span>{opacityPercent}%</span>
          </button>

          {showOpacityMenu && (
            <div className={styles.popoverMenu}>
              <span className={styles.popoverTitle}>Window Opacity</span>
              <div className={styles.sliderContainer}>
                <input
                  type="range"
                  min="0.4"
                  max="1.0"
                  step="0.05"
                  value={config.opacity || 0.95}
                  onChange={(e) => onSetOpacity(parseFloat(e.target.value))}
                  className={styles.customRange}
                />
                <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '32px' }}>
                  {opacityPercent}%
                </span>
              </div>
              <div className={styles.presetButtons}>
                {[0.4, 0.6, 0.8, 1.0].map((preset) => {
                  const isActive = Math.abs((config.opacity || 0.95) - preset) < 0.04;
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`${styles.presetBtn} ${isActive ? styles.isActive : ''}`}
                      onClick={() => {
                        onSetOpacity(preset);
                      }}
                    >
                      {Math.round(preset * 100)}%
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notes List Button */}
        <button
          type="button"
          className={`${styles.btnIcon} ${styles.headerNotesBtn}`}
          onClick={onOpenNotesList}
          title={`Notes List (${notesCount} ${notesCount === 1 ? 'note' : 'notes'}) • Ctrl+L`}
        >
          <FileText size={13} />
          {notesCount > 1 && (
            <span className={styles.headerNotesBadge}>{notesCount}</span>
          )}
        </button>

        {/* Quick New Note Button */}
        <button
          type="button"
          className={`${styles.btnIcon} ${styles.headerNewBtn}`}
          onClick={onNewNote}
          title="Create New Note • Ctrl+N"
        >
          <Plus size={13} />
        </button>

        {/* Monospace Code Toggle */}
        <button
          type="button"
          className={`${styles.btnIcon} ${isMonospace ? styles.isActive : ''}`}
          onClick={onToggleMonospace}
          title={isMonospace ? 'Switch to Sans Font' : 'Switch to Monospace Code Font'}
        >
          {isMonospace ? <Code size={13} /> : <Type size={13} />}
        </button>

        {/* FastSnap Screenshot Studio Button */}
        <button
          type="button"
          className={styles.btnIcon}
          onClick={onOpenScreenshot}
          title="FastSnap: Rectangular snip, Active windows, or Full screen (Ctrl+Shift+S)"
        >
          <Camera size={13} />
        </button>

        {/* Always-on-top Pin Button */}
        <button
          type="button"
          className={`${styles.btnIcon} ${styles.btnPin} ${config.isAlwaysOnTop ? styles.isActive : ''}`}
          onClick={onTogglePin}
          title={config.isAlwaysOnTop ? 'Always-on-top: ON (Click to unpin)' : 'Always-on-top: OFF (Click to pin)'}
        >
          <Pin size={13} style={{ transform: config.isAlwaysOnTop ? 'rotate(45deg)' : 'none' }} />
        </button>

        {/* Settings Button */}
        <button
          type="button"
          className={styles.btnIcon}
          onClick={onToggleSettings}
          title="Settings & Export"
        >
          <Settings size={13} />
        </button>

        {/* Minimize Button */}
        <button
          type="button"
          className={styles.btnIcon}
          onClick={onMinimize}
          title="Minimize Window"
        >
          <Minus size={13} />
        </button>

        {/* Close Button (Minimizes to tray per PRD) */}
        <button
          type="button"
          className={`${styles.btnIcon} ${styles.btnClose}`}
          onClick={onClose}
          title="Hide Note (Reopen anytime with Alt+Shift+N or Ctrl+Alt+N)"
        >
          <X size={13} />
        </button>
      </div>
    </header>
  );
};
