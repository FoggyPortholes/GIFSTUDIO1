import type { FitMode, FrameAsset } from '../types';
import { computeFit } from './fit-image';

export interface SpriteTemplate {
  name?: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  spacing: number;
  margin: number;
  background: string;
  fitMode: FitMode;
}

export interface LoadedSpriteTemplate extends SpriteTemplate {
  sourceName: string;
}

const getValue = (source: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }
  return undefined;
};

const clampPositiveInteger = (value: unknown, key: string, max = 4096) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`Template ${key} must be a positive number.`);
  }
  return Math.min(max, Math.round(numeric));
};

const clampCount = (value: unknown, key: string) => clampPositiveInteger(value, key, 512);

const clampNonNegative = (value: unknown, key: string, max = 1024) => {
  if (value === undefined) {
    return 0;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`Template ${key} must be zero or greater.`);
  }
  return Math.min(max, Math.round(numeric));
};

const parseFitMode = (value: unknown, fallback: FitMode): FitMode => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'contain' || normalized === 'cover' || normalized === 'stretch') {
      return normalized;
    }
  }
  return fallback;
};

const parseBackground = (value: unknown) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return 'transparent';
};

const parseName = (value: unknown) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
};

export const parseSpriteTemplate = (input: unknown): SpriteTemplate => {
  if (!input || typeof input !== 'object') {
    throw new Error('Sprite template must be a JSON object.');
  }

  const source = input as Record<string, unknown>;

  const frameWidthValue = getValue(source, ['frameWidth', 'tileWidth', 'cellWidth']);
  const frameHeightValue = getValue(source, ['frameHeight', 'tileHeight', 'cellHeight']);
  const columnsValue = getValue(source, ['columns', 'cols']);
  const rowsValue = getValue(source, ['rows']);

  if (frameWidthValue === undefined) {
    throw new Error('Template is missing a frameWidth value.');
  }
  if (frameHeightValue === undefined) {
    throw new Error('Template is missing a frameHeight value.');
  }
  if (columnsValue === undefined) {
    throw new Error('Template is missing a columns value.');
  }
  if (rowsValue === undefined) {
    throw new Error('Template is missing a rows value.');
  }

  const frameWidth = clampPositiveInteger(frameWidthValue, 'frameWidth');
  const frameHeight = clampPositiveInteger(frameHeightValue, 'frameHeight');
  const columns = clampCount(columnsValue, 'columns');
  const rows = clampCount(rowsValue, 'rows');

  const spacingValue = getValue(source, ['spacing', 'gap', 'gutter']);
  const marginValue = getValue(source, ['margin', 'padding']);
  const backgroundValue = getValue(source, ['background', 'backgroundColor']);
  const fitModeValue = getValue(source, ['fitMode', 'fit']);
  const nameValue = getValue(source, ['name', 'template', 'id']);

  return {
    name: parseName(nameValue),
    frameWidth,
    frameHeight,
    columns,
    rows,
    spacing: clampNonNegative(spacingValue, 'spacing'),
    margin: clampNonNegative(marginValue, 'margin'),
    background: parseBackground(backgroundValue),
    fitMode: parseFitMode(fitModeValue, 'contain'),
  };
};

export const loadSpriteTemplateFile = async (file: File): Promise<LoadedSpriteTemplate> => {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Template file must contain valid JSON.');
  }

  const template = parseSpriteTemplate(data);
  const baseName = file.name.replace(/\.[^./]+$/, '');

  const resolvedName = template.name ?? (baseName ? baseName : undefined);

  return {
    ...template,
    name: resolvedName,
    sourceName: file.name,
  };
};

export const computeSpriteSheetSize = (template: SpriteTemplate) => {
  const width =
    template.columns * template.frameWidth +
    template.spacing * Math.max(0, template.columns - 1) +
    template.margin * 2;
  const height =
    template.rows * template.frameHeight +
    template.spacing * Math.max(0, template.rows - 1) +
    template.margin * 2;
  const capacity = template.columns * template.rows;

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    capacity,
  };
};

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to create sprite sheet image.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });

const drawFrame = async (
  context: CanvasRenderingContext2D,
  frame: FrameAsset,
  x: number,
  y: number,
  width: number,
  height: number,
  fitMode: FitMode
) => {
  const bitmap = await createImageBitmap(frame.file);
  try {
    if (fitMode === 'stretch') {
      context.drawImage(bitmap, x, y, width, height);
      return;
    }
    const { dx, dy, dw, dh } = computeFit(bitmap.width, bitmap.height, width, height, fitMode);
    context.drawImage(bitmap, x + dx, y + dy, dw, dh);
  } finally {
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
};

export const createSpriteSheet = async (
  frames: FrameAsset[],
  template: SpriteTemplate
): Promise<Blob> => {
  if (!frames.length) {
    throw new Error('Add frames to your timeline before creating a sprite sheet.');
  }

  const { width, height, capacity } = computeSpriteSheetSize(template);

  if (!capacity) {
    throw new Error('Template must define at least one cell.');
  }

  if (frames.length > capacity) {
    const overflow = frames.length - capacity;
    throw new Error(
      `Template can only fit ${capacity} frame${capacity === 1 ? '' : 's'}. Remove ${overflow} frame${
        overflow === 1 ? '' : 's'
      } or choose a larger template.`
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas rendering is not supported in this browser.');
  }

  if (template.background && template.background !== 'transparent') {
    context.fillStyle = template.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  const cellWidth = template.frameWidth;
  const cellHeight = template.frameHeight;
  const spacing = template.spacing;
  const margin = template.margin;

  for (let index = 0; index < frames.length; index += 1) {
    const column = index % template.columns;
    const row = Math.floor(index / template.columns);
    const x = margin + column * (cellWidth + spacing);
    const y = margin + row * (cellHeight + spacing);
    await drawFrame(context, frames[index], x, y, cellWidth, cellHeight, template.fitMode);
  }

  return toBlob(canvas);
};
