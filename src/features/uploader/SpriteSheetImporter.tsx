import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';

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

interface WindowAiAssistantSession {
  prompt: (input: string) => Promise<unknown>;
  destroy?: () => Promise<void> | void;
}

interface WindowAiAssistant {
  create: (options?: { instructions?: string }) => Promise<WindowAiAssistantSession>;
}

interface WindowWithAi extends Window {
  ai?: {
    assistant?: WindowAiAssistant;
  };
}

interface AiSliceSuggestion {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  confidence?: number;
  notes?: string;
}

const getWindowAiAssistant = (): WindowAiAssistant | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const candidate = (window as WindowWithAi).ai?.assistant;
  if (candidate && typeof candidate.create === 'function') {
    return candidate;
  }
  return null;
};

const createPreviewDataUrl = (sheet: SheetData): string => {
  const maxSide = 256;
  const scale = Math.min(1, maxSide / Math.max(sheet.width, sheet.height));
  const width = Math.max(1, Math.round(sheet.width * scale));
  const height = Math.max(1, Math.round(sheet.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas rendering is not supported in this browser.');
  }
  context.clearRect(0, 0, width, height);
  context.drawImage(sheet.image, 0, 0, width, height);
  return canvas.toDataURL('image/png');
};

const extractAssistantText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (!value || typeof value !== 'object') {
    return '';
  }
  const record = value as Record<string, unknown>;
  const directKeys = ['text', 'output', 'message', 'response'];
  for (const key of directKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string') {
      return candidate;
    }
  }
  if (Array.isArray(record.choices)) {
    for (const choice of record.choices) {
      if (choice && typeof choice === 'object') {
        const choiceRecord = choice as Record<string, unknown>;
        if (typeof choiceRecord.text === 'string') {
          return choiceRecord.text;
        }
        const message = choiceRecord.message as Record<string, unknown> | undefined;
        if (message) {
          const parts = ['content', 'text'];
          for (const part of parts) {
            const candidate = message[part];
            if (typeof candidate === 'string') {
              return candidate;
            }
          }
        }
      }
    }
  }
  return JSON.stringify(value);
};

const parseAiSuggestion = (text: string, sheet: SheetData): AiSliceSuggestion => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not include JSON output.');
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Unable to parse AI response.');
  }

  const frameWidth = Number(parsed.frameWidth);
  const frameHeight = Number(parsed.frameHeight);

  if (!Number.isFinite(frameWidth) || frameWidth <= 0 || !Number.isFinite(frameHeight) || frameHeight <= 0) {
    throw new Error('AI suggestion returned invalid frame dimensions.');
  }

  const fallbackColumns = Math.max(1, Math.floor(sheet.width / frameWidth));
  const fallbackRows = Math.max(1, Math.floor(sheet.height / frameHeight));
  const columnsRaw = Number(parsed.columns);
  const rowsRaw = Number(parsed.rows);
  const columns = Number.isFinite(columnsRaw) && columnsRaw > 0 ? Math.round(columnsRaw) : fallbackColumns;
  const rows = Number.isFinite(rowsRaw) && rowsRaw > 0 ? Math.round(rowsRaw) : fallbackRows;

  if (!columns || !rows) {
    throw new Error('AI suggestion did not provide a usable grid.');
  }

  const confidenceRaw = Number(parsed.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.min(1, Math.max(0, confidenceRaw))
    : undefined;

  const notes = typeof parsed.notes === 'string' ? parsed.notes : undefined;

  return {
    frameWidth,
    frameHeight,
    columns,
    rows,
    confidence,
    notes,
  };
};

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

const ACCEPTED_SHEET_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

const SHEET_EXTENSION_PATTERN = /\.(png|jpe?g|webp|gif)$/i;

const BASIC_SPRITE_CONFIG = {
  frameWidth: 64,
  frameHeight: 64,
  columns: 2,
  rows: 2,
  name: 'basic-sprite-sheet.png',
};

const BASIC_SPRITE_COLOURS = ['#f97316', '#22d3ee', '#a855f7', '#facc15'];

