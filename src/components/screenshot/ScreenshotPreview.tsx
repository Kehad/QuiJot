import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FolderOpen,
  Copy,
  Crop,
  FileText,
} from 'lucide-react';
import { CaptureResult } from '../../types/electron';
import styles from './ScreenshotPreview.module.css';

interface ScreenshotPreviewProps {
  captureResult: CaptureResult;
  onRetake: () => void;
  onCopyClipboard: () => void;
  copiedSuccess: boolean;
  onInsertNoteRef: () => void;
  onCropComplete: (newResult: CaptureResult) => void;
  onToast: (msg: string) => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
}

export const ScreenshotPreview: React.FC<ScreenshotPreviewProps> = ({
  captureResult,
  onRetake,
  onCopyClipboard,
  copiedSuccess,
  onInsertNoteRef,
  onCropComplete,
  onToast,
  onOpenFile,
  onOpenFolder,
}) => {
  const [isFineCropping, setIsFineCropping] = useState<boolean>(false);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDownCrop = (e: React.MouseEvent) => {
    if (!isFineCropping || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    setDragStart({ x, y });
    setCropBox({ x, y, w: 0, h: 0 });
    setIsDraggingCrop(true);
  };

  const handleMouseMoveCrop = (e: React.MouseEvent) => {
    if (!isDraggingCrop || !dragStart || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const left = Math.min(dragStart.x, currentX);
    const top = Math.min(dragStart.y, currentY);
    const w = Math.abs(currentX - dragStart.x);
    const h = Math.abs(currentY - dragStart.y);

    setCropBox({ x: left, y: top, w, h });
  };

  const handleMouseUpCrop = () => {
    setIsDraggingCrop(false);
  };

  const handleApplyCrop = async () => {
    if (!cropBox || !imageRef.current || !captureResult || cropBox.w < 10 || cropBox.h < 10) {
      onToast('Please select a larger crop area.');
      return;
    }

    const rect = imageRef.current.getBoundingClientRect();
    const rx = cropBox.x / rect.width;
    const ry = cropBox.y / rect.height;
    const rw = cropBox.w / rect.width;
    const rh = cropBox.h / rect.height;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const sx = Math.round(rx * img.naturalWidth);
      const sy = Math.round(ry * img.naturalHeight);
      const sw = Math.round(rw * img.naturalWidth);
      const sh = Math.round(rh * img.naturalHeight);

      canvas.width = Math.max(1, sw);
      canvas.height = Math.max(1, sh);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        const croppedUrl = canvas.toDataURL('image/png');

        if (window.electronAPI) {
          const saved = await window.electronAPI.saveScreenshot(
            croppedUrl,
            `Qikjot_Cropped_${Date.now()}.png`
          );
          await window.electronAPI.copyScreenshotToClipboard(croppedUrl);

          onCropComplete({
            ...captureResult,
            dataUrl: croppedUrl,
            width: canvas.width,
            height: canvas.height,
            name: `${captureResult.name} (Cropped)`,
            filePath: saved.filePath || captureResult.filePath,
          });
        }
        setIsFineCropping(false);
        setCropBox(null);
        onToast('✂️ Cropped, saved & copied to clipboard!');
      }
    };
    img.src = captureResult.dataUrl;
  };

  return (
    <div className={styles.screenshotPreviewView} onMouseUp={handleMouseUpCrop}>
      <div className={styles.screenshotPreviewToolbar}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => {
            setIsFineCropping(false);
            setCropBox(null);
            onRetake();
          }}
          style={{ padding: '3px 8px', fontSize: '11px' }}
        >
          <ArrowLeft size={11} />
          <span>Take Another</span>
        </button>

        <div className={styles.previewMetaInfo}>
          <span className={styles.previewSourceName} title={captureResult.name}>
            {captureResult.name}
          </span>
          <span className={styles.previewDimBadge}>
            {captureResult.width} × {captureResult.height} px
          </span>
        </div>
      </div>

      {/* Saved File Path Banner */}
      {captureResult.filePath && (
        <div className={styles.savedFileBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <Check size={12} color="#22c55e" style={{ flexShrink: 0 }} />
            <span className={styles.savedFilePath} title={captureResult.filePath}>
              Saved: {captureResult.filePath}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              type="button"
              className={styles.tagBtn}
              onClick={onOpenFile}
              title="Open image in Windows Photo Viewer"
            >
              <ExternalLink size={10} />
              <span>Open</span>
            </button>
            <button
              type="button"
              className={styles.tagBtn}
              onClick={onOpenFolder}
              title="Open folder in File Explorer"
            >
              <FolderOpen size={10} />
              <span>Folder</span>
            </button>
          </div>
        </div>
      )}

      {/* Image Canvas / Container */}
      <div
        className={`${styles.screenshotCanvasWrapper} ${isFineCropping ? styles.isCroppingActive : ''}`}
        ref={previewContainerRef}
        onMouseDown={handleMouseDownCrop}
        onMouseMove={handleMouseMoveCrop}
      >
        <img
          ref={imageRef}
          src={captureResult.dataUrl}
          alt="Captured snip"
          className={styles.screenshotPreviewImage}
          draggable={false}
        />

        {isFineCropping && cropBox && cropBox.w > 0 && cropBox.h > 0 && (
          <div
            className={styles.cropperBox}
            style={{
              left: `${cropBox.x}px`,
              top: `${cropBox.y}px`,
              width: `${cropBox.w}px`,
              height: `${cropBox.h}px`,
            }}
          >
            <span className={styles.cropperDimensionTag}>
              {Math.round(
                (cropBox.w / (imageRef.current?.clientWidth || 1)) * captureResult.width
              )}{' '}
              ×{' '}
              {Math.round(
                (cropBox.h / (imageRef.current?.clientHeight || 1)) * captureResult.height
              )}
            </span>
          </div>
        )}
      </div>

      {/* Crop Action Banner */}
      {isFineCropping && (
        <div className={styles.cropperActionBanner}>
          <span style={{ fontSize: '10.5px', color: 'var(--app-text-muted)' }}>
            Drag a box to crop.
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => {
                setIsFineCropping(false);
                setCropBox(null);
              }}
              style={{ padding: '2px 6px', fontSize: '10px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleApplyCrop}
              style={{ padding: '2px 8px', fontSize: '10px' }}
              disabled={!cropBox || cropBox.w < 10 || cropBox.h < 10}
            >
              Apply & Copy
            </button>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className={styles.screenshotActionsFooter}>
        <button
          type="button"
          className={`${styles.btnPrimary} ${copiedSuccess ? styles.isSuccess : ''}`}
          onClick={onCopyClipboard}
          title="Copy image to clipboard"
        >
          {copiedSuccess ? <Check size={12} /> : <Copy size={12} />}
          <span>{copiedSuccess ? 'Copied!' : 'Copy to Clipboard'}</span>
        </button>

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => {
            setIsFineCropping(!isFineCropping);
            setCropBox(null);
          }}
          title="Crop image"
        >
          <Crop size={12} />
          <span>{isFineCropping ? 'Cancel Crop' : 'Crop'}</span>
        </button>

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onInsertNoteRef}
          title="Insert screenshot reference into sticky note"
        >
          <FileText size={12} />
          <span>Add to Note</span>
        </button>
      </div>
    </div>
  );
};
