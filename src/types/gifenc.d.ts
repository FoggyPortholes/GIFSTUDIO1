declare module 'gifenc' {
  export function GIFEncoder(): any;
  export function quantize(data: Uint8ClampedArray | Uint8Array, maxColors: number): Uint8Array;
  export function applyPalette(data: Uint8ClampedArray | Uint8Array, palette: Uint8Array): Uint8Array;
}
