import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ThemeName } from '../types/electron';
import { htmlToPlainText } from '../utils/textUtils';
import styles from './Footer.module.css';

interface FooterProps {
  content: string;
  isSaving: boolean;
  activeTheme: ThemeName;
  onSelectTheme: (theme: ThemeName) => void;
}

export const Footer: React.FC<FooterProps> = ({
  content,
  isSaving,
  activeTheme,
  onSelectTheme,
}) => {
  const [copied, setCopied] = useState(false);

  // Compute words and characters from plain text
  const plainText = htmlToPlainText(content);
  const charCount = plainText.length;
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.write && window.ClipboardItem) {
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const htmlBlob = new Blob([content], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch {
      await navigator.clipboard.writeText(plainText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const themes: { id: ThemeName; name: string; swatchClass: string }[] = [
    { id: 'white', name: 'Paper White', swatchClass: styles.swatchWhite },
    { id: 'yellow', name: 'Canary Yellow', swatchClass: styles.swatchYellow },
    { id: 'mint', name: 'Mint Green', swatchClass: styles.swatchMint },
    { id: 'pink', name: 'Soft Pink', swatchClass: styles.swatchPink },
    { id: 'blue', name: 'Ice Blue', swatchClass: styles.swatchBlue },
    { id: 'glass-dark', name: 'Obsidian Glass', swatchClass: styles.swatchDark },
  ];

  return (
    <footer className={styles.appFooter}>
      <div className={styles.footerLeft}>
        <div className={styles.statCounter}>
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          <span>•</span>
          <span>{charCount} {charCount === 1 ? 'char' : 'chars'}</span>
        </div>

        <div className={`${styles.saveIndicator} ${isSaving ? styles.saving : styles.saved}`}>
          <span className={styles.saveDot} />
          <span>{isSaving ? 'Saving...' : 'Saved'}</span>
        </div>
      </div>

      <div className={styles.footerRight}>
        {/* Quick Copy Button */}
        <button
          type="button"
          className={styles.btnIcon}
          onClick={handleCopy}
          title={copied ? 'Copied to clipboard!' : 'Copy all to clipboard'}
          style={{ width: '20px', height: '20px' }}
        >
          {copied ? <Check size={11} color="var(--app-accent)" /> : <Copy size={11} />}
        </button>

        {/* Theme Swatches */}
        <div className={styles.themePicker} title="Change Theme">
          {themes.map((th) => (
            <button
              key={th.id}
              type="button"
              className={`${styles.swatchBtn} ${th.swatchClass} ${activeTheme === th.id ? styles.isActive : ''}`}
              onClick={() => onSelectTheme(th.id)}
              title={th.name}
            />
          ))}
        </div>
      </div>
    </footer>
  );
};
