import { CharacterModel, Frame, Layer, PixelColor } from '../types';
import { blankPixels, cloneFrame } from './frame';

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function drawRect(pixels: PixelColor[], width: number, x: number, y: number, w: number, h: number, color: string) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      const idx = yy * width + xx;
      pixels[idx] = color;
    }
  }
}

function drawSymmetric(pixels: PixelColor[], width: number, x: number, y: number, color: string) {
  const idxLeft = y * width + x;
  const idxRight = y * width + (width - x - 1);
  pixels[idxLeft] = color;
  pixels[idxRight] = color;
}

export function createNormalizedCharacter(width = 32, height = 32): CharacterModel {
  const skin = '#f5cfa0';
  const outline = '#2c1b18';
  const shadow = '#e0a672';
  const accent = '#3b5ba5';
  const basePixels = blankPixels(width, height);

  const torsoHeight = Math.round(height * 0.35);
  const legHeight = Math.round(height * 0.28);
  const headHeight = height - torsoHeight - legHeight;

  // Head
  drawRect(basePixels, width, Math.floor(width / 2) - 3, 2, 6, headHeight - 2, skin);
  drawRect(basePixels, width, Math.floor(width / 2) - 3, 1, 6, 1, outline);
  drawRect(basePixels, width, Math.floor(width / 2) - 3, headHeight - 1, 6, 1, shadow);

  // Eyes (symmetry)
  drawSymmetric(basePixels, width, Math.floor(width / 2) - 2, Math.floor(headHeight / 2), outline);
  drawSymmetric(basePixels, width, Math.floor(width / 2) + 1, Math.floor(headHeight / 2), outline);

  // Torso
  const torsoTop = headHeight;
  const torsoWidth = 8;
  drawRect(basePixels, width, Math.floor(width / 2) - torsoWidth / 2, torsoTop, torsoWidth, torsoHeight, skin);
  drawRect(basePixels, width, Math.floor(width / 2) - torsoWidth / 2, torsoTop + torsoHeight - 1, torsoWidth, 1, shadow);

  // Arms
  const armWidth = 3;
  const armHeight = torsoHeight - 2;
  drawRect(basePixels, width, Math.floor(width / 2) - torsoWidth / 2 - armWidth, torsoTop + 1, armWidth, armHeight, skin);
  drawRect(basePixels, width, Math.floor(width / 2) + torsoWidth / 2, torsoTop + 1, armWidth, armHeight, skin);

  // Legs
  const legsTop = torsoTop + torsoHeight;
  const legWidth = 3;
  drawRect(basePixels, width, Math.floor(width / 2) - legWidth - 1, legsTop, legWidth, legHeight, accent);
  drawRect(basePixels, width, Math.floor(width / 2) + 1, legsTop, legWidth, legHeight, accent);

  // Outline for silhouette
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      if (!basePixels[idx]) continue;
      const isEdge = [
        idx - 1,
        idx + 1,
        idx - width,
        idx + width,
      ].some((neighbour) => neighbour >= 0 && neighbour < basePixels.length && !basePixels[neighbour]);
      if (isEdge) {
        drawSymmetric(basePixels, width, x, y, outline);
      }
    }
  }

  const bodyLayer: Layer = {
    id: createId('layer'),
    name: 'Body',
    visible: true,
    locked: true,
    pixels: basePixels,
  };

  const clothingLayer: Layer = {
    id: createId('layer'),
    name: 'Outfit',
    visible: true,
    pixels: blankPixels(width, height),
  };

  const accentLayer: Layer = {
    id: createId('layer'),
    name: 'Accessories',
    visible: true,
    pixels: blankPixels(width, height),
  };

  const frame: Frame = {
    id: createId('frame'),
    name: 'Idle',
    duration: 200,
    layers: [bodyLayer, clothingLayer, accentLayer],
  };

  const palette = [
    '#0f0f0f',
    '#ffffff',
    skin,
    '#d8572a',
    accent,
    '#3f826d',
    '#b7b7b7',
  ];

  const character: CharacterModel = {
    id: createId('character'),
    name: 'Normalized Explorer',
    width,
    height,
    palette,
    frames: [frame],
    metadata: {
      description: 'Default normalized humanoid base for animation.',
      tags: ['base', 'humanoid', 'normalized'],
    },
  };

  return character;
}

export function createDerivedFrame(base: Frame) {
  const frame = cloneFrame(base, { preservePixels: true });
  frame.id = createId('frame');
  frame.name = `${base.name} Copy`;
  return frame;
}

export function createBlankAnimationFrame(base: Frame) {
  const frame = cloneFrame(base, { preservePixels: false });
  frame.id = createId('frame');
  frame.name = 'New Frame';
  return frame;
}

export { createId };
