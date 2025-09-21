import type { GifFrame } from './encoder-gifjs';

export type RGB = { r: number; g: number; b: number };
export type Palette = RGB[];

export function paletteFromImage(img: HTMLImageElement, max = 256): Palette {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const seen = new Map<string, RGB>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = `${r},${g},${b}`;
    if (!seen.has(key)) {
      seen.set(key, { r, g, b });
      if (seen.size >= max) break;
    }
  }
  return Array.from(seen.values());
}

export function exportGpl(name: string, colors: Palette): string {
  const header = `GIMP Palette\nName: ${name}\nColumns: 16\n#`;
  const body = colors.map(c => `${c.r} ${c.g} ${c.b}`).join('\n');
  return `${header}\n${body}\n`;
}

export function ensureFirstFrameHasPalette(frames: GifFrame[], palette: Palette): GifFrame[] {
  // Stub: quantize/dither first frame to enforce palette if needed
  return frames;
}
