import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import type { FrameAsset } from '../../types';
import { createId } from '../../lib/id';

type ImportMeta = { sourceName?: string };

interface SpriteSheetImporterProps {
  disabled?: boolean;
  onCancel: () => void;
  onImport: (frames: FrameAsset[], meta?: ImportMeta) => void;
}

interface SheetData {
  file: File;
  image: HTMLImageElement;
  url: string;
  width: number;
  height: number;
}

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to create frame from sprite sheet.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};

const getBaseName = (name: string) => {
  const index = name.lastIndexOf('.');
  if (index <= 0) {
    return name;
  }
  return name.slice(0, index);
};

const sliceSpriteSheet = async (
  sheet: SheetData,
  frameWidth: number,
  frameHeight: number,
  frameIndexes: number[],
  columns: number
): Promise<FrameAsset[]> => {
  if (!frameIndexes.length) {
    return [];
  }

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas rendering is not supported in this browser.');
  }

  const frames: FrameAsset[] = [];
  const baseName = getBaseName(sheet.file.name) || 'sprite';

  for (const index of frameIndexes) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const sourceX = column * frameWidth;
    const sourceY = row * frameHeight;

    if (sourceX + frameWidth > sheet.width || sourceY + frameHeight > sheet.height) {
      continue;
    }

    context.clearRect(0, 0, frameWidth, frameHeight);
    context.drawImage(
      sheet.image,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight
    );

    const blob = await toBlob(canvas);
    const fileName = `${baseName}-${String(index + 1).padStart(3, '0')}.png`;
    const frameFile = new File([blob], fileName, { type: 'image/png' });
    const url = URL.createObjectURL(blob);

    frames.push({
      id: createId(),
      name: fileName,
      url,
      width: frameWidth,
      height: frameHeight,
      file: frameFile,
    });
  }

  return frames;
};

