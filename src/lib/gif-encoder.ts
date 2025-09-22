import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import type { ExportSettings, FrameAsset, PlaybackSettings } from '../types';
import { computeFit } from './fit-image';

interface EncodeOptions {
  frames: FrameAsset[];
  playback: PlaybackSettings;
  exportSettings: ExportSettings;
}

const ensureContext = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to acquire 2D canvas context');
  }
  return context;
};

const drawFrameToCanvas = async (
  canvas: HTMLCanvasElement,
  frame: FrameAsset,
  settings: ExportSettings
) => {
  const context = ensureContext(canvas);
  canvas.width = settings.width;
  canvas.height = settings.height;
  context.fillStyle = settings.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const bitmap = await createImageBitmap(frame.file);
  const { dx, dy, dw, dh } = computeFit(
    bitmap.width,
    bitmap.height,
    canvas.width,
    canvas.height,
    settings.fitMode
  );
  context.drawImage(bitmap, dx, dy, dw, dh);

  return context.getImageData(0, 0, canvas.width, canvas.height);
};

export const encodeGif = async ({
  frames,
  playback,
  exportSettings,
}: EncodeOptions): Promise<Blob> => {
  if (!frames.length) {
    throw new Error('At least one frame is required to encode a GIF');
  }

  const canvas = document.createElement('canvas');
  const encoder = GIFEncoder();

  for (const frame of frames) {
    const imageData = await drawFrameToCanvas(canvas, frame, exportSettings);
    const palette = quantize(imageData.data, 256, { format: 'rgba4444' });
    const index = applyPalette(imageData.data, palette, 'rgba4444');

    encoder.writeFrame(index, imageData.width, imageData.height, {
      palette,
      delay: Math.max(20, playback.delay),
      repeat: playback.loop ? 0 : -1,
    });
  }

  encoder.finish();
  const bytes = encoder.bytes();
  const output = new Uint8Array(bytes.byteLength);
  output.set(bytes);
  return new Blob([output], { type: 'image/gif' });
};
