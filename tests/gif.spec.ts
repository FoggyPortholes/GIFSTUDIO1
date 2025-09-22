import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { GifReader } from 'omggif';
import { makeGif } from '../src/services/gif/makeGif';
import type { GifFrame } from '../src/services/gif/makeGif';

const STUB_FILES = ['frame-1.png', 'frame-2.png', 'frame-3.png'];
const STUB_DELAY_MS = 200;

function loadStubFrame(file: string, delayMs: number): GifFrame {
  const absolute = resolve(__dirname, '../public/stubs', file);
  const png = PNG.sync.read(readFileSync(absolute));
  return {
    rgba: new Uint8ClampedArray(png.data),
    width: png.width,
    height: png.height,
    delayMs,
  };
}

function parseLoopCount(buffer: Buffer): number | null {
  const signature = Buffer.from('NETSCAPE2.0', 'ascii');
  const index = buffer.indexOf(signature);
  if (index === -1) {
    return null;
  }
  const blockStart = index + signature.length;
  const blockSize = buffer[blockStart];
  const blockId = buffer[blockStart + 1];
  if (blockSize !== 0x03 || blockId !== 0x01) {
    return null;
  }
  const loopLow = buffer[blockStart + 2];
  const loopHigh = buffer[blockStart + 3];
  return loopLow | (loopHigh << 8);
}

describe('makeGif', () => {
  it('encodes stub frames with correct loop and delays', () => {
    const frames = STUB_FILES.map((file) => loadStubFrame(file, STUB_DELAY_MS));
    const bytes = makeGif(frames, { loop: true });
    const buffer = Buffer.from(bytes);

    const header = buffer.slice(0, 6).toString('ascii');
    expect(['GIF87a', 'GIF89a']).toContain(header);
    expect(buffer.at(-1)).toBe(0x3b);

    const reader = new GifReader(buffer);
    expect(reader.numFrames()).toBe(frames.length);
    for (let i = 0; i < reader.numFrames(); i += 1) {
      const info = reader.frameInfo(i);
      expect(info.delay * 10).toBe(STUB_DELAY_MS);
    }

    const loopCount = parseLoopCount(buffer);
    expect(loopCount).toBe(0); // 0 == infinite loop per GIF spec
  });
<<<<<<< Updated upstream

  it('omits the Netscape loop extension when looping is disabled', () => {
    const frames = [createSolidFrame([0, 255, 0]), createSolidFrame([0, 0, 0])];
    const bytes = makeGif(frames, { loop: false });
    const ascii = String.fromCharCode(...bytes);
    expect(ascii).not.toContain('NETSCAPE2.0');
  });
});
=======
});
>>>>>>> Stashed changes
