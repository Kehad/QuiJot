export type ThemeName = 'yellow' | 'mint' | 'pink' | 'blue' | 'glass-dark' | 'white';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotesPayload {
  activeNoteId: string;
  notes: NoteItem[];
}

export interface NoteData {
  id?: string;
  title?: string;
  content: string;
  updatedAt: string;
}

export interface WindowBounds {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface AppConfig {
  bounds?: WindowBounds;
  isAlwaysOnTop: boolean;
  opacity: number;
  theme: ThemeName;
  startOnBoot: boolean;
  closeToTray: boolean;
  fontSize: number;
  fontFamily: string;
  screenshotFolder?: string;
  autoSaveScreenshots?: boolean;
  autoCopyScreenshots?: boolean;
}

export interface CapturableSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon?: string | null;
  type: 'window' | 'screen';
}

export interface CaptureResult {
  dataUrl: string;
  width: number;
  height: number;
  name: string;
  id?: string;
  timestamp: string;
  filePath?: string;
}

export interface IElectronAPI {
  getInitialData: () => Promise<{ note: NoteData; notesPayload?: NotesPayload; config: AppConfig }>;
  saveNote: (content: string, noteId?: string) => Promise<NoteData>;
  saveNotesList: (payload: NotesPayload) => Promise<NotesPayload>;
  saveConfig: (partialConfig: Partial<AppConfig>) => Promise<AppConfig>;
  setAlwaysOnTop: (isTop: boolean) => Promise<boolean>;
  setOpacity: (opacity: number) => Promise<number>;
  minimize: () => void;
  close: () => void;
  hideToTray: () => void;
  setStartup: (enable: boolean) => Promise<boolean>;
  exportFile: (content: string, defaultName?: string) => Promise<boolean>;
  startRectangularSnip: () => Promise<CaptureResult | null>;
  captureFullScreen: () => Promise<CaptureResult>;
  captureWindow: (sourceId: string) => Promise<CaptureResult>;
  getCapturableSources: () => Promise<CapturableSource[]>;
  selectScreenshotFolder: () => Promise<string | null>;
  openScreenshotFolder: () => Promise<boolean>;
  openScreenshotFile: (filePath: string) => Promise<boolean>;
  copyScreenshotToClipboard: (dataUrl: string) => Promise<boolean>;
  saveScreenshot: (dataUrl: string, defaultName?: string) => Promise<{ success: boolean; filePath?: string }>;
  onNoteExternalUpdate: (callback: (content: string) => void) => () => void;
  onConfigExternalUpdate: (callback: (config: Partial<AppConfig>) => void) => () => void;
  onTriggerScreenshot: (callback: (mode?: string) => void) => () => void;
  onScreenshotCaptured: (callback: (result: CaptureResult) => void) => () => void;
  onTriggerNewNote?: (callback: () => void) => () => void;
  onTriggerNotesList?: (callback: () => void) => () => void;
}


declare global {
  interface Window {
    electronAPI?: IElectronAPI;
  }
}

