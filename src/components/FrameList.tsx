import type { FrameAsset } from '../types';

interface FrameListProps {
  frames: FrameAsset[];
  currentId?: string;
  onSelect: (frameId: string) => void;
  onMove: (frameId: string, direction: -1 | 1) => void;
  onRemove: (frameId: string) => void;
  onClear: () => void;
}

const formatDimensions = (frame: FrameAsset) => `${frame.width}×${frame.height}`;

export const FrameList = ({
  frames,
  currentId,
  onSelect,
  onMove,
  onRemove,
  onClear,
}: FrameListProps) => {
  if (!frames.length) {
    return (
      <div className="panel">
        <h2>Timeline</h2>
        <div className="empty-state">
          <strong>No frames yet</strong>
          <span>Add some imagery to begin crafting your animation.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Timeline</h2>
      <div className="frame-list">
        {frames.map((frame, index) => {
          const isActive = frame.id === currentId;
          const cardClass = `frame-card${isActive ? ' active' : ''}`;
          return (
            <div key={frame.id} className={cardClass} onClick={() => onSelect(frame.id)}>
              <img src={frame.url} alt={frame.name} className="frame-thumb" />
              <div className="frame-meta">
                <strong>{frame.name}</strong>
                <span>{formatDimensions(frame)}</span>
              </div>
              <div className="frame-actions" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className="icon-button"
                  title="Move frame up"
                  disabled={index === 0}
                  onClick={() => onMove(frame.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="Move frame down"
                  disabled={index === frames.length - 1}
                  onClick={() => onMove(frame.id, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title="Remove frame"
                  onClick={() => onRemove(frame.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" className="secondary-button" onClick={onClear}>
        Clear all frames
      </button>
    </div>
  );
};
