import { GIFEncoder, applyPalette, quantize } from 'gifenc';

type Frame = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  delay: number;
};

type Listener = (payload?: unknown) => void;

type Options = {
  workers?: number;
  quality?: number;
  repeat?: number;
  transparent?: string | null;
  workerScript?: string;
};

type FrameOptions = {
  delay?: number;
};

export default class GIF {
  private frames: Frame[] = [];
  private listeners: Record<string, Listener[]> = {};
  private options: Options;
  private aborted = false;

  constructor(options: Options = {}) {
    this.options = options;
  }

  addFrame(canvas: HTMLCanvasElement, opts: FrameOptions = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.frames.push({
      data: new Uint8ClampedArray(data),
      width,
      height,
      delay: opts.delay ?? 0,
    });
  }

  on(event: 'finished' | 'abort' | 'error', handler: Listener) {
    this.listeners[event] = this.listeners[event] ?? [];
    this.listeners[event].push(handler);
  }

  abort() {
    this.aborted = true;
    this.emit('abort');
  }

  render() {
    if (this.aborted) return;
    try {
      const encoder = GIFEncoder();
      this.frames.forEach((frame, index) => {
        const palette = quantize(frame.data, 256);
        const indices = applyPalette(frame.data, palette);
        const frameOptions: Record<string, unknown> = {
          delay: frame.delay,
          palette,
        };
        if (index === 0 && this.options.repeat !== undefined) {
          frameOptions.repeat = this.options.repeat;
        }
        if (this.options.transparent) {
          frameOptions.transparent = this.options.transparent;
        }
        encoder.writeFrame(indices, frame.width, frame.height, frameOptions);
      });
      encoder.finish();
      const bytes = new Uint8Array(encoder.bytesView());
      const blob = new Blob([bytes], { type: 'image/gif' });
      this.emit('finished', blob);
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private emit(event: 'finished' | 'abort' | 'error', payload?: unknown) {
    const handlers = this.listeners[event];
    if (!handlers?.length) return;
    handlers.forEach((handler) => handler(payload));
  }
}
