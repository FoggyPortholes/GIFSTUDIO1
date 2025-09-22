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
  startFrame: number,
  endFrame: number,
  columns: number
): Promise<FrameAsset[]> => {
  const canvas = document.createElement('canvas');
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas rendering is not supported in this browser.');
  }

  const frames: FrameAsset[] = [];
  const baseName = getBaseName(sheet.file.name) || 'sprite';

  for (let index = startFrame - 1; index < endFrame; index += 1) {
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
    if (startFrame > targetEnd) {
      setError('Start frame must be less than or equal to the end frame.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const frames = await sliceSpriteSheet(sheet, frameWidth, frameHeight, startFrame, targetEnd, columns);
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
  }, [columns, endFrame, frameHeight, frameWidth, maxFrames, onImport, rows, sheet, startFrame]);

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
            <div className="sheet-preview" role="img" aria-label={`Sprite sheet preview (${sheet.width} by ${sheet.height})`}>
              <img src={sheet.url} alt="Sprite sheet preview" />
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
