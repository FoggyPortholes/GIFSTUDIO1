import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { CharacterModel, Frame, PixelColor } from '../types';
import { composeFrame } from '../utils/frame';
import { hexToRgba } from '../utils/color';
import { logInfo, setLastGif } from './logger';

function pixelsToRgba(pixels: PixelColor[], width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 1) {
    const base = i * 4;
    const color = pixels[i];
    if (!color) {
      data[base + 3] = 0;
      continue;
    }
    const [r, g, b, a] = hexToRgba(color);
    data[base] = r;
    data[base + 1] = g;
    data[base + 2] = b;
    data[base + 3] = a;
  }
  return data;
}

function drawToCanvas(canvas: HTMLCanvasElement, pixels: PixelColor[], width: number, height: number, scale = 1) {
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(pixelsToRgba(pixels, width, height));
  ctx.putImageData(imageData, 0, 0);
  if (scale !== 1) {
    const scaled = document.createElement('canvas');
    scaled.width = canvas.width;
    scaled.height = canvas.height;
    const sctx = scaled.getContext('2d');
    if (!sctx) throw new Error('Canvas 2D context unavailable');
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(scaled, 0, 0);
  }
}

export async function exportFrameAsDataUrl(character: CharacterModel, frame: Frame): Promise<string> {
  const canvas = document.createElement('canvas');
  const pixels = composeFrame(frame, character.width, character.height);
  drawToCanvas(canvas, pixels, character.width, character.height, 1);
  return canvas.toDataURL('image/png');
}

export async function exportAnimationGif(character: CharacterModel): Promise<string> {
  const width = character.width;
  const height = character.height;
  const encoder = GIFEncoder();
  const { writeFrame, finish } = encoder;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  character.frames.forEach((frame, index) => {
    const pixels = composeFrame(frame, width, height);
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixelsToRgba(pixels, width, height));
    ctx.putImageData(imageData, 0, 0);
    const frameData = ctx.getImageData(0, 0, width, height);
    const palette = quantize(frameData.data, 256);
    const indexData = applyPalette(frameData.data, palette);
    const options = index === 0 ? { palette, delay: frame.duration, repeat: 0 } : { palette, delay: frame.duration };
    writeFrame(indexData, width, height, options);
  });

  const buffer = finish();
  const u8 = new Uint8Array(buffer);
  setLastGif(u8);
  logInfo('Exported animation', {
    characterId: character.id,
    frames: character.frames.length,
    bytes: u8.byteLength,
    width,
    height,
  });
  const blob = new Blob([u8], { type: 'image/gif' });
  return URL.createObjectURL(blob);
}
