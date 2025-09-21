import { describe, expect, it } from 'vitest';
import { makeGif } from '../src/services/gif/makeGif';

function createSolidFrame(color: [number, number, number]) {
  const width = 16;
  const height = 16;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const index = i * 4;
    rgba[index] = color[0];
    rgba[index + 1] = color[1];
    rgba[index + 2] = color[2];
    rgba[index + 3] = 255;
  }
  return { rgba, width, height, delayMs: 120 };
}

describe('makeGif', () => {
  it('creates a GIF with a valid header and trailer', () => {
    const frames = [createSolidFrame([255, 0, 0]), createSolidFrame([0, 0, 255])];
    const bytes = makeGif(frames, { loop: true });
    const header = String.fromCharCode(...bytes.slice(0, 6));
    expect(['GIF87a', 'GIF89a']).toContain(header);
    expect(bytes.at(-1)).toBe(0x3b);
  });

  it('omits the Netscape loop extension when looping is disabled', () => {
    const frames = [createSolidFrame([0, 255, 0]), createSolidFrame([0, 0, 0])];
    const bytes = makeGif(frames, { loop: false });
    const ascii = String.fromCharCode(...bytes);
    expect(ascii).not.toContain('NETSCAPE2.0');
  });
});