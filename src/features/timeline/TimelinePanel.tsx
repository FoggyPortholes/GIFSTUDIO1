import { useStudio } from '../studio/StudioContext';

export const TimelinePanel = () => {
  const { frames, moveFrame, removeFrame, clearFrames } = useStudio();

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Timeline</p>
          <h2>Sequence your story</h2>
        </div>
        <button className="button button--ghost" type="button" onClick={clearFrames} disabled={!frames.length}>
          Clear all
        </button>
      </header>

      {frames.length === 0 ? (
        <p className="empty-state">Import frames to start arranging your animation.</p>
      ) : (
        <ol className="timeline__list">
          {frames.map((frame, index) => (
            <li key={frame.id} className="timeline__item">
              <figure className="timeline__preview">
                <img src={frame.url} alt={frame.name} />
              </figure>
              <div className="timeline__meta">
                <p className="timeline__name">{frame.name}</p>
                <p className="timeline__details">
                  {frame.width}×{frame.height}px
                </p>
              </div>
              <div className="timeline__actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Move frame earlier"
                  disabled={index === 0}
                  onClick={() => moveFrame(frame.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Move frame later"
                  disabled={index === frames.length - 1}
                  onClick={() => moveFrame(frame.id, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  aria-label="Remove frame"
                  onClick={() => removeFrame(frame.id)}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
