import { describe, expect, it } from 'vitest';

import { computeFit } from './fit-image';

describe('computeFit', () => {
  it('stretches when mode is stretch', () => {
    const box = computeFit(100, 50, 200, 100, 'stretch');
    expect(box).toEqual({ dx: 0, dy: 0, dw: 200, dh: 100 });
  });

  it('centres contained image preserving aspect ratio', () => {
    const box = computeFit(100, 50, 200, 200, 'contain');
    expect(box).toEqual({ dx: 0, dy: 50, dw: 200, dh: 100 });
  });

  it('fills frame when covering', () => {
    const box = computeFit(100, 50, 200, 200, 'cover');
    expect(box).toEqual({ dx: -100, dy: 0, dw: 400, dh: 200 });
  });

  it('returns finite measurements when source dimensions are invalid', () => {
    const box = computeFit(0, -10, 64, 48, 'contain');

    expect(box).toEqual({ dx: 0, dy: 0, dw: 64, dh: 48 });
    expect(Object.values(box).every((value) => Number.isFinite(value))).toBe(true);
  });
});
