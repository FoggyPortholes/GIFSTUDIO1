import { GIFEncoder, applyPalette, quantize } from 'gifenc';

export interface GifFrame {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  delayMs: number;
}

export interface GifOptions {
  loop: boolean;
}

function assertFrame(frame: GifFrame) {
  if (frame.rgba.length !== frame.width * frame.height * 4) {
    throw new Error('Frame data does not match width and height.');
  }
}

export function makeGif(frames: GifFrame[], options: GifOptions): Uint8Array {
  if (!frames.length) {
    throw new Error('Cannot build GIF without frames.');
  }

  frames.forEach(assertFrame);

  const encoder = GIFEncoder();
  const repeat = options.loop ? 0 : -1;

  frames.forEach((frame) => {
    const palette = quantize(frame.rgba, 256);
    const indexed = applyPalette(frame.rgba, palette);

    encoder.writeFrame(indexed, frame.width, frame.height, {
      palette,
      delay: Math.max(2, Math.round(frame.delayMs / 10)),
      repeat,
    });
  });

  encoder.finish();
  const bytes = encoder.bytesView();
  return bytes.slice();
}