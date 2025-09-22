import { useEffect, useMemo, useRef, useState } from 'react';
import { ExportPanel } from './components/ExportPanel';
import { FrameList } from './components/FrameList';
import { FrameUploader } from './components/FrameUploader';
import { Preview } from './components/Preview';
import { encodeGif } from './lib/gif-encoder';
import { loadFrame, revokeFrame } from './lib/load-frame';
import type { ExportSettings, FrameAsset, PlaybackSettings } from './types';

const DEFAULT_PLAYBACK: PlaybackSettings = {
  delay: 120,
  loop: true,
};

const DEFAULT_EXPORT: ExportSettings = {
  width: 512,
  height: 512,
  background: '#0f172a',
  fitMode: 'contain',
};

interface ToastState {
  message: string;
  tone: 'success' | 'error';
}

const clampSize = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 32;
  }
  return Math.min(2048, Math.round(value));
};

export default function App() {
  const [frames, setFrames] = useState<FrameAsset[]>([]);
  const [currentFrameId, setCurrentFrameId] = useState<string | undefined>();
  const [playback, setPlayback] = useState<PlaybackSettings>(DEFAULT_PLAYBACK);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT);
  const [toast, setToast] = useState<ToastState | null>(null);
  const framesRef = useRef<FrameAsset[]>(frames);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    return () => {
      framesRef.current.forEach(revokeFrame);
    };
  }, []);

  const currentIndex = useMemo(() => {
    if (!frames.length) {
      return 0;
    }
    const found = frames.findIndex((frame) => frame.id === currentFrameId);
    return found === -1 ? 0 : found;
  }, [frames, currentFrameId]);

  useEffect(() => {
    if (!frames.length) {
      setCurrentFrameId(undefined);
      setIsPlaying(false);
      return;
    }

    if (!currentFrameId) {
      setCurrentFrameId(frames[0].id);
    }
  }, [frames, currentFrameId]);

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentFrameId((previous) => {
        const index = frames.findIndex((frame) => frame.id === previous);
        const nextIndex = index === -1 ? 0 : (index + 1) % frames.length;
        return frames[nextIndex].id;
      });
    }, Math.max(20, playback.delay));

    return () => window.clearTimeout(timer);
  }, [frames, isPlaying, playback.delay]);

  const showToast = (message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length) {
      return;
    }

    const results = await Promise.allSettled(files.map((file) => loadFrame(file)));
    const fulfilled = results.filter((result): result is PromiseFulfilledResult<FrameAsset> => result.status === 'fulfilled');
    const rejectedCount = results.length - fulfilled.length;

    if (!fulfilled.length) {
      showToast('No supported frames were imported.', 'error');
      return;
    }

    const newFrames = fulfilled.map((result) => result.value);
    setFrames((previous) => {
      const merged = [...previous, ...newFrames];
      if (!previous.length && newFrames.length) {
        setCurrentFrameId(newFrames[0].id);
        setExportSettings((prev) => ({
          ...prev,
          width: clampSize(newFrames[0].width),
          height: clampSize(newFrames[0].height),
        }));
      }
      return merged;
    });

    if (rejectedCount) {
      showToast(
        `Added ${newFrames.length} frame${newFrames.length > 1 ? 's' : ''}, ${rejectedCount} failed to load.`,
        'error'
      );
    } else {
      showToast(`${newFrames.length} frame${newFrames.length > 1 ? 's' : ''} added.`);
    }
  };

  const handleMove = (frameId: string, direction: -1 | 1) => {
    setFrames((previous) => {
      const index = previous.findIndex((frame) => frame.id === frameId);
      if (index === -1) {
        return previous;
      }
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= previous.length) {
        return previous;
      }
      const updated = [...previous];
      const [frame] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, frame);
      return updated;
    });
  };

  const handleRemove = (frameId: string) => {
    setFrames((previous) => {
      const frame = previous.find((item) => item.id === frameId);
      if (!frame) {
        return previous;
      }
      revokeFrame(frame);
      const updated = previous.filter((item) => item.id !== frameId);
      if (!updated.length) {
        setIsPlaying(false);
        setCurrentFrameId(undefined);
      } else if (frameId === currentFrameId) {
        setCurrentFrameId(updated[0].id);
      }
      return updated;
    });
  };

  const handleClear = () => {
    frames.forEach(revokeFrame);
    setFrames([]);
    setCurrentFrameId(undefined);
    setIsPlaying(false);
    showToast('Cleared timeline.');
  };

  const handleExport = async () => {
    const blob = await encodeGif({
      frames,
      playback,
      exportSettings,
    });

    const fileName = `gifstudio-${Date.now()}.gif`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('GIF export completed.');
  };

  return (
    <div className="app-shell">
      <header>
        <h1>GIF Studio</h1>
        <p>
          Craft looping animations in moments. Drop imagery, reorder frames, adjust playback, and
          render a polished GIF export directly in your browser.
        </p>
      </header>
      <main>
        <div className="stack">
          <FrameUploader onFiles={handleFiles} />
          <FrameList
            frames={frames}
            currentId={frames[currentIndex]?.id}
            onSelect={setCurrentFrameId}
            onMove={handleMove}
            onRemove={handleRemove}
            onClear={handleClear}
          />
        </div>
        <div className="stack">
          <Preview
            frames={frames}
            currentIndex={currentIndex}
            playback={playback}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((value) => !value)}
            onDelayChange={(delay) => setPlayback((prev) => ({ ...prev, delay }))}
            onLoopChange={(loop) => setPlayback((prev) => ({ ...prev, loop }))}
          />
          <ExportPanel
            frames={frames}
            settings={exportSettings}
            onSettingsChange={(settings) =>
              setExportSettings({
                ...settings,
                width: clampSize(settings.width),
                height: clampSize(settings.height),
              })
            }
            onExport={handleExport}
          />
        </div>
      </main>
      <footer>Built fresh with modern React and gifenc.</footer>
      {toast && (
        <div className={`toast${toast.tone === 'error' ? ' error' : ''}`} role="status">
          <strong>{toast.tone === 'error' ? 'Notice' : 'Success'}</strong>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
