import type { FitMode } from '../types';

export interface FitBox {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export const computeFit = (
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
  mode: FitMode
): FitBox => {
  if (mode === 'stretch') {
    return {
      dx: 0,
      dy: 0,
      dw: dstWidth,
      dh: dstHeight,
    };
  }

  const scale = mode === 'contain'
    ? Math.min(dstWidth / srcWidth, dstHeight / srcHeight)
    : Math.max(dstWidth / srcWidth, dstHeight / srcHeight);

  const dw = srcWidth * scale;
  const dh = srcHeight * scale;
  const dx = (dstWidth - dw) / 2;
  const dy = (dstHeight - dh) / 2;

  return { dx, dy, dw, dh };
};
