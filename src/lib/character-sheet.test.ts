import { describe, expect, it } from 'vitest';

import { inferCharacterSheetLayout } from './character-sheet';

describe('inferCharacterSheetLayout', () => {
  it('detects a 3x4 RPG Maker style sheet', () => {
    const layout = inferCharacterSheetLayout(192, 256);
    expect(layout).toEqual(
      expect.objectContaining({
        columns: 3,
        rows: 4,
        frameWidth: 64,
        frameHeight: 64,
      }),
    );
  });

  it('detects a 4x4 square grid', () => {
    const layout = inferCharacterSheetLayout(256, 256);
    expect(layout).toEqual(
      expect.objectContaining({
        columns: 4,
        rows: 4,
        frameWidth: 64,
        frameHeight: 64,
      }),
    );
  });

  it('prefers wider walk cycles when ratios match', () => {
    const layout = inferCharacterSheetLayout(384, 256);
    expect(layout).toEqual(
      expect.objectContaining({
        columns: 6,
        rows: 4,
        frameWidth: 64,
        frameHeight: 64,
      }),
    );
  });

  it('falls back to the best evenly divisible grid', () => {
    const layout = inferCharacterSheetLayout(150, 200);
    expect(layout).not.toBeNull();
    expect(layout?.columns).toBeGreaterThan(1);
    expect(layout?.rows).toBeGreaterThan(1);
    expect((layout?.columns ?? 0) * (layout?.frameWidth ?? 0)).toBe(150);
    expect((layout?.rows ?? 0) * (layout?.frameHeight ?? 0)).toBe(200);
  });

  it('returns null for invalid dimensions', () => {
    expect(inferCharacterSheetLayout(-10, 0)).toBeNull();
  });
});
