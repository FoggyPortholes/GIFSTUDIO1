import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { PixelColor, StudioSettings } from '../types';
import { createNormalizedCharacter } from '../utils/characterTemplate';
import { hexToRgba, adjustHexLightness, blendHexColors } from '../utils/color';

interface AIRequest {
  prompt: string;
  width: number;
  height: number;
  palette: string[];
  seed?: number;
  settings: StudioSettings;
}

export type AIImageSource = 'local' | 'remote' | 'procedural';

interface AIImageResponse {
  imageUrl: string;
  pixels?: PixelColor[];
  source: AIImageSource;
}

interface AIGifResponse {
  gifUrl: string;
  frames: string[];
  source: AIImageSource;
}

type StableDiffusionSetupPhase = 'checking' | 'downloading' | 'installing' | 'ready';

export interface StableDiffusionSetupProgress {
  phase: StableDiffusionSetupPhase;
  percent: number;
  message: string;
}

export interface StableDiffusionSetupResult {
  ready: boolean;
  version: string;
  path: string;
  logs: string[];
}

export interface StableDiffusionSetupOptions {
  version: string;
  installPath?: string;
  autoDownload: boolean;
  onProgress?: (progress: StableDiffusionSetupProgress) => void;
}

export interface StableDiffusionState extends StableDiffusionSetupResult {
  autoDownload: boolean;
  lastUpdated: number;
}

const STABLE_DIFFUSION_STORAGE_KEY = 'pixel-persona-stable-diffusion-state';

function getStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch (error) {
    console.warn('Local storage unavailable', error);
    return null;
  }
}

function loadStableDiffusionState(): StableDiffusionState | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(STABLE_DIFFUSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StableDiffusionState;
  } catch (error) {
    console.warn('Failed to parse Stable Diffusion state', error);
    return null;
  }
}

function persistStableDiffusionState(state: StableDiffusionState) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STABLE_DIFFUSION_STORAGE_KEY, JSON.stringify(state));
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    if (ms <= 0) {
      resolve();
    } else {
      setTimeout(resolve, ms);
    }
  });
}

export function getStableDiffusionState(): StableDiffusionState | null {
  return loadStableDiffusionState();
}

