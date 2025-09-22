import { useEffect, useMemo, useState } from 'react';
import { useStudio } from '../studio/StudioContext';

const MIN_DELAY = 40;
const MAX_DELAY = 600;

export const PreviewPanel = () => {
  const { frames, playback, setPlayback } = useStudio();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    setActiveIndex(0);
    setIsPlaying(frames.length > 0);
  }, [frames.length]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = current + 1;
        if (next < frames.length) {
          return next;
        }
        if (playback.loop) {
          return 0;
        }
        window.clearInterval(interval);
        setIsPlaying(false);
        return current;
      });
    }, Math.max(MIN_DELAY, playback.delay));

    return () => window.clearInterval(interval);
  }, [frames.length, isPlaying, playback.delay, playback.loop]);

  const durationLabel = useMemo(() => {
    const seconds = Math.max(0, (frames.length * playback.delay) / 1000);
    return seconds.toFixed(2);
  }, [frames.length, playback.delay]);

  const currentFrame = frames[activeIndex];

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Preview</p>
          <h2>Review timing & looping</h2>
        </div>
        <div className="panel__header-actions">
          <button
            type="button"
            className="button"
            onClick={() => setIsPlaying((value) => !value)}
            disabled={!frames.length}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setPlayback({ loop: !playback.loop })}
            disabled={!frames.length}
          >
            {playback.loop ? 'Looping' : 'Play once'}
          </button>
        </div>
      </header>

      <div className="preview__stage">
        {currentFrame ? (
          <img src={currentFrame.url} alt={currentFrame.name} />
        ) : (
          <p className="empty-state">Add frames to see the animation preview.</p>
        )}
      </div>

      <div className="preview__controls">
        <label className="control">
          <span>Frame delay: {playback.delay}ms</span>
          <input
            type="range"
            min={MIN_DELAY}
            max={MAX_DELAY}
            value={playback.delay}
            onChange={(event) => setPlayback({ delay: Number(event.target.value) })}
          />
        </label>
        <p className="preview__summary">Total duration: {durationLabel}s</p>
      </div>
    </section>
  );
};
