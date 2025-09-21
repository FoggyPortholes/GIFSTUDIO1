import GIF from './vendor/gif/gif.js';

export interface GifFrame {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  delayMs: number;
}

export interface EncodeOptions {
  loop?: number;           // -1 = forever, 0 = infinite, N = repeat count
  workers?: number;        // web workers for parallel encode
  quality?: number;        // 1 (best) .. 30 (fast)
  transparentHex?: string; // hex color for transparency
}

export interface EncodeResult {
  bytes: Uint8Array;
}

export async function encodeGif(
  frames: GifFrame[],
  opts: EncodeOptions = {}
): Promise<EncodeResult> {
  const gif = new GIF({
    workers: opts.workers ?? 2,
    quality: opts.quality ?? 10,
    repeat: opts.loop ?? 0,
    transparent: opts.transparentHex ?? null,
    workerScript: new URL('./vendor/gif/gif.worker.js', import.meta.url).toString(),
  });

  for (const f of frames) {
    const canvas = document.createElement('canvas');
    canvas.width = f.width;
    canvas.height = f.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(f.rgba), f.width, f.height), 0, 0);
    gif.addFrame(canvas, { delay: f.delayMs });
  }

  return new Promise((resolve, reject) => {
    gif.on('finished', (blob: Blob) => {
      blob.arrayBuffer().then(buf => resolve({ bytes: new Uint8Array(buf) }));
    });
    gif.on('abort', () => reject(new Error('GIF encode aborted')));
    gif.on('error', (e: any) => reject(e));
    gif.render();
  });
}
