import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ExportPanel } from './features/export/ExportPanel';
import { PreviewPanel } from './features/preview/PreviewPanel';
import { StudioProvider, useStudioState } from './features/studio/StudioProvider';
import { useStudioActions } from './features/studio/useStudioActions';
import { TimelinePanel } from './features/timeline/TimelinePanel';
import { FrameUploader } from './features/uploader/FrameUploader';
import { Toast } from './features/ui/Toast';
import { encodeGif } from './lib/gif-encoder';
import { loadFrame, revokeFrame } from './lib/load-frame';
import type { FrameAsset } from './types';

interface ToastState {
  message: string;
  tone: 'success' | 'error';
}

const StudioShell = () => {
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
  const toastTimeout = useRef<number | null>(null);
  const framesRef = useRef<FrameAsset[]>(frames);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
      framesRef.current.forEach(revokeFrame);
    };
  }, []);

  const showToast = useCallback((message: string, tone: ToastState['tone'] = 'success') => {
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    setToast({ message, tone });
    toastTimeout.current = window.setTimeout(() => setToast(null), 3200);
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

      if (!fulfilled.length) {
        showToast('No supported frames were imported.', 'error');
        return;
      }

      addFrames(fulfilled.map((result) => result.value));

      if (rejected) {
        showToast(
          `Added ${fulfilled.length} frame${fulfilled.length === 1 ? '' : 's'}, ${rejected} failed to load.`,
          'error'
        );
      } else {
        showToast(`${fulfilled.length} frame${fulfilled.length === 1 ? '' : 's'} added.`);
      }
    },
    [addFrames, showToast]
  );

  const handleSpriteFrames = useCallback(
    (spriteFrames: FrameAsset[], meta?: { sourceName?: string }) => {
      if (!spriteFrames.length) {
        showToast('No frames were created from the sprite sheet.', 'error');
        return;
      }

      addFrames(spriteFrames);
      const baseMessage = `${spriteFrames.length} frame${spriteFrames.length === 1 ? '' : 's'} added`;
      const details = meta?.sourceName ? ` from ${meta.sourceName}` : '';
      showToast(`${baseMessage}${details}.`);
    },
    [addFrames, showToast]
  );

  const handleMove = useCallback(
    (id: string, targetIndex: number) => {
      moveFrame(id, targetIndex);
    },
    [moveFrame]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const frame = frames.find((item) => item.id === id);
      if (!frame) {
        return;
      }
      revokeFrame(frame);
      removeFrame(id);
      showToast('Frame removed.');
    },
    [frames, removeFrame, showToast]
  );

  const handleClear = useCallback(() => {
    frames.forEach(revokeFrame);
    clearFrames();
    showToast('Cleared timeline.');
  }, [frames, clearFrames, showToast]);

  const handleTogglePlay = useCallback(() => {
    setPlaying(!isPlaying);
  }, [isPlaying, setPlaying]);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      const blob = await encodeGif({ frames, playback, exportSettings });
      const fileName = `gifstudio-${Date.now()}.gif`;
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
  }, [exportSettings, frames, playback, showToast]);

  return (
    <div className="app-shell">
      <header>
        <div>
          <h1>GIF Studio</h1>
          <p>
            Craft looping animations entirely in your browser. Import still images, refine the timeline,
            preview playback, and export a polished GIF ready to share.
          </p>
        </div>
      </header>
      <main>
        <section className="column">
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
        <section className="column">
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
      </main>
      <footer>
        <p>Built with modern React, gifenc, and a renewed focus on clarity.</p>
      </footer>
      {toast && <Toast tone={toast.tone} message={toast.message} />}
    </div>
  );
};

const App = () => (
  <StudioProvider>
    <StudioShell />
  </StudioProvider>
);

export default App;
