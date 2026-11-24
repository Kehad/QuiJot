import React from 'react';
import { X, Download, Trash2 } from 'lucide-react';
import { AppConfig } from '../types/electron';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onUpdateConfig: (partial: Partial<AppConfig>) => void;
  onExportNote: (format: 'txt' | 'md') => void;
  onClearNote: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onExportNote,
  onClearNote,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <span>⚙️ Settings & Options</span>
          </div>
          <button
            type="button"
            className={styles.btnIcon}
            onClick={onClose}
            title="Close Settings"
            style={{ width: '22px', height: '22px' }}
          >
            <X size={13} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Launch on Startup Toggle */}
          <div className={styles.modalRow}>
            <div className={styles.modalLabel}>
              <span style={{ fontWeight: 500 }}>Launch on Windows Startup</span>
              <span className={styles.modalSubtext}>Start Qukjot automatically when logging into Windows</span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={Boolean(config.startOnBoot)}
                onChange={(e) => onUpdateConfig({ startOnBoot: e.target.checked })}
              />
              <span className={styles.sliderSwitch} />
            </label>
          </div>

          {/* Close to Tray Toggle */}
          <div className={styles.modalRow}>
            <div className={styles.modalLabel}>
              <span style={{ fontWeight: 500 }}>Minimize to Tray on Close</span>
              <span className={styles.modalSubtext}>Clicking (✕) hides note to taskbar tray</span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={Boolean(config.closeToTray)}
                onChange={(e) => onUpdateConfig({ closeToTray: e.target.checked })}
              />
              <span className={styles.sliderSwitch} />
            </label>
          </div>

          {/* Font Size Selector */}
          <div className={styles.modalRow}>
            <div className={styles.modalLabel}>
              <span style={{ fontWeight: 500 }}>Font Size</span>
              <span className={styles.modalSubtext}>Adjust text size in scratchpad</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[12, 14, 16, 18].map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`${styles.presetBtn} ${config.fontSize === size ? styles.isActive : ''}`}
                  style={{ padding: '2px 8px' }}
                  onClick={() => onUpdateConfig({ fontSize: size })}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Screenshot Storage Folder Setting */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--app-border)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={styles.popoverTitle}>📸 Screenshot Storage Folder</span>
            </div>
            <span className={styles.modalSubtext} style={{ fontSize: '10px', marginTop: '-2px' }}>
              Where snips and captures are automatically saved
            </span>
            <div
              className={styles.screenshotPathDisplay}
              title={config.screenshotFolder || 'Pictures/Qukjot Screenshots'}
            >
              <span className={styles.pathText}>
                {config.screenshotFolder || 'Qukjot Screenshots'}
              </span>
            </div>
            <div className={styles.modalActions} style={{ marginTop: '2px' }}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={async () => {
                  if (window.electronAPI) {
                    const newPath = await window.electronAPI.selectScreenshotFolder();
                    if (newPath) {
                      onUpdateConfig({ screenshotFolder: newPath });
                    }
                  }
                }}
                title="Choose a different folder for screenshots"
              >
                <span>📁 Change Folder...</span>
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  if (window.electronAPI) {
                    window.electronAPI.openScreenshotFolder();
                  }
                }}
                title="Open screenshot folder in Windows File Explorer"
              >
                <span>📂 Open in Explorer</span>
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--app-border)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={styles.popoverTitle}>⌨️ Keyboard Shortcuts</span>
            </div>
            <span className={styles.modalSubtext} style={{ fontSize: '10px', marginTop: '-2px' }}>
              Quick controls from anywhere on your system or in-app
            </span>

            <div className={styles.settingsShortcutsCard}>
              <div className={styles.shortcutItemRow}>
                <span className={styles.shortcutLabel}>Open / Toggle Qukjot (Global)</span>
                <div className={styles.shortcutKeysBadge}>
                  <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd>
                </div>
              </div>
              <div className={styles.shortcutItemRow}>
                <span className={styles.shortcutLabel}>Quick Open (Alternative)</span>
                <div className={styles.shortcutKeysBadge}>
                  <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>N</kbd>
                </div>
              </div>
              <div className={styles.shortcutItemRow}>
                <span className={styles.shortcutLabel}>Fast Summon</span>
                <div className={styles.shortcutKeysBadge}>
                  <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Space</kbd>
                </div>
              </div>
              <div className={styles.shortcutItemRow}>
                <span className={styles.shortcutLabel}>FastSnap (Global)</span>
                <div className={styles.shortcutKeysBadge}>
                  <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>
                </div>
              </div>
              <div className={styles.shortcutItemRow}>
                <span className={styles.shortcutLabel}>Notes List (In-App)</span>
                <div className={styles.shortcutKeysBadge}>
                  <kbd>Ctrl</kbd> + <kbd>L</kbd>
                </div>
              </div>
              <div className={styles.shortcutItemRow}>
                <span className={styles.shortcutLabel}>New Note (In-App)</span>
                <div className={styles.shortcutKeysBadge}>
                  <kbd>Ctrl</kbd> + <kbd>N</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Export Note */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--app-border)', paddingTop: '8px' }}>
            <span className={styles.popoverTitle}>Export & Backup</span>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => onExportNote('txt')}
                title="Save as plain text (.txt)"
              >
                <Download size={12} />
                <span>Export .TXT</span>
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => onExportNote('md')}
                title="Save as markdown (.md)"
              >
                <Download size={12} />
                <span>Export .MD</span>
              </button>
            </div>
          </div>

          {/* Clear Note */}
          <div style={{ marginTop: '4px', borderTop: '1px solid var(--app-border)', paddingTop: '8px' }}>
            <button
              type="button"
              className={`${styles.btnSecondary} ${styles.btnDanger}`}
              style={{ width: '100%' }}
              onClick={() => {
                if (window.confirm('Are you sure you want to clear this sticky note?')) {
                  onClearNote();
                  onClose();
                }
              }}
            >
              <Trash2 size={12} />
              <span>Clear Current Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
