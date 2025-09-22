import type { FrameAsset } from '../types';
import { createId } from './id';

export interface CharacterSheetLayout {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  totalFrames: number;
  score: number;
  label: string;
}

interface CandidateLayout {
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  score: number;
  label: string;
}

const PREFERRED_LAYOUTS: Array<{ columns: number; rows: number; label: string }> = [
  { columns: 3, rows: 4, label: 'RPG Maker (3×4)' },
  { columns: 4, rows: 4, label: 'Square grid (4×4)' },
  { columns: 6, rows: 4, label: 'Wide walk cycle (6×4)' },
  { columns: 4, rows: 2, label: 'Side scroller (4×2)' },
  { columns: 8, rows: 4, label: 'Large atlas (8×4)' },
];

const MAX_GRID_SIZE = 12;

const computeScore = (columns: number, rows: number, frameWidth: number, frameHeight: number) => {
  const totalFrames = columns * rows;
  const aspect = frameWidth / frameHeight;
  const aspectPenalty = Math.abs(Math.log(aspect));
  let score = aspectPenalty;

  if (totalFrames < 4) {
    score += (4 - totalFrames) * 0.85;
  }

  if (totalFrames > 64) {
    score += (totalFrames - 64) / 24;
  }

  if (frameWidth < 8 || frameHeight < 8) {
    score += 1;
  }

  return score;
};

export const inferCharacterSheetLayout = (
  width: number,
  height: number,
): CharacterSheetLayout | null => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const candidates: CandidateLayout[] = [];

  for (const preferred of PREFERRED_LAYOUTS) {
    if (width % preferred.columns === 0 && height % preferred.rows === 0) {
      const frameWidth = width / preferred.columns;
      const frameHeight = height / preferred.rows;
      const score = computeScore(preferred.columns, preferred.rows, frameWidth, frameHeight) - 0.6;
      candidates.push({
        columns: preferred.columns,
        rows: preferred.rows,
        frameWidth,
        frameHeight,
        score,
        label: preferred.label,
      });
    }
  }

  for (let columns = 1; columns <= MAX_GRID_SIZE; columns += 1) {
    if (width % columns !== 0) {
      continue;
    }
    for (let rows = 1; rows <= MAX_GRID_SIZE; rows += 1) {
      if (height % rows !== 0) {
        continue;
      }

      const frameWidth = width / columns;
      const frameHeight = height / rows;

      const existing = candidates.find(
        (candidate) => candidate.columns === columns && candidate.rows === rows,
      );
      if (existing) {
        continue;
      }

      const score = computeScore(columns, rows, frameWidth, frameHeight);
      candidates.push({
        columns,
        rows,
        frameWidth,
        frameHeight,
        score,
        label: `${columns}×${rows} grid`,
      });
    }
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];

  return {
    frameWidth: best.frameWidth,
    frameHeight: best.frameHeight,
    columns: best.columns,
    rows: best.rows,
    totalFrames: best.columns * best.rows,
    score: best.score,
    label: best.label,
  };
};

export const sliceCharacterSheet = async (
  image: HTMLImageElement,
  file: File,
  layout: CharacterSheetLayout,
): Promise<FrameAsset[]> => {
  const { frameWidth, frameHeight, columns, rows } = layout;
  const canvas = document.createElement('canvas');
  canvas.width = frameWidth;
  canvas.height = frameHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas rendering is not supported in this browser.');
  }

  const frames: FrameAsset[] = [];
  const baseName = file.name.replace(/\.[^./]+$/, '') || 'character';
  const total = columns * rows;

  for (let index = 0; index < total; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const sourceX = column * frameWidth;
    const sourceY = row * frameHeight;

    context.clearRect(0, 0, frameWidth, frameHeight);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (!value) {
          reject(new Error('Unable to create frame from character sprite sheet.'));
          return;
        }
        resolve(value);
      }, 'image/png');
    });

    const frameFile = new File([blob], `${baseName}-${String(index + 1).padStart(3, '0')}.png`, {
      type: 'image/png',
    });
    const url = URL.createObjectURL(blob);
    frames.push({
      id: createId(),
      name: frameFile.name,
      url,
      width: frameWidth,
      height: frameHeight,
      file: frameFile,
    });
  }

  return frames;
};
