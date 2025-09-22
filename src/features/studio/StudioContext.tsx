import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { encodeGif } from '../../lib/gif-encoder';
import { loadFrame, revokeFrame } from '../../lib/load-frame';
import type { ExportSettings, FrameAsset, PlaybackSettings } from '../../types';

interface StudioStats {
  frameCount: number;
  durationSeconds: number;
  widthRange: string;
  heightRange: string;
}

interface StudioContextValue {
  frames: FrameAsset[];
  isImporting: boolean;
  playback: PlaybackSettings;
  exportSettings: ExportSettings;
  stats: StudioStats;
  addFiles: (files: FileList | File[] | null) => Promise<void>;
  removeFrame: (id: string) => void;
  moveFrame: (id: string, offset: number) => void;
  clearFrames: () => void;
  setPlayback: (settings: Partial<PlaybackSettings>) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  encode: () => Promise<Blob>;
}

const DEFAULT_EXPORT: ExportSettings = {
  width: 512,
  height: 512,
  background: '#0f172a',
  fitMode: 'contain',
};

const DEFAULT_PLAYBACK: PlaybackSettings = {
  delay: 120,
  loop: true,
};

const StudioContext = createContext<StudioContextValue | undefined>(undefined);

export const StudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [frames, setFrames] = useState<FrameAsset[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [playback, setPlaybackState] = useState<PlaybackSettings>(DEFAULT_PLAYBACK);
  const [exportSettings, setExportSettingsState] = useState<ExportSettings>(DEFAULT_EXPORT);
  const frameRegistry = useRef<FrameAsset[]>([]);

  frameRegistry.current = frames;

  useEffect(() => () => {
    frameRegistry.current.forEach((frame) => revokeFrame(frame));
  }, []);

  const addFiles = useCallback(async (fileInput: FileList | File[] | null) => {
    if (!fileInput || fileInput.length === 0) {
      return;
    }

    const files = Array.from(fileInput);
    if (!files.length) {
      return;
    }

    setIsImporting(true);
    try {
      const assets = await Promise.all(files.map((file) => loadFrame(file)));
      setFrames((previous) => [...previous, ...assets]);
    } finally {
      setIsImporting(false);
    }
  }, []);

  const removeFrame = useCallback((id: string) => {
    setFrames((previous) => {
      const next = previous.filter((frame) => frame.id !== id);
      const removed = previous.find((frame) => frame.id === id);
      if (removed) {
        revokeFrame(removed);
      }
      return next;
    });
  }, []);

  const moveFrame = useCallback((id: string, offset: number) => {
    if (!offset) {
      return;
    }
    setFrames((previous) => {
      const index = previous.findIndex((frame) => frame.id === id);
      if (index === -1) {
        return previous;
      }
      const nextIndex = index + offset;
      if (nextIndex < 0 || nextIndex >= previous.length) {
        return previous;
      }
      const reordered = [...previous];
      const [item] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, item);
      return reordered;
    });
  }, []);

  const clearFrames = useCallback(() => {
    frameRegistry.current.forEach((frame) => revokeFrame(frame));
    setFrames([]);
  }, []);

  const setPlayback = useCallback((settings: Partial<PlaybackSettings>) => {
    setPlaybackState((previous) => ({ ...previous, ...settings }));
  }, []);

  const setExportSettings = useCallback((settings: Partial<ExportSettings>) => {
    setExportSettingsState((previous) => {
      const merged = { ...previous, ...settings };
      const clamp = (value: number, min: number, max: number, fallback: number) => {
        if (!Number.isFinite(value)) {
          return fallback;
        }
        return Math.min(max, Math.max(min, Math.round(value)));
      };
      return {
        ...merged,
        width: clamp(merged.width, 32, 2048, previous.width),
        height: clamp(merged.height, 32, 2048, previous.height),
      };
    });
  }, []);

  const encode = useCallback(async () => {
    const snapshot = frameRegistry.current;
    if (!snapshot.length) {
      throw new Error('Add at least one frame before exporting.');
    }
    return encodeGif({
      frames: snapshot,
      playback: playback,
      exportSettings,
    });
  }, [exportSettings, playback]);

  const stats: StudioStats = useMemo(() => {
    if (!frames.length) {
      return {
        frameCount: 0,
        durationSeconds: 0,
        widthRange: '—',
        heightRange: '—',
      };
    }

    const widths = frames.map((frame) => frame.width);
    const heights = frames.map((frame) => frame.height);
    const minWidth = Math.min(...widths);
    const maxWidth = Math.max(...widths);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const totalDuration = (frames.length * playback.delay) / 1000;

    return {
      frameCount: frames.length,
      durationSeconds: Number(totalDuration.toFixed(2)),
      widthRange: minWidth === maxWidth ? `${maxWidth}px` : `${minWidth}–${maxWidth}px`,
      heightRange: minHeight === maxHeight ? `${maxHeight}px` : `${minHeight}–${maxHeight}px`,
    };
  }, [frames, playback.delay]);

  const value = useMemo<StudioContextValue>(() => ({
    frames,
    isImporting,
    playback,
    exportSettings,
    stats,
    addFiles,
    removeFrame,
    moveFrame,
    clearFrames,
    setPlayback,
    setExportSettings,
    encode,
  }), [
    frames,
    isImporting,
    playback,
    exportSettings,
    stats,
    addFiles,
    removeFrame,
    moveFrame,
    clearFrames,
    setPlayback,
    setExportSettings,
    encode,
  ]);

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
