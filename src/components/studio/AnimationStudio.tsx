import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStudioStore, useActiveCharacter } from '../../store/studioStore';
import { composeFrame, pixelIndex } from '../../utils/frame';
import { exportAnimationGif, exportFrameAsDataUrl } from '../../services/imageService';
import { logDebug, logError, logInfo } from '../../services/logger';

export function AnimationStudio() {
  const { state, dispatch } = useStudioStore();
  const character = useActiveCharacter();
  const frames = character.frames;
  const activeIndex = Math.max(0, frames.findIndex((frame) => frame.id === state.activeFrameId));
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const composedFrames = useMemo(
    () => frames.map((frame) => composeFrame(frame, character.width, character.height)),
    [frames, character.width, character.height]
  );

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = Math.max(4, Math.floor(128 / character.width));
    canvas.width = character.width * scale;
    canvas.height = character.height * scale;
    ctx.imageSmoothingEnabled = false;

    const colors = composedFrames[previewIndex];
    if (!colors) return;
    for (let y = 0; y < character.height; y += 1) {
      for (let x = 0; x < character.width; x += 1) {
        const color = colors[pixelIndex(x, y, character.width)];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        } else {
          ctx.clearRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [previewIndex, composedFrames, character.width, character.height]);

  useEffect(() => {
    if (!isPlaying) return;
    let cancelled = false;
    let frameIndex = previewIndex;

    function scheduleNext() {
      const frame = frames[frameIndex];
      const delay = frame?.duration ?? 200;
      setTimeout(() => {
        if (cancelled) return;
        frameIndex = (frameIndex + 1) % frames.length;
        setPreviewIndex(frameIndex);
        scheduleNext();
      }, delay);
    }

    scheduleNext();
    return () => {
      cancelled = true;
    };
  }, [isPlaying, frames, previewIndex]);

  useEffect(() => {
    if (!isPlaying) {
      setPreviewIndex(activeIndex);
    }
  }, [activeIndex, isPlaying]);

  const handleExport = async () => {
    logInfo('GIF export requested', {
      characterId: character.id,
      frames: frames.length,
    });
    setExporting(true);
    if (exportUrl) {
      URL.revokeObjectURL(exportUrl);
    }
    setExportUrl(null);
    try {
      const url = await exportAnimationGif(character);
      setExportUrl(url);
      logInfo('GIF export completed', {
        characterId: character.id,
        frames: frames.length,
        urlLength: url.length,
      });
    } catch (error) {
      logError('Failed to export GIF', { error, characterId: character.id });
      alert('Failed to export GIF. See console for details.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animation-studio">
      <div className="timeline">
        {frames.map((frame) => (
          <div
            key={frame.id}
            role="button"
            tabIndex={0}
            className={`frame-card ${state.activeFrameId === frame.id ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_FRAME', id: frame.id })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                dispatch({ type: 'SET_ACTIVE_FRAME', id: frame.id });
              }
            }}
          >
            <span className="frame-name">{frame.name}</span>
            <span className="frame-duration">{frame.duration}ms</span>
            <div className="frame-controls">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch({ type: 'SET_FRAME_DURATION', id: frame.id, duration: frame.duration - 20 });
                }}
              >
                -
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch({ type: 'SET_FRAME_DURATION', id: frame.id, duration: frame.duration + 20 });
                }}
              >
                +
              </button>
              {frames.length > 1 && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatch({ type: 'DELETE_FRAME', id: frame.id });
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
        <button className="frame-card ghost" onClick={() => dispatch({ type: 'ADD_FRAME', mode: 'blank' })}>
          + Blank Frame
        </button>
        <button className="frame-card ghost" onClick={() => dispatch({ type: 'ADD_FRAME', mode: 'duplicate' })}>
          + Duplicate Frame
        </button>
      </div>

      <div className="preview-panel">
        <canvas ref={previewRef} className="preview-canvas" />
        <div className="preview-controls">
          <button onClick={() => setIsPlaying((value) => !value)}>{isPlaying ? 'Pause' : 'Play'}</button>
          <button onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export GIF'}
          </button>
          {exportUrl && (
            <a className="download-link" href={exportUrl} download={`${character.name.replace(/\s+/g, '_')}.gif`}>
              Download GIF
            </a>
          )}
        </div>
      </div>

      <div className="frame-inspector">
        {frames.map((frame) => (
          <div key={frame.id} className={`inspector-row ${state.activeFrameId === frame.id ? 'active' : ''}`}>
            <label>
              Label
              <input
                type="text"
                value={frame.name}
                onChange={(event) =>
                  dispatch({ type: 'RENAME_FRAME', id: frame.id, name: event.target.value })
                }
              />
            </label>
            <label>
              Duration (ms)
              <input
                type="number"
                min={40}
                value={frame.duration}
                onChange={(event) =>
                  dispatch({ type: 'SET_FRAME_DURATION', id: frame.id, duration: Number(event.target.value) })
                }
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                try {
                  logInfo('Frame PNG export requested', {
                    characterId: character.id,
                    frameId: frame.id,
                  });
                  const url = await exportFrameAsDataUrl(character, frame);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${frame.name.replace(/\s+/g, '_')}.png`;
                  link.click();
                  logDebug('Frame PNG export completed', {
                    characterId: character.id,
                    frameId: frame.id,
                    urlLength: url.length,
                  });
                } catch (error) {
                  logError('Failed to export frame PNG', {
                    error,
                    characterId: character.id,
                    frameId: frame.id,
                  });
                  alert('Unable to export frame to PNG.');
                }
              }}
            >
              Download PNG
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