const createBasicSpriteSheetFile = async (): Promise<File> => {
  if (typeof document === 'undefined') {
    throw new Error('Document is not available in this environment.');
  }
  const { frameWidth, frameHeight, columns, rows, name } = BASIC_SPRITE_CONFIG;
  const width = frameWidth * columns;
  const height = frameHeight * rows;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas rendering is not supported in this browser.');
  }
  context.clearRect(0, 0, width, height);

  let colourIndex = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const colour = BASIC_SPRITE_COLOURS[colourIndex % BASIC_SPRITE_COLOURS.length];
      const x = column * frameWidth;
      const y = row * frameHeight;
      context.fillStyle = colour;
      context.fillRect(x, y, frameWidth, frameHeight);
      context.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      context.lineWidth = 6;
      context.strokeRect(x + 3, y + 3, frameWidth - 6, frameHeight - 6);
      context.fillStyle = 'rgba(15, 23, 42, 0.35)';
      context.fillRect(x, y + frameHeight - 12, frameWidth, 12);
      context.fillStyle = 'rgba(255, 255, 255, 0.75)';
      context.font = 'bold 24px system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(colourIndex + 1), x + frameWidth / 2, y + frameHeight / 2);
      colourIndex += 1;
    }
  }

  const blob = await toBlob(canvas);
  return new File([blob], name, { type: 'image/png' });
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
  const hasLoadedDefaultRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [frameWidth, setFrameWidth] = useState(64);
  const [frameHeight, setFrameHeight] = useState(64);
  const [startFrame, setStartFrame] = useState(1);
  const [endFrame, setEndFrame] = useState<number | null>(null);
  const [selectedFrames, setSelectedFrames] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAiSupport, setHasAiSupport] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSliceSuggestion | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setHasAiSupport(Boolean(getWindowAiAssistant()));
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

  useEffect(() => {
    setAiSuggestion(null);
    setAiError(null);
  }, [sheet?.url]);

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
  const aiIsDisabled = disabled || isProcessing || isAiProcessing;

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

  const loadSheetFile = useCallback(
    (file: File, options?: { frameWidth?: number; frameHeight?: number; endFrame?: number }) => {
      const isSupportedType =
        ACCEPTED_SHEET_TYPES.has(file.type) || SHEET_EXTENSION_PATTERN.test(file.name);
      if (!isSupportedType) {
        setError('Unsupported file type. Choose a PNG, JPG, WEBP, or GIF sprite sheet.');
        setAiSuggestion(null);
        setAiError(null);
        return;
      }

      setError(null);
      setAiSuggestion(null);
      setAiError(null);
      setSelectedFrames(new Set());
      setSheet((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }
        return null;
      });

      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;

      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        if (!isMountedRef.current || loadRequestIdRef.current !== requestId) {
          URL.revokeObjectURL(url);
          return;
        }
        setSheet({
          file,
          image,
          url,
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
        setFrameWidth(options?.frameWidth ?? (image.naturalWidth || 64));
        setFrameHeight(options?.frameHeight ?? (image.naturalHeight || 64));
        setStartFrame(1);
        setEndFrame(options?.endFrame ?? null);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        if (!isMountedRef.current || loadRequestIdRef.current !== requestId) {
          return;
        }
        setError('Unable to load the selected sprite sheet.');
      };

      image.src = url;
    },
    []
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0];
      if (nextFile) {
        loadSheetFile(nextFile);
      }
      event.target.value = '';
    },
    [loadSheetFile]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      setIsDragActive(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        loadSheetFile(file);
      }
    },
    [disabled, loadSheetFile]
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsDragActive(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return;
    }
    setIsDragActive(false);
  }, []);

  useEffect(() => {
    if (hasLoadedDefaultRef.current || sheet) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    hasLoadedDefaultRef.current = true;
    let isCancelled = false;
    const loadDefault = async () => {
      try {
        const file = await createBasicSpriteSheetFile();
        if (isCancelled) {
          return;
        }
        loadSheetFile(file, {
          frameWidth: BASIC_SPRITE_CONFIG.frameWidth,
          frameHeight: BASIC_SPRITE_CONFIG.frameHeight,
          endFrame: BASIC_SPRITE_CONFIG.columns * BASIC_SPRITE_CONFIG.rows,
        });
      } catch (defaultError) {
        console.warn('Failed to load default sprite sheet', defaultError);
      }
    };
    loadDefault();
    return () => {
      isCancelled = true;
    };
  }, [loadSheetFile, sheet]);

  const handleAiAssist = useCallback(async () => {
    if (!sheet) {
      setAiError('Load a sprite sheet to request AI assistance.');
      return;
    }
    const assistant = getWindowAiAssistant();
    if (!assistant) {
      setAiError('AI assistance is not available in this browser.');
      setHasAiSupport(false);
      return;
    }

    let session: WindowAiAssistantSession | null = null;
    setIsAiProcessing(true);
    setAiError(null);
    try {
      const preview = createPreviewDataUrl(sheet);
      session = await assistant.create({
        instructions:
          'You help identify sprite sheet slicing dimensions. Always respond with JSON containing frameWidth, frameHeight, columns, rows, confidence (0-1), and notes.',
      });
      const response = await session.prompt(
        [
          'Analyse this sprite sheet and suggest how to slice it into even frames.',
          'Return ONLY JSON using the keys frameWidth, frameHeight, columns, rows, confidence, and notes.',
          `Sheet width: ${sheet.width}`,
          `Sheet height: ${sheet.height}`,
          `Sprite sheet preview (data URL): ${preview}`,
        ].join('\n')
      );
      const text = extractAssistantText(response).trim();
      if (!text) {
        throw new Error('AI response was empty.');
      }
      const suggestion = parseAiSuggestion(text, sheet);
      setAiSuggestion(suggestion);
    } catch (assistantError) {
      const message =
        assistantError instanceof Error
          ? assistantError.message
          : 'Unable to retrieve AI suggestion. Try again.';
      setAiError(message);
    } finally {
      setIsAiProcessing(false);
      try {
        if (session?.destroy) {
          await session.destroy();
        }
      } catch (cleanupError) {
        console.warn('Failed to close AI session', cleanupError);
      }
    }
  }, [sheet]);

  const handleApplySuggestion = useCallback(
    (suggestion: AiSliceSuggestion) => {
      if (isProcessing) {
        return;
      }
      setFrameWidth(suggestion.frameWidth);
      setFrameHeight(suggestion.frameHeight);
      setStartFrame(1);
      setEndFrame(suggestion.columns * suggestion.rows || null);
      setSelectedFrames(new Set());
      setAiError(null);
    },
    [isProcessing]
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
        <label
          className={`sheet-file${disabled ? ' is-disabled' : ''}${isDragActive ? ' is-dragging' : ''}`}
          aria-disabled={disabled}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
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
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
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
              <div className={`sheet-ai${hasAiSupport ? '' : ' is-disabled'}`}>
                <div>
                  <strong>AI slice assist</strong>
                  <p>
                    Ask a compatible browser AI model to suggest frame dimensions for the current
                    sprite sheet.
                  </p>
                </div>
                {hasAiSupport ? (
                  <>
                    <button
                      type="button"
                      className="ghost"
                      onClick={handleAiAssist}
                      disabled={aiIsDisabled}
                    >
                      {isAiProcessing ? 'Requesting suggestion…' : 'Ask AI for suggestion'}
                    </button>
                    {aiSuggestion ? (
                      <div className="sheet-ai-suggestion">
                        <dl>
                          <div>
                            <dt>Frame width</dt>
                            <dd>{aiSuggestion.frameWidth}</dd>
                          </div>
                          <div>
                            <dt>Frame height</dt>
                            <dd>{aiSuggestion.frameHeight}</dd>
                          </div>
                          <div>
                            <dt>Columns</dt>
                            <dd>{aiSuggestion.columns}</dd>
                          </div>
                          <div>
                            <dt>Rows</dt>
                            <dd>{aiSuggestion.rows}</dd>
                          </div>
                          <div>
                            <dt>Confidence</dt>
                            <dd>
                              {aiSuggestion.confidence !== undefined
                                ? `${Math.round(aiSuggestion.confidence * 100)}%`
                                : '—'}
                            </dd>
                          </div>
                        </dl>
                        {aiSuggestion.notes ? (
                          <p className="sheet-ai-notes">{aiSuggestion.notes}</p>
                        ) : null}
                        <div className="sheet-ai-actions">
                          <button
                            type="button"
                            className="primary-action"
                            onClick={() => handleApplySuggestion(aiSuggestion)}
                            disabled={aiIsDisabled}
                          >
                            Apply suggestion
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => setAiSuggestion(null)}
                            disabled={isAiProcessing}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {aiError ? (
                      <p className="sheet-ai-message is-error" role="status">
                        {aiError}
                      </p>
                    ) : (
                      <p className="sheet-ai-message">
                        Suggestions are generated locally through the experimental Web AI API.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="sheet-ai-message">
                    AI assistance requires a browser that exposes the Web AI API. You can still
                    configure slices manually.
                  </p>
                )}
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