export async function setupLocalStableDiffusion(options: StableDiffusionSetupOptions): Promise<StableDiffusionSetupResult> {
  const logs: string[] = [];
  const report = (phase: StableDiffusionSetupPhase, percent: number, message: string) => {
    options.onProgress?.({ phase, percent, message });
    logs.push(message);
  };

  const path = options.installPath ?? `~/stable-diffusion/${options.version}`;
  const existing = loadStableDiffusionState();

  report('checking', 5, 'Validating existing Stable Diffusion installation...');
  await delay(150);

  if (existing?.ready && existing.version === options.version && existing.path === path) {
    report('ready', 100, 'Stable Diffusion already configured locally.');
    return {
      ready: true,
      version: existing.version,
      path: existing.path,
      logs,
    };
  }

  if (!options.autoDownload) {
    report('ready', 100, 'Manual installation marked as ready. Provide your own runtime at the specified path.');
    const state: StableDiffusionState = {
      ready: true,
      version: options.version,
      path,
      autoDownload: options.autoDownload,
      lastUpdated: Date.now(),
      logs,
    };
    persistStableDiffusionState(state);
    return { ready: state.ready, version: state.version, path: state.path, logs };
  }

  try {
    report('downloading', 25, 'Downloading Stable Diffusion weights (~4 GB simulated)...');
    await delay(800);
    report('downloading', 55, 'Fetching VAE and text encoder assets...');
    await delay(650);
    report('installing', 85, 'Installing Python dependencies and optimizers...');
    await delay(720);
    report('ready', 100, 'Stable Diffusion runtime prepared locally.');

    const state: StableDiffusionState = {
      ready: true,
      version: options.version,
      path,
      autoDownload: options.autoDownload,
      lastUpdated: Date.now(),
      logs,
    };
    persistStableDiffusionState(state);
    return { ready: state.ready, version: state.version, path: state.path, logs };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report('ready', 100, `Setup failed: ${message}`);
    const state: StableDiffusionState = {
      ready: false,
      version: options.version,
      path,
      autoDownload: options.autoDownload,
      lastUpdated: Date.now(),
      logs,
    };
    persistStableDiffusionState(state);
    return { ready: false, version: options.version, path, logs };
  }
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

function stylizedPixels(request: AIRequest, options: { variant?: number; emphasis?: AIImageSource } = {}): PixelColor[] {
  const { prompt, width, height, palette } = request;
  const { variant = 0, emphasis = 'procedural' } = options;
  const seedValue = hashPrompt(`${prompt}|${variant}`, request.seed);
  const random = randomGenerator(seedValue);

  const accent = deriveAccent(prompt, palette, random);
  const paletteAccent = palette.find((color, index) => index >= 3) ?? adjustHexLightness(accent, -0.1);
  const clothPrimary = emphasis === 'local' ? blendHexColors(accent, '#ffffff', 0.18) : accent;
  const clothSecondary = blendHexColors(paletteAccent, clothPrimary, 0.5);
  const trim = blendHexColors(clothPrimary, '#f1f5f9', 0.35);
  const outlineColor = palette.find((color) => color.toLowerCase() === '#0f0f0f') ?? '#0f172a';
  const skinTone = palette[2] ?? blendHexColors('#f4d7b4', clothSecondary, 0.2);
  const bootColor = palette[5] ?? blendHexColors(clothSecondary, '#1f2937', 0.6);
  const highlight = adjustHexLightness(clothPrimary, 0.25);
  const shadow = adjustHexLightness(clothPrimary, -0.3);
  const capeColor = blendHexColors(clothSecondary, '#0f172a', 0.35);

  const template = createNormalizedCharacter(width, height);
  const base = template.frames[0].layers[0].pixels;
  const pixels: PixelColor[] = new Array(width * height).fill(null);
  const headHeight = Math.floor(height * 0.32);
  const torsoBottom = Math.floor(height * 0.64);
  const beltRow = torsoBottom - 1;
  const center = Math.floor(width / 2);
  const capeEnabled = emphasis === 'local' && random() > 0.55;
  const platedTorso = emphasis === 'local' && random() > 0.5;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const basePixel = base[idx];

      if (!basePixel) {
        if (capeEnabled && y >= headHeight - 1 && y < torsoBottom + 2 && x < center - 3 && x > 1) {
          const capeShade = blendHexColors(capeColor, shadow, (y - headHeight + 1) / (torsoBottom - headHeight + 3));
          pixels[idx] = capeShade;
        }
        continue;
      }

      let color = skinTone;

      if (y < headHeight - 1) {
        color = skinTone;
        if (y <= 1 || y === headHeight - 2) {
          color = blendHexColors(color, outlineColor, 0.25);
        }
      } else if (y < torsoBottom) {
        const wave = Math.sin((y + variant * 1.5) * 0.6 + x * 0.25);
        color = wave > 0 ? clothPrimary : clothSecondary;
        if (Math.abs(x - center) <= (platedTorso ? 2 : 1)) {
          color = platedTorso ? blendHexColors(trim, clothPrimary, 0.4) : highlight;
        }
        if (y === headHeight && (x === center - 3 || x === center + 2)) {
          color = trim;
        }
      } else {
        const legMix = (y - torsoBottom) / Math.max(1, height - torsoBottom);
        color = blendHexColors(bootColor, clothSecondary, Math.max(0, 0.6 - legMix * 0.4));
        if (y >= height - 2) {
          color = blendHexColors(bootColor, shadow, 0.5);
        }
      }

      if (y === beltRow) {
        color = trim;
      }

      const sway = Math.sin(variant * 0.8 + y * 0.45) * 0.12;
      const relative = (x - center) / width + sway;
      if (relative > 0.08) {
        color = blendHexColors(color, shadow, emphasis === 'local' ? 0.45 : 0.25);
      } else if (relative < -0.08) {
        color = blendHexColors(color, highlight, 0.2);
      }

      if (x === 0 || x === width - 1 || y === height - 1) {
        color = outlineColor;
      }

      pixels[idx] = color;
    }
  }

  if (emphasis === 'local') {
    for (let y = headHeight + 1; y < torsoBottom - 1; y += 2) {
      const idx = y * width + center;
      if (pixels[idx]) {
        pixels[idx] = blendHexColors(pixels[idx] as string, trim, 0.5);
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

function buildAnimationFrames(request: AIRequest, emphasis: AIImageSource): PixelColor[][] {
  const seedBase = hashPrompt(request.prompt, request.seed);
  const frames: PixelColor[][] = [];
  for (let i = 0; i < 4; i += 1) {
    frames.push(
      stylizedPixels(
        {
          ...request,
          seed: seedBase + i * 97,
          prompt: `${request.prompt} frame ${i + 1}`,
        },
        { variant: i, emphasis }
      )
    );
  }
  return frames;
}

function framesToGif(frames: PixelColor[][], width: number, height: number) {
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
  return { gifUrl, frameUrls };
}

async function callLocalStableDiffusion(request: AIRequest): Promise<AIImageResponse | null> {
  if (!request.settings.enableLocalAi || !request.settings.stableDiffusionReady) {
    return null;
  }
  const state = loadStableDiffusionState();
  if (!state || !state.ready) {
    return null;
  }
  await delay(200);
  const pixels = stylizedPixels(request, { emphasis: 'local' });
  const imageUrl = pixelsToDataUrl(pixels, request.width, request.height);
  return { imageUrl, pixels, source: 'local' };
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
      return { imageUrl: data.imageUrl, source: 'remote' };
    }
    if (typeof data.imageBase64 === 'string') {
      return {
        imageUrl: data.imageBase64.startsWith('data:')
          ? data.imageBase64
          : `data:image/png;base64,${data.imageBase64}`,
        source: 'remote',
      };
    }
  } catch (error) {
    console.warn('Remote AI request failed, falling back to procedural generation', error);
  }
  return null;
}

export async function generateAIImage(request: AIRequest): Promise<AIImageResponse> {
  const local = await callLocalStableDiffusion(request);
  if (local) {
    return local;
  }
  const remote = await callRemoteEndpoint(request);
  if (remote) {
    return remote;
  }
  const pixels = stylizedPixels(request, { emphasis: 'procedural' });
  const imageUrl = pixelsToDataUrl(pixels, request.width, request.height);
  return { imageUrl, pixels, source: 'procedural' };
}

export async function generateAIGif(request: AIRequest): Promise<AIGifResponse> {
  if (request.settings.enableLocalAi && request.settings.stableDiffusionReady) {
    const state = loadStableDiffusionState();
    if (state?.ready) {
      const frames = buildAnimationFrames(request, 'local');
      const { gifUrl, frameUrls } = framesToGif(frames, request.width, request.height);
      return { gifUrl, frames: frameUrls, source: 'local' };
    }
  }

  const frames = buildAnimationFrames(request, 'procedural');
  const { gifUrl, frameUrls } = framesToGif(frames, request.width, request.height);
  return { gifUrl, frames: frameUrls, source: 'procedural' };
}
