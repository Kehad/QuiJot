import React from 'react';
import { SquareDashedMousePointer, Monitor } from 'lucide-react';
import styles from './SingleSnipTab.module.css';

interface SingleSnipTabProps {
  mode: 'rect' | 'screen';
  isCapturing: boolean;
  onLaunchSnip: () => void;
}

export const SingleSnipTab: React.FC<SingleSnipTabProps> = ({
  mode,
  isCapturing,
  onLaunchSnip,
}) => {
  if (mode === 'rect') {
    return (
      <div className={styles.singleSnipModePanel}>
        <div className={styles.singleSnipHeroCard}>
          <div className={`${styles.snipHeroIconBox} ${styles.modeRect}`}>
            <SquareDashedMousePointer size={28} />
          </div>
          <div className={styles.snipHeroText}>
            <span className={styles.snipHeroTitle}>Rectangular Snip</span>
            <span className={styles.snipHeroDesc}>
              Drag a rectangular shape anywhere on your screen. Qikjot will automatically hide while you snip.
            </span>
            <div className={styles.snipHeroTags}>
              <span className={styles.snipTag}>📐 Custom Area</span>
              <span className={styles.snipTag}>Press <kbd>Esc</kbd> to cancel</span>
              <span className={styles.snipTag}>Global: <kbd>Ctrl+Shift+S</kbd></span>
            </div>
          </div>
          <button
            type="button"
            className={`${styles.btnPrimary} ${styles.snipHeroActionBtn}`}
            onClick={onLaunchSnip}
            disabled={isCapturing}
          >
            <SquareDashedMousePointer size={13} />
            <span>{isCapturing ? 'Starting Snip...' : 'Launch Rectangular Snip'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.singleSnipModePanel}>
      <div className={styles.singleSnipHeroCard}>
        <div className={`${styles.snipHeroIconBox} ${styles.modeScreen}`}>
          <Monitor size={28} />
        </div>
        <div className={styles.snipHeroText}>
          <span className={styles.snipHeroTitle}>Full Screen Snip</span>
          <span className={styles.snipHeroDesc}>
            Capture your entire primary desktop screen instantly. Qikjot will automatically hide while capturing.
          </span>
          <div className={styles.snipHeroTags}>
            <span className={styles.snipTag}>🖥️ Full Desktop</span>
            <span className={styles.snipTag}>Auto-saves to folder</span>
            <span className={styles.snipTag}>Copies to clipboard</span>
          </div>
        </div>
        <button
          type="button"
          className={`${styles.btnPrimary} ${styles.snipHeroActionBtn}`}
          onClick={onLaunchSnip}
          disabled={isCapturing}
        >
          <Monitor size={13} />
          <span>{isCapturing ? 'Capturing Screen...' : 'Capture Entire Screen'}</span>
        </button>
      </div>
    </div>
  );
};
