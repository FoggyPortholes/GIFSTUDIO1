import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WIDTH = 96;
const HEIGHT = 64;
const DELAY = 300;

function makeGradientRGBA() {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      data[i + 0] = Math.round((x / (WIDTH - 1)) * 255);
      data[i + 1] = Math.round((y / (HEIGHT - 1)) * 255);
      data[i + 2] = Math.round(((x + y) / (WIDTH + HEIGHT - 2)) * 255);
      data[i + 3] = 255;
    }
  }
  return data;
}

function makeCheckerRGBA() {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      const block = ((x >> 3) & 1) ^ ((y >> 3) & 1) ? 255 : 32;
      data[i + 0] = block;
      data[i + 1] = 32;
      data[i + 2] = 255 - block;
      data[i + 3] = 255;
    }
  }
  return data;
}

async function main() {
  const enc = GIFEncoder();
  const { writeFrame, finish } = enc;
  const frames = [makeGradientRGBA(), makeCheckerRGBA()];

  frames.forEach((rgba, idx) => {
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    const options = idx === 0 ? { palette, delay: DELAY, repeat: 0 } : { palette, delay: DELAY };
    writeFrame(index, WIDTH, HEIGHT, options);
  });

  const buffer = finish();
  const bytes = new Uint8Array(buffer);
  const outDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'animation.gif');
  fs.writeFileSync(outPath, Buffer.from(bytes));
  console.log('✔ GIF written to', outPath);
}

main().catch((err) => {
  console.error('✖ GIF encoding failed:', err);
  process.exit(1);
});
