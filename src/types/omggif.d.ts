type NodeBuffer = import("node:buffer").Buffer;

declare module "omggif" {
  export class GifReader {
    constructor(buffer: NodeBuffer | Uint8Array);
    numFrames(): number;
    frameInfo(index: number): { x: number; y: number; width: number; height: number; delay: number };
  }
}
