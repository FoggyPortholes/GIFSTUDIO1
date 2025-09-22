import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ExportPanel } from '../export/ExportPanel';
import { PreviewPanel } from '../preview/PreviewPanel';
import { useStudioState } from '../studio/StudioProvider';
import { useStudioActions } from '../studio/useStudioActions';
import { TimelinePanel } from '../timeline/TimelinePanel';
import { FrameUploader } from '../uploader/FrameUploader';
import { Toast } from '../ui/Toast';
import { encodeGif } from '../../lib/gif-encoder';
import { loadFrame, revokeFrame } from '../../lib/load-frame';
import type { FrameAsset } from '../../types';

interface ToastState {
  message: string;
  tone: 'success' | 'error';
}

const createFrameKey = (frame: FrameAsset) =>
  `${frame.name}:${frame.width}:${frame.height}:${frame.file.size}`;

const formatDurationLabel = (frameCount: number, delay: number) => {
  if (!frameCount) {
    return '0 ms';
  }
  const totalMs = frameCount * delay;
  if (totalMs < 1000) {
    return `${totalMs} ms`;
  }
  const seconds = totalMs / 1000;
  const precision = seconds >= 10 ? 0 : 1;
  return `${seconds.toFixed(precision)} s`;
};

export const StudioWorkspace = () => {
  const { frames, currentFrameId, playback, exportSettings, isPlaying } = useStudioState();
  const {
    addFrames,
    selectFrame,
    moveFrame,
    removeFrame,
    clearFrames,
    setPlaybackDelay,
    setPlaybackLoop,
    setPlaying,
    updateExportSettings,
  } = useStudioActions();

  const [toast, setToast] = useState<ToastState | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const framesRef = useRef<FrameAsset[]>(frames);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      framesRef.current.forEach(revokeFrame);
    };
  }, []);

  const showToast = useCallback((message: string, tone: ToastState['tone'] = 'success') => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, tone });
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const currentIndex = useMemo(() => {
    if (!frames.length) {
      return 0;
    }
    if (!currentFrameId) {
      return 0;
    }
    const index = frames.findIndex((frame) => frame.id === currentFrameId);
    return index === -1 ? 0 : index;
  }, [frames, currentFrameId]);

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      return;
    }
    const timer = window.setTimeout(() => {
      const nextIndex = (currentIndex + 1) % frames.length;
      selectFrame(frames[nextIndex].id);
    }, playback.delay);
    return () => window.clearTimeout(timer);
  }, [isPlaying, frames, currentIndex, playback.delay, selectFrame]);

  useEffect(() => {
    if (frames.length <= 1 && isPlaying) {
      setPlaying(false);
    }
  }, [frames.length, isPlaying, setPlaying]);

  const stats = useMemo(() => {
    const frameCount = frames.length;
    return {
      frameCount,
      durationLabel: formatDurationLabel(frameCount, playback.delay),
      fps: frameCount ? Math.round(1000 / playback.delay) : 0,
      resolution: `${exportSettings.width}×${exportSettings.height}`,
    };
  }, [frames.length, playback.delay, exportSettings.height, exportSettings.width]);

  const prepareIncomingFrames = useCallback((incoming: FrameAsset[]) => {
    if (!incoming.length) {
      return { unique: [] as FrameAsset[], duplicates: 0 };
    }
    const existingKeys = new Set(framesRef.current.map(createFrameKey));
    const unique: FrameAsset[] = [];
    let duplicates = 0;

    for (const frame of incoming) {
      const key = createFrameKey(frame);
      if (existingKeys.has(key)) {
        duplicates += 1;
        revokeFrame(frame);
      } else {
        existingKeys.add(key);
        unique.push(frame);
      }
    }

    return { unique, duplicates };
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) {
        return;
      }

      const results = await Promise.allSettled(files.map((file) => loadFrame(file)));
      const fulfilled = results.filter(
        (result): result is PromiseFulfilledResult<FrameAsset> => result.status === 'fulfilled'
      );
      const rejected = results.length - fulfilled.length;

      const { unique, duplicates } = prepareIncomingFrames(
        fulfilled.map((result) => result.value)
      );

      if (!unique.length) {
        const skipped = rejected + duplicates;
        showToast(
          skipped
            ? `${skipped} file${skipped === 1 ? '' : 's'} could not be added.`
            : 'No supported frames were imported.',
          'error'
        );
        return;
      }

      addFrames(unique);
      const addedMessage = `${unique.length} frame${unique.length === 1 ? '' : 's'} added`;
      const skipped = rejected + duplicates;
      if (skipped) {
        showToast(`${addedMessage}, ${skipped} skipped.`, 'error');
      } else {
        showToast(`${addedMessage}.`);
      }
    },
    [addFrames, prepareIncomingFrames, showToast]
  );

  const handleSpriteFrames = useCallback(
    (spriteFrames: FrameAsset[], meta?: { sourceName?: string }) => {
      const { unique, duplicates } = prepareIncomingFrames(spriteFrames);

      if (!unique.length) {
        showToast('No new frames were created from the sprite sheet.', 'error');
        return;
      }

      addFrames(unique);
      const details = meta?.sourceName ? ` from ${meta.sourceName}` : '';
      const addedMessage = `${unique.length} frame${unique.length === 1 ? '' : 's'} added${details}`;
      if (duplicates) {
        showToast(`${addedMessage}, ${duplicates} duplicates skipped.`, 'error');
      } else {
        showToast(`${addedMessage}.`);
      }
    },
    [addFrames, prepareIncomingFrames, showToast]
  );

  const handleMove = useCallback(
    (id: string, targetIndex: number) => {
      moveFrame(id, targetIndex);
    },
    [moveFrame]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const frame = framesRef.current.find((item) => item.id === id);
      if (!frame) {
        return;
      }
      revokeFrame(frame);
      removeFrame(id);
      showToast('Frame removed.');
    },
    [removeFrame, showToast]
  );

  const handleClear = useCallback(() => {
    if (!framesRef.current.length) {
      return;
    }
    framesRef.current.forEach(revokeFrame);
    clearFrames();
    showToast('Cleared timeline.');
  }, [clearFrames, showToast]);

  const handleTogglePlay = useCallback(() => {
    setPlaying(!isPlaying);
  }, [isPlaying, setPlaying]);

  const handleExport = useCallback(async () => {
    if (!framesRef.current.length) {
      showToast('Add frames before exporting.', 'error');
      return;
    }
    try {
      setPlaying(false);
      setIsExporting(true);
      const blob = await encodeGif({
        frames: framesRef.current,
        playback,
        exportSettings,
      });
      const fileName = `gifstudio-${new Date().toISOString().replace(/[:.]/g, '-')}.gif`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast('GIF export complete.');
    } catch (error) {
      console.error(error);
      showToast('Export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [exportSettings, playback, setPlaying, showToast]);

  return (
    <div className="workspace">
      <header className="workspace__header">
        <div className="workspace__title">
          <p className="workspace__eyebrow">Rebuilt from the ground up</p>
          <h1>GIF Studio</h1>
          <p>
            Craft looping animations entirely in your browser. Import still images, refine the timeline,
            preview playback, and export a polished GIF ready to share.
          </p>
        </div>
        <div className="workspace__stats" aria-live="polite">
          <div className="stats-card">
            <span className="stats-card__label">Frames</span>
            <strong className="stats-card__value">{stats.frameCount}</strong>
          </div>
          <div className="stats-card">
            <span className="stats-card__label">Duration</span>
            <strong className="stats-card__value">{stats.durationLabel}</strong>
          </div>
          <div className="stats-card">
            <span className="stats-card__label">Playback</span>
            <strong className="stats-card__value">
              {stats.fps ? `${stats.fps} fps` : 'Paused'}
            </strong>
          </div>
          <div className="stats-card">
            <span className="stats-card__label">Export Size</span>
            <strong className="stats-card__value">{stats.resolution}</strong>
          </div>
        </div>
      </header>
      <div className="workspace__grid">
        <section className="workspace__column">
          <FrameUploader onFiles={handleFiles} onFrames={handleSpriteFrames} disabled={isExporting} />
          <TimelinePanel
            frames={frames}
            currentId={frames[currentIndex]?.id ?? null}
            onSelect={(id) => selectFrame(id)}
            onMove={handleMove}
            onRemove={handleRemove}
            onClear={handleClear}
          />
        </section>
        <section className="workspace__column">
          <PreviewPanel
            frames={frames}
            currentIndex={currentIndex}
            playback={playback}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onDelayChange={setPlaybackDelay}
            onLoopChange={setPlaybackLoop}
          />
          <ExportPanel
            frames={frames}
            settings={exportSettings}
            onSettingsChange={updateExportSettings}
            onExport={handleExport}
            isExporting={isExporting}
          />
        </section>
      </div>
      <footer className="workspace__footer">
        <p>Built with modern React, gifenc, and a renewed focus on clarity.</p>
      </footer>
      {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}
    </div>
  );
};
