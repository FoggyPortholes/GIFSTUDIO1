import { useMemo } from 'react';

import type { FrameAsset, PlaybackSettings } from '../../types';

interface PreviewPanelProps {
  frames: FrameAsset[];
  currentIndex: number;
  playback: PlaybackSettings;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onDelayChange: (delay: number) => void;
  onLoopChange: (loop: boolean) => void;
}

export const PreviewPanel = ({
  frames,
  currentIndex,
  playback,
  isPlaying,
  onTogglePlay,
  onDelayChange,
  onLoopChange,
}: PreviewPanelProps) => {
  const currentFrame = frames[currentIndex];
  const controlsDisabled = frames.length === 0;
  const delayLabel = useMemo(() => `${playback.delay} ms`, [playback.delay]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Preview</h2>
        <p>Test playback speed and looping before exporting.</p>
      </div>
      <div className="preview">
        {currentFrame ? (
          <img
            key={currentFrame.id}
            src={currentFrame.url}
            alt={currentFrame.name}
            className="preview-image"
          />
        ) : (
          <div className="panel-empty" role="status">
            <p>Add at least one frame to unlock playback controls.</p>
          </div>
        )}
      </div>
      <div className="preview-controls">
        <button
          type="button"
          className="primary-action"
          onClick={onTogglePlay}
          disabled={frames.length <= 1}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <label className="preview-slider">
          <span>Delay</span>
          <input
            type="range"
            min={20}
            max={1000}
            step={10}
            value={playback.delay}
            onChange={(event) => onDelayChange(Number(event.target.value))}
            disabled={controlsDisabled}
          />
          <span>{delayLabel}</span>
        </label>
        <label className="preview-checkbox">
          <input
            type="checkbox"
            checked={playback.loop}
            onChange={(event) => onLoopChange(event.target.checked)}
            disabled={controlsDisabled}
          />
          <span>Loop playback</span>
        </label>
      </div>
    </div>
  );
};
