import React from 'react';
import { FolderOpen } from 'lucide-react';
import styles from './ScreenshotFolderFooter.module.css';

interface ScreenshotFolderFooterProps {
  folderPath?: string;
  onChangeFolder: () => void;
  onOpenFolder: () => void;
}

export const ScreenshotFolderFooter: React.FC<ScreenshotFolderFooterProps> = ({
  folderPath,
  onChangeFolder,
  onOpenFolder,
}) => {
  return (
    <div className={styles.snipFolderFooter}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
        <FolderOpen size={12} color="var(--app-accent)" style={{ flexShrink: 0 }} />
        <span className={styles.folderPathLabel} title={folderPath}>
          {folderPath || 'Pictures/FastNote Screenshots'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <button
          type="button"
          className={styles.tagBtn}
          onClick={onChangeFolder}
          title="Change destination folder"
        >
          Change
        </button>
        <button
          type="button"
          className={styles.tagBtn}
          onClick={onOpenFolder}
          title="Open folder in Windows Explorer"
        >
          Open
        </button>
      </div>
    </div>
  );
};
