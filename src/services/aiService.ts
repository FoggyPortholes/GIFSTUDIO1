import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { PixelColor, StudioSettings } from '../types';
import { createNormalizedCharacter } from '../utils/characterTemplate';
import { hexToRgba } from '../utils/color';

interface AIRequest {
  prompt: string;
  width: number;
  height: number;
  palette: string[];
  seed?: number;
  settings: StudioSettings;
}

interface AIImageResponse {
  imageUrl: string;
  pixels?: PixelColor[];
}

interface AIGifResponse {
  gifUrl: string;
  frames: string[];
}

function hashPrompt(prompt: string, seed = 0) {
  let hash = seed || 0;
  for (let i = 0; i < prompt.length; i += 1) {
    hash = (hash << 5) - hash + prompt.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function randomGenerator(seed: number) {
  return function mulberry() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deriveAccent(prompt: string, palette: string[], random: () => number) {
  const lowered = prompt.toLowerCase();
  const keywords: Record<string, string> = {
    fire: '#f97316',
    lava: '#f97316',
    magma: '#f97316',
    forest: '#16a34a',
    nature: '#16a34a',
    frost: '#38bdf8',
    ice: '#38bdf8',
    shadow: '#1f2937',
    void: '#0f172a',
    holy: '#facc15',
    arcane: '#8b5cf6',
  };
  for (const [word, color] of Object.entries(keywords)) {
    if (lowered.includes(word)) {
      return color;
    }
  }
  return palette[Math.floor(random() * palette.length)] ?? '#ffffff';
}

function proceduralPixels({ prompt, width, height, palette, seed }: AIRequest): PixelColor[] {
  const template = createNormalizedCharacter(width, height);
  const base = template.frames[0].layers[0].pixels.slice();
  const pixels = base.slice();
  const random = randomGenerator(hashPrompt(prompt, seed));
  const accent = deriveAccent(prompt, palette, random);
  const secondary = palette[(Math.floor(random() * palette.length)) % palette.length] ?? '#3f826d';
  const outlineColor = palette.find((color) => color.toLowerCase() === '#0f0f0f') ?? '#0f172a';

  const torsoTop = Math.floor(height * 0.28);
  const torsoBottom = Math.floor(height * 0.6);
  const legTop = torsoBottom;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (!base[idx]) continue;
      if (y >= torsoTop && y < torsoBottom) {
        const stripe = Math.sin((x + y) * 0.5 + random() * 2);
        pixels[idx] = stripe > 0 ? accent : secondary;
      } else if (y >= legTop) {
        pixels[idx] = y % 2 === 0 ? accent : secondary;
      }
      if (x === 0 || x === width - 1) {
        pixels[idx] = outlineColor;
      }
    }
  }

  return pixels;
}

function pixelsToDataUrl(pixels: PixelColor[], width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  for (let i = 0; i < pixels.length; i += 1) {
    const base = i * 4;
    const color = pixels[i];
    if (!color) {
      data[base + 3] = 0;
      continue;
    }
    const [r, g, b, a] = hexToRgba(color);
    data[base] = r;
    data[base + 1] = g;
    data[base + 2] = b;
    data[base + 3] = a;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

async function callRemoteEndpoint(request: AIRequest): Promise<AIImageResponse | null> {
  if (!request.settings.aiEndpoint || request.settings.preferProcedural) {
    return null;
  }
  try {
    const response = await fetch(request.settings.aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.settings.aiApiKey ? { Authorization: `Bearer ${request.settings.aiApiKey}` } : {}),
      },
      body: JSON.stringify({
        prompt: request.prompt,
        width: request.width,
        height: request.height,
        seed: request.seed,
        palette: request.palette,
        model: request.settings.aiModel,
      }),
    });
    if (!response.ok) throw new Error(`Remote generation failed: ${response.status}`);
    const data = await response.json();
    if (typeof data.imageUrl === 'string') {
      return { imageUrl: data.imageUrl };
    }
    if (typeof data.imageBase64 === 'string') {
      return { imageUrl: data.imageBase64.startsWith('data:') ? data.imageBase64 : `data:image/png;base64,${data.imageBase64}` };
    }
  } catch (error) {
    console.warn('Remote AI request failed, falling back to procedural generation', error);
  }
  return null;
}

export async function generateAIImage(request: AIRequest): Promise<AIImageResponse> {
  const remote = await callRemoteEndpoint(request);
  if (remote) {
    return remote;
  }
  const pixels = proceduralPixels(request);
  const imageUrl = pixelsToDataUrl(pixels, request.width, request.height);
  return { imageUrl, pixels };
}

export async function generateAIGif(request: AIRequest): Promise<AIGifResponse> {
  const seedBase = hashPrompt(request.prompt, request.seed);
  const frames: PixelColor[][] = [];
  for (let i = 0; i < 4; i += 1) {
    frames.push(
      proceduralPixels({
        ...request,
        seed: seedBase + i * 97,
        prompt: `${request.prompt} frame ${i + 1}`,
      })
    );
  }

  const width = request.width;
  const height = request.height;
  const encoder = GIFEncoder();
  const { writeFrame, finish } = encoder;
  const frameUrls: string[] = [];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  canvas.width = width;
  canvas.height = height;

  frames.forEach((pixels, index) => {
    const imageData = ctx.createImageData(width, height);
    const rgba = imageData.data;
    for (let i = 0; i < pixels.length; i += 1) {
      const base = i * 4;
      const color = pixels[i];
      if (!color) {
        rgba[base + 3] = 0;
        continue;
      }
      const [r, g, b, a] = hexToRgba(color);
      rgba[base] = r;
      rgba[base + 1] = g;
      rgba[base + 2] = b;
      rgba[base + 3] = a;
    }
    ctx.putImageData(imageData, 0, 0);
    frameUrls.push(canvas.toDataURL('image/png'));
    const palette = quantize(imageData.data, 256);
    const indexes = applyPalette(imageData.data, palette);
    const options = index === 0 ? { palette, delay: 180, repeat: 0 } : { palette, delay: 180 };
    writeFrame(indexes, width, height, options);
  });

  const buffer = finish();
  const blob = new Blob([buffer], { type: 'image/gif' });
  const gifUrl = URL.createObjectURL(blob);
  return { gifUrl, frames: frameUrls };
}
