const { writeFileSync, mkdirSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const width = 64;
const height = 64;

function createFrame(colorA, colorB) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const t = (x + y) / (width + height - 2);
      const r = Math.round(colorA[0] + (colorB[0] - colorA[0]) * t);
      const g = Math.round(colorA[1] + (colorB[1] - colorA[1]) * t);
      const b = Math.round(colorA[2] + (colorB[2] - colorA[2]) * t);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

function buildGif() {
  const encoder = GIFEncoder();
  const frames = [
    createFrame([226, 84, 255], [66, 226, 255]),
    createFrame([255, 192, 74], [255, 74, 98]),
  ];

  frames.forEach((rgba) => {
    const palette = quantize(rgba, 256);
    const indexed = applyPalette(rgba, palette);
    encoder.writeFrame(indexed, width, height, {
      palette,
      delay: 12,
      repeat: 0,
    });
  });

  encoder.finish();
  const buffer = Buffer.from(encoder.bytes());
  const outputPath = resolve(__dirname, '../public/animation.gif');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath} (${buffer.length} bytes)`);
}

buildGif();