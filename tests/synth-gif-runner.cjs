const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { PNG } = require('pngjs');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

process.env.OFFLINE_MODE = process.env.OFFLINE_MODE ?? 'true';

const STUB_FILES = ['frame-1.png', 'frame-2.png', 'frame-3.png'];

function loadStubFrame(file) {
  const absolutePath = resolve(__dirname, '../public/stubs', file);
  const buffer = readFileSync(absolutePath);
  const png = PNG.sync.read(buffer);
  return {
    width: png.width,
    height: png.height,
    rgba: png.data,
  };
}

function encodeGif(frames, delayMs) {
  if (!frames.length) {
    throw new Error('No frames provided to encoder.');
  }
  const { width, height } = frames[0];
  const encoder = GIFEncoder();

  frames.forEach(({ rgba }) => {
    const palette = quantize(rgba, 256);
    const indexed = applyPalette(rgba, palette);
    encoder.writeFrame(indexed, width, height, {
      palette,
      delay: Math.max(2, Math.round(delayMs / 10)),
      repeat: 0,
    });
  });

  encoder.finish();
  return Buffer.from(encoder.bytes());
}

function main() {
  const frames = STUB_FILES.map(loadStubFrame);
  const gif = encodeGif(frames, 200);
  const outputPath = resolve(__dirname, '../public/animation.gif');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, gif);
  console.log(`Created ${outputPath} (${gif.length} bytes, ${frames.length} frames)`);
}

main();
