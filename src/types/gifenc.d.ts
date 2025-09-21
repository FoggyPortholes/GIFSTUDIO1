declare module 'gifenc' {
  export interface EncodeOptions {
    palette: Uint8Array;
    delay?: number;
    repeat?: number;
  }

  export interface GIFEncoderInstance {
    writeFrame(indexedPixels: Uint8Array, width: number, height: number, options: EncodeOptions): void;
    finish(): ArrayBuffer;
    bytesView(): Uint8Array;
  }

  export function GIFEncoder(): GIFEncoderInstance;
  export function quantize(rgba: Uint8ClampedArray, maxColors: number): Uint8Array;
  export function applyPalette(rgba: Uint8ClampedArray, palette: Uint8Array): Uint8Array;
}
