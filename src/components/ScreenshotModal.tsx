import React, { useState, useEffect, useCallback } from 'react';
import { X, Camera, Sparkles, AppWindow, SquareDashedMousePointer, Monitor } from 'lucide-react';
import { CapturableSource, CaptureResult, AppConfig } from '../types/electron';
import { ScreenshotPreview } from './screenshot/ScreenshotPreview';
import { WindowSnipTab } from './screenshot/WindowSnipTab';
import { SingleSnipTab } from './screenshot/SingleSnipTab';
import { ScreenshotFolderFooter } from './screenshot/ScreenshotFolderFooter';
import styles from './ScreenshotModal.module.css';

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onUpdateConfig: (partial: Partial<AppConfig>) => void;
  onInsertNoteText: (text: string) => void;
  initialMode?: 'rect' | 'window' | 'screen' | null;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onInsertNoteText,
  initialMode,
}) => {
  const [activeTab, setActiveTab] = useState<'picker' | 'preview'>('picker');
  const [snipMode, setSnipMode] = useState<'window' | 'rect' | 'screen'>('window');
  const [sources, setSources] = useState<CapturableSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  // Fetch capturable open windows
  const fetchSources = useCallback(async () => {
    setIsLoadingSources(true);
    try {
      if (typeof window.electronAPI?.getCapturableSources === 'function') {
        const list = await window.electronAPI.getCapturableSources();
        setSources(list);
      } else {
        setSources([]);
      }
    } catch (err) {
      console.error('Failed to load windows:', err);
      showToast('Could not scan open windows. Please try again.');
    } finally {
      setIsLoadingSources(false);
    }
  }, [showToast]);

  // Mode 1: Rectangular Snip (Real Snipping Tool overlay)
  const handleRectangularSnip = async () => {
    setIsCapturing(true);
    try {
      if (typeof window.electronAPI?.startRectangularSnip === 'function') {
        const result = await window.electronAPI.startRectangularSnip();
        if (result) {
          setCaptureResult(result);
          setActiveTab('preview');
          setCopiedSuccess(true);
          showToast('📐 Rectangular Snip saved to folder & copied!');
        }
      } else {
        showToast('⚠️ Please restart FastNote to load the new FastSnap backend.');
      }
    } catch (err: unknown) {
      console.error('Rectangular snip error:', err);
      const msg = err instanceof Error ? err.message : 'Snip failed';
      showToast(msg);
    } finally {
      setIsCapturing(false);
    }
  };

  // Mode 2: Full Screen Snip
  const handleFullScreenSnip = async () => {
    setIsCapturing(true);
    try {
      if (typeof window.electronAPI?.captureFullScreen === 'function') {
        const result = await window.electronAPI.captureFullScreen();
        if (result) {
          setCaptureResult(result);
          setActiveTab('preview');
          setCopiedSuccess(true);
          showToast('🖥️ Full Screen captured, saved to folder & copied!');
        }
      } else {
        showToast('⚠️ Please restart FastNote to load the new FastSnap backend.');
      }
    } catch (err: unknown) {
      console.error('Full screen snip error:', err);
      const msg = err instanceof Error ? err.message : 'Full screen snip failed';
      showToast(msg);
    } finally {
      setIsCapturing(false);
    }
  };

  // Mode 3: Window Snip
  const handleWindowSnip = async (sourceId: string) => {
    setIsCapturing(true);
    try {
      if (typeof window.electronAPI?.captureWindow === 'function') {
        const result = await window.electronAPI.captureWindow(sourceId);
        if (result) {
          setCaptureResult(result);
          setActiveTab('preview');
          setCopiedSuccess(true);
          showToast(`🪟 ${result.name} captured, saved to folder & copied!`);
        }
      } else {
        showToast('⚠️ Please restart FastNote to load the new FastSnap backend.');
      }
    } catch (err: unknown) {
      console.error('Window snip error:', err);
      const msg = err instanceof Error ? err.message : 'Window snip failed';
      showToast(msg);
    } finally {
      setIsCapturing(false);
    }
  };

  // Reset and auto-fetch on modal open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('picker');
      setCaptureResult(null);
      setSearchQuery('');
      setCopiedSuccess(false);
      fetchSources();

      if (initialMode) {
        setSnipMode(initialMode);
        if (initialMode === 'rect') {
          setTimeout(() => handleRectangularSnip(), 120);
        } else if (initialMode === 'screen') {
          setTimeout(() => handleFullScreenSnip(), 120);
        }
      } else {
        setSnipMode('window');
      }
    }
  }, [isOpen, initialMode, fetchSources]);

  // Copy to clipboard
  const handleCopyClipboard = async () => {
    if (!captureResult) return;
    try {
      if (window.electronAPI) {
        await window.electronAPI.copyScreenshotToClipboard(captureResult.dataUrl);
      } else {
        const response = await fetch(captureResult.dataUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      }
      setCopiedSuccess(true);
      showToast('📋 Copied to clipboard! Ready to paste (Ctrl+V)');
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('Failed to copy to clipboard.');
    }
  };

  // Open the saved screenshot file in Windows Photo Viewer
  const handleOpenFile = async () => {
    if (!captureResult?.filePath) {
      showToast('File path not available.');
      return;
    }
    if (window.electronAPI) {
      await window.electronAPI.openScreenshotFile(captureResult.filePath);
    }
  };

  // Open the screenshot folder in File Explorer
  const handleOpenFolder = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openScreenshotFolder();
    }
  };

  // Change screenshot folder
  const handleChangeFolder = async () => {
    if (window.electronAPI) {
      const newFolder = await window.electronAPI.selectScreenshotFolder();
      if (newFolder) {
        onUpdateConfig({ screenshotFolder: newFolder });
        showToast('📁 Screenshot storage folder updated!');
      }
    }
  };

  // Insert reference into note
  const handleInsertNoteRef = () => {
    if (!captureResult) return;
    const time = captureResult.timestamp || new Date().toLocaleTimeString();
    const filePathInfo = captureResult.filePath ? `\nSaved: ${captureResult.filePath}` : '';
    const textToInsert = `[📸 Screenshot: ${captureResult.name} (${captureResult.width}×${captureResult.height}) at ${time}${filePathInfo}]`;
    onInsertNoteText(textToInsert);
    showToast('📝 Added screenshot link to note!');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader} style={{ paddingBottom: '6px' }}>
          <div className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={styles.snippingToolIcon}>
              <Camera size={14} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600 }}>FastSnap</span>
                <span className={styles.screenshotBadge}>Apart from note</span>
              </div>
              <span className="modal-subtext" style={{ fontSize: '10.5px' }}>
                {activeTab === 'preview'
                  ? 'Screenshot saved to folder & ready to paste'
                  : 'Choose Rectangular Snip, Window Snip, or Full Screen'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.btnIcon}
            onClick={onClose}
            title="Close FastSnap"
            style={{ width: '24px', height: '24px' }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className={styles.screenshotToast}>
            <Sparkles size={12} className={styles.toastSparkle} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* VIEW 1: PREVIEW VIEW */}
        {activeTab === 'preview' && captureResult ? (
          <ScreenshotPreview
            captureResult={captureResult}
            onRetake={() => setActiveTab('picker')}
            onCopyClipboard={handleCopyClipboard}
            copiedSuccess={copiedSuccess}
            onInsertNoteRef={handleInsertNoteRef}
            onCropComplete={(newResult) => setCaptureResult(newResult)}
            onToast={showToast}
            onOpenFile={handleOpenFile}
            onOpenFolder={handleOpenFolder}
          />
        ) : (
          /* VIEW 2: SNIPPING MODES & ACTIVE WINDOWS HUB */
          <div className={styles.snippingHubContent}>
            {/* 3 Snipping Mode Tabs */}
            <div className={styles.snipModeTabBar}>
              <button
                type="button"
                className={`${styles.snipModeTab} ${snipMode === 'window' ? styles.isActive : ''}`}
                onClick={() => setSnipMode('window')}
                title="Capture an active open window"
              >
                <AppWindow size={13} />
                <span>Window Snip</span>
              </button>
              <button
                type="button"
                className={`${styles.snipModeTab} ${snipMode === 'rect' ? styles.isActive : ''}`}
                onClick={() => setSnipMode('rect')}
                title="Drag a rectangle anywhere on screen"
              >
                <SquareDashedMousePointer size={13} />
                <span>Rectangular Snip</span>
              </button>
              <button
                type="button"
                className={`${styles.snipModeTab} ${snipMode === 'screen' ? styles.isActive : ''}`}
                onClick={() => setSnipMode('screen')}
                title="Capture entire primary display"
              >
                <Monitor size={13} />
                <span>Full Screen</span>
              </button>
            </div>

            {/* TAB 1: WINDOW SNIP */}
            {snipMode === 'window' && (
              <WindowSnipTab
                sources={sources}
                isLoadingSources={isLoadingSources}
                onRefreshSources={fetchSources}
                onSelectWindow={handleWindowSnip}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
              />
            )}

            {/* TAB 2 & 3: RECTANGULAR & FULL SCREEN */}
            {(snipMode === 'rect' || snipMode === 'screen') && (
              <SingleSnipTab
                mode={snipMode}
                isCapturing={isCapturing}
                onLaunchSnip={snipMode === 'rect' ? handleRectangularSnip : handleFullScreenSnip}
              />
            )}

            {/* Folder Destination Bar at Bottom */}
            <ScreenshotFolderFooter
              folderPath={config.screenshotFolder}
              onChangeFolder={handleChangeFolder}
              onOpenFolder={handleOpenFolder}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenshotModal;
