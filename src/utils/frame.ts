import { Frame, Layer, PixelColor } from '../types';

export function blankPixels(width: number, height: number, fill: PixelColor = null): PixelColor[] {
  return Array.from({ length: width * height }, () => fill);
}

export function clonePixels(pixels: PixelColor[]): PixelColor[] {
  return pixels.slice();
}

export function cloneLayer(layer: Layer, opts: { preservePixels?: boolean } = {}): Layer {
  const { preservePixels = false } = opts;
  return {
    ...layer,
    pixels: preservePixels ? clonePixels(layer.pixels) : blankPixelsFromLayer(layer),
  };
}

function blankPixelsFromLayer(layer: Layer): PixelColor[] {
  return Array.from({ length: layer.pixels.length }, () => null);
}

export function cloneFrame(frame: Frame, opts: { preservePixels?: boolean } = {}): Frame {
  const { preservePixels = false } = opts;
  return {
    ...frame,
    layers: frame.layers.map((layer) =>
      layer.locked
        ? { ...layer, pixels: clonePixels(layer.pixels) }
        : cloneLayer(layer, { preservePixels })
    ),
  };
}

export function composeFrame(frame: Frame, width: number, height: number): PixelColor[] {
  const total = width * height;
  const result: PixelColor[] = Array.from({ length: total }, () => null);

  frame.layers.forEach((layer) => {
    if (!layer.visible) return;
    for (let i = 0; i < total; i += 1) {
      const color = layer.pixels[i];
      if (color) {
        result[i] = color;
      }
    }
  });

  return result;
}

export function pixelIndex(x: number, y: number, width: number) {
  return y * width + x;
}

export function colorAt(frame: Frame, width: number, x: number, y: number): PixelColor {
  const index = pixelIndex(x, y, width);
  for (let i = frame.layers.length - 1; i >= 0; i -= 1) {
    const layer = frame.layers[i];
    if (!layer.visible && !layer.locked) continue;
    const value = layer.pixels[index];
    if (value) return value;
  }
  return null;
}
