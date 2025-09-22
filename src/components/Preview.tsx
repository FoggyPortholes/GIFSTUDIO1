import type { FrameAsset, PlaybackSettings } from '../types';

interface PreviewProps {
  frames: FrameAsset[];
  currentIndex: number;
  playback: PlaybackSettings;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onDelayChange: (delay: number) => void;
  onLoopChange: (loop: boolean) => void;
}

export const Preview = ({
  frames,
  currentIndex,
  playback,
  isPlaying,
  onTogglePlay,
  onDelayChange,
  onLoopChange,
}: PreviewProps) => {
  const activeFrame = frames[currentIndex];

  return (
    <div className="panel preview">
      <h2>Preview</h2>
      {activeFrame ? (
        <img src={activeFrame.url} alt={activeFrame.name} />
      ) : (
        <div className="empty-state">
          <strong>Awaiting frames</strong>
          <span>Add frames to see a live animation preview.</span>
        </div>
      )}
      <div className="playback-controls">
        <button type="button" onClick={onTogglePlay} disabled={!frames.length}>
          {isPlaying ? 'Pause preview' : 'Play preview'}
        </button>
        <div className="field-group" style={{ flex: 1 }}>
          <label htmlFor="delay">Frame delay ({playback.delay} ms)</label>
          <input
            id="delay"
            type="range"
            min={20}
            max={1000}
            step={10}
            value={playback.delay}
            onChange={(event) => onDelayChange(Number(event.target.value))}
          />
        </div>
        <div className="field-group" style={{ width: '120px' }}>
          <label htmlFor="loop">Loop playback</label>
          <select
            id="loop"
            value={playback.loop ? 'loop' : 'once'}
            onChange={(event) => onLoopChange(event.target.value === 'loop')}
          >
            <option value="loop">Forever</option>
            <option value="once">Play once</option>
          </select>
        </div>
      </div>
      {frames.length > 0 && (
        <p style={{ margin: 0, color: 'rgba(226, 232, 240, 0.65)' }}>
          Showing frame {currentIndex + 1} of {frames.length}
        </p>
      )}
    </div>
  );
};