export const SpriteSheetImporter = ({ disabled = false, onCancel, onImport }: SpriteSheetImporterProps) => {
  const isMountedRef = useRef(true);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [frameWidth, setFrameWidth] = useState(64);
  const [frameHeight, setFrameHeight] = useState(64);
  const [startFrame, setStartFrame] = useState(1);
  const [endFrame, setEndFrame] = useState<number | null>(null);
  const [selectedFrames, setSelectedFrames] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!sheet) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sheet, onCancel]);

  useEffect(() => {
    return () => {
      if (sheet) {
        URL.revokeObjectURL(sheet.url);
      }
    };
  }, [sheet]);

  const columns = useMemo(() => {
    if (!sheet || frameWidth <= 0) {
      return 0;
    }
    return Math.floor(sheet.width / frameWidth);
  }, [sheet, frameWidth]);

  const rows = useMemo(() => {
    if (!sheet || frameHeight <= 0) {
      return 0;
    }
    return Math.floor(sheet.height / frameHeight);
  }, [sheet, frameHeight]);

  const maxFrames = useMemo(() => {
    if (!columns || !rows) {
      return 0;
    }
    return columns * rows;
  }, [columns, rows]);

  const normalizedEnd = useMemo(() => {
    if (!maxFrames) {
      return null;
    }
    return endFrame ?? maxFrames;
  }, [endFrame, maxFrames]);

  const hasManualSelection = selectedFrames.size > 0;

  const defaultSelectedFrames = useMemo(() => {
    if (!normalizedEnd) {
      return new Set<number>();
    }
    const frames = new Set<number>();
    for (let frame = startFrame; frame <= normalizedEnd; frame += 1) {
      frames.add(frame);
    }
    return frames;
  }, [normalizedEnd, startFrame]);

  const selectionCount = useMemo(() => {
    if (hasManualSelection) {
      return selectedFrames.size;
    }
    if (!normalizedEnd) {
      return 0;
    }
    return Math.max(normalizedEnd - startFrame + 1, 0);
  }, [hasManualSelection, normalizedEnd, selectedFrames, startFrame]);

  useEffect(() => {
    setSelectedFrames(new Set());
  }, [sheet?.url, frameWidth, frameHeight]);

  useEffect(() => {
    if (!maxFrames) {
      return;
    }
    if (startFrame < 1) {
      setStartFrame(1);
    }
    if (endFrame === null || endFrame > maxFrames) {
      setEndFrame(maxFrames);
    }
  }, [maxFrames, startFrame, endFrame]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0];
      if (!nextFile) {
        return;
      }

      setError(null);
      setSheet((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }
        return null;
      });

      const url = URL.createObjectURL(nextFile);
      const image = new Image();

      image.onload = () => {
        if (!isMountedRef.current) {
          URL.revokeObjectURL(url);
          return;
        }
        setSheet({
          file: nextFile,
          image,
          url,
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
        setFrameWidth(image.naturalHeight || 64);
        setFrameHeight(image.naturalHeight || 64);
        setStartFrame(1);
        setEndFrame(null);
        setSelectedFrames(new Set());
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        if (!isMountedRef.current) {
          return;
        }
        setError('Unable to load the selected sprite sheet.');
      };

      image.src = url;
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!sheet) {
      setError('Select a sprite sheet image to continue.');
      return;
    }

    if (!columns || !rows) {
      setError('Frame dimensions do not fit within the sprite sheet.');
      return;
    }

    const targetEnd = endFrame ?? maxFrames;
    if (!hasManualSelection && startFrame > targetEnd) {
      setError('Start frame must be less than or equal to the end frame.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const frameNumbers = hasManualSelection
        ? Array.from(selectedFrames).sort((a, b) => a - b)
        : Array.from({ length: targetEnd - startFrame + 1 }, (_, offset) => startFrame + offset);

      const indexes = frameNumbers
        .map((frame) => frame - 1)
        .filter((index) => index >= 0 && index < maxFrames);

      if (!frameNumbers.length || !indexes.length) {
        setError('Select at least one frame to import.');
        return;
      }

      const frames = await sliceSpriteSheet(sheet, frameWidth, frameHeight, indexes, columns);
      if (!frames.length) {
        setError('No frames could be created from the provided settings.');
        return;
      }
      onImport(frames, { sourceName: sheet.file.name });
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : 'Import failed.';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [
    columns,
    endFrame,
    frameHeight,
    frameWidth,
    hasManualSelection,
    maxFrames,
    onImport,
    rows,
    selectedFrames,
    sheet,
    startFrame,
  ]);

  const handleToggleFrame = useCallback(
    (frameNumber: number) => {
      if (isProcessing) {
        return;
      }
      setSelectedFrames((current) => {
        const next = new Set(current);
        if (!next.size && defaultSelectedFrames.size) {
          defaultSelectedFrames.forEach((frame) => next.add(frame));
        }
        if (next.has(frameNumber)) {
          next.delete(frameNumber);
        } else {
          next.add(frameNumber);
        }
        return next;
      });
    },
    [defaultSelectedFrames, isProcessing]
  );

  const handleClearSelection = useCallback(() => {
    if (isProcessing) {
      return;
    }
    setSelectedFrames(new Set());
  }, [isProcessing]);

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true">
      <div className="sheet-modal">
        <div className="sheet-header">
          <h3>Import Sprite Sheet</h3>
          <p>Slice a single sprite sheet into multiple frames and add them to your timeline.</p>
        </div>
        <label className="sheet-file" aria-disabled={disabled}>
          <span>Sprite sheet image</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={disabled || isProcessing}
          />
        </label>
        {sheet ? (
          <div className="sheet-body">
            <div
              className="sheet-preview"
              role="group"
              aria-label={`Sprite sheet preview (${sheet.width} by ${sheet.height})`}
            >
              <div className="sheet-preview-frame">
                <img src={sheet.url} alt="Sprite sheet preview" />
                {columns && rows ? (
                  <div
                    className="sheet-cell-grid"
                    style={{
                      gridTemplateColumns: `repeat(${columns}, 1fr)`,
                      gridTemplateRows: `repeat(${rows}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: maxFrames }, (_, index) => {
                      const frameNumber = index + 1;
                      const isActive = hasManualSelection
                        ? selectedFrames.has(frameNumber)
                        : defaultSelectedFrames.has(frameNumber);
                      return (
                        <button
                          type="button"
                          key={frameNumber}
                          className={`sheet-cell${isActive ? ' is-active' : ''}`}
                          onClick={() => handleToggleFrame(frameNumber)}
                          aria-label={`Frame ${frameNumber}`}
                          aria-pressed={isActive}
                          disabled={isProcessing}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="sheet-form">
              <div className="sheet-grid">
                <label>
                  <span>Frame width</span>
                  <input
                    type="number"
                    min={1}
                    value={frameWidth}
                    onChange={(event) => setFrameWidth(Number(event.target.value))}
                    disabled={isProcessing}
                  />
                </label>
                <label>
                  <span>Frame height</span>
                  <input
                    type="number"
                    min={1}
                    value={frameHeight}
                    onChange={(event) => setFrameHeight(Number(event.target.value))}
                    disabled={isProcessing}
                  />
                </label>
                <label>
                  <span>Start frame</span>
                  <input
                    type="number"
                    min={1}
                    max={maxFrames || undefined}
                    value={startFrame}
                    onChange={(event) => setStartFrame(Number(event.target.value))}
                    disabled={isProcessing || !maxFrames}
                  />
                </label>
                <label>
                  <span>End frame</span>
                  <input
                    type="number"
                    min={startFrame}
                    max={maxFrames || undefined}
                    value={endFrame ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      setEndFrame(value ? Number(value) : null);
                    }}
                    placeholder={maxFrames ? String(maxFrames) : ''}
                    disabled={isProcessing || !maxFrames}
                  />
                </label>
              </div>
              <div className="sheet-manual-actions">
                <p>
                  Click frames in the preview to toggle manual selection. When frames are selected
                  manually, the start/end range is ignored.
                </p>
                {hasManualSelection ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={handleClearSelection}
                    disabled={isProcessing}
                  >
                    Clear manual selection
                  </button>
                ) : null}
              </div>
              <dl className="sheet-summary">
                <div>
                  <dt>Columns</dt>
                  <dd>{columns}</dd>
                </div>
                <div>
                  <dt>Rows</dt>
                  <dd>{rows}</dd>
                </div>
                <div>
                  <dt>Total frames</dt>
                  <dd>{maxFrames}</dd>
                </div>
                <div>
                  <dt>Selected</dt>
                  <dd>{selectionCount}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : null}
        {error ? <p className="sheet-error" role="alert">{error}</p> : null}
        <div className="sheet-actions">
          <button type="button" className="ghost" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={handleImport}
            disabled={disabled || isProcessing || !sheet}
          >
            Import frames
          </button>
        </div>
      </div>
    </div>
  );
};
