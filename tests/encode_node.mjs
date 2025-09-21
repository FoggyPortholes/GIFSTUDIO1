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

function makeGradientRGBA(startHex = '#ff0000', endHex = '#0000ff') {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const t = x / (WIDTH - 1);
      const i = (y * WIDTH + x) * 4;
      data[i + 0] = lerp(start.r, end.r, t);
      data[i + 1] = lerp(start.g, end.g, t);
      data[i + 2] = lerp(start.b, end.b, t);
      data[i + 3] = 255;
    }
  }
  return data;
}

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  const n = Number.parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

function validateGif(bytes) {
  const header = String.fromCharCode(...bytes.slice(0, 6));
  const trailer = bytes[bytes.length - 1];
  return (header === 'GIF87a' || header === 'GIF89a') && trailer === 0x3b;
}

function encode() {
  const encoder = GIFEncoder();
  const frames = [
    makeGradientRGBA('#ff0040', '#4000ff'),
    makeGradientRGBA('#40ff40', '#0040ff'),
    makeGradientRGBA('#ffbf00', '#00bfff'),
  ];
  frames.forEach((rgba, idx) => {
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    encoder.writeFrame(index, WIDTH, HEIGHT, {
      delay: DELAY,
      palette,
      ...(idx === 0 ? { repeat: 0 } : {}),
    });
  });
  encoder.finish();
  const bytes = new Uint8Array(encoder.bytesView());
  if (!validateGif(bytes)) {
    throw new Error('Invalid GIF bytes (header/trailer check failed).');
  }
  const outDir = path.join(__dirname, '..', 'public');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'animation.gif'), bytes);
}

try {
  encode();
  console.log('GIF smoke test: OK → public/animation.gif');
} catch (err) {
  console.error('GIF smoke test FAILED:', err?.message || err);
  process.exit(1);
}
