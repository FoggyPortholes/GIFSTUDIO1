declare module 'gifenc' {
  export type Palette = Array<[number, number, number] | [number, number, number, number]>;

  export interface FrameOptions {
    palette?: Palette;
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
  }

  export interface GIFEncoderStream {
    writeFrame(index: Uint8Array, width: number, height: number, options?: FrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    reset(): void;
  }

  export interface EncoderOptions {
    auto?: boolean;
    initialCapacity?: number;
  }

  export function GIFEncoder(options?: EncoderOptions): GIFEncoderStream;

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: {
      format?: 'rgb565' | 'rgb444' | 'rgba4444';
      oneBitAlpha?: boolean | number;
      clearAlpha?: boolean;
      clearAlphaThreshold?: number;
      clearAlphaColor?: number;
    }
  ): Palette;

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: 'rgb565' | 'rgb444' | 'rgba4444'
  ): Uint8Array;
}
