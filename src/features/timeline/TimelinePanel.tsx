import type { FrameAsset } from '../../types';

interface TimelinePanelProps {
  frames: FrameAsset[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, targetIndex: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export const TimelinePanel = ({
  frames,
  currentId,
  onSelect,
  onMove,
  onRemove,
  onClear,
}: TimelinePanelProps) => {
  if (!frames.length) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2>Timeline</h2>
          <p>Import at least one frame to begin arranging your animation.</p>
        </div>
        <div className="panel-empty" role="status">
          <p>No frames yet. Drop images above to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Timeline</h2>
        <div className="panel-actions">
          <button type="button" className="ghost" onClick={onClear}>
            Clear All
          </button>
        </div>
      </div>
      <ul className="timeline" role="list">
        {frames.map((frame, index) => {
          const isActive = frame.id === currentId;
          const previousIndex = index - 1;
          const nextIndex = index + 1;
          return (
            <li key={frame.id} className={`timeline-item${isActive ? ' is-active' : ''}`}>
              <button
                type="button"
                className="timeline-thumb"
                onClick={() => onSelect(frame.id)}
                aria-pressed={isActive}
              >
                <img src={frame.url} alt={frame.name} loading="lazy" />
                <span className="timeline-index">{index + 1}</span>
              </button>
              <div className="timeline-meta">
                <span className="timeline-name" title={frame.name}>
                  {frame.name}
                </span>
                <span className="timeline-size">
                  {frame.width}×{frame.height}
                </span>
              </div>
              <div className="timeline-controls">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => onMove(frame.id, previousIndex)}
                  disabled={previousIndex < 0}
                  aria-label="Move frame earlier"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => onMove(frame.id, nextIndex)}
                  disabled={nextIndex >= frames.length}
                  aria-label="Move frame later"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => onRemove(frame.id)}
                  aria-label="Remove frame"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
