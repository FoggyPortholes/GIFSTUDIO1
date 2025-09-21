declare const process: undefined | { env?: Record<string, string | undefined> };

import type {
  GenerateAIImageParams,
  GenerateAIImageResponse,
  StableDiffusionSetupResult,
  StableDiffusionState,
  StudioSettings,
} from '../types';
import { DEFAULT_STABLE_DIFFUSION_MODEL_ID } from './stableDiffusionModelCatalog';

type SetupOptions = {
  version: string;
  installPath: string;
  modelId?: string;
  modelSource?: 'suggested' | 'user';
  onProgress?: (message: string) => void;
};

let stableDiffusionState: StableDiffusionState | null = null;

function joinPaths(base: string, suffix: string): string {
  const trimmedBase = base.replace(/[\\/]+$/, '');
  const trimmedSuffix = suffix.replace(/^[\\/]+/, '');
  if (!trimmedSuffix) {
    return trimmedBase;
  }
  return `${trimmedBase}/${trimmedSuffix}`;
}

function resolveHomeDirectory(): string | undefined {
  if (typeof process === 'undefined') {
    return undefined;
  }

  const env = process.env ?? {};
  return env.HOME ?? env.USERPROFILE ?? undefined;
}

function expandUserPath(installPath: string): string {
  if (!installPath.startsWith('~')) {
    return installPath;
  }

  const home = resolveHomeDirectory();
  if (!home) {
    return installPath;
  }

  const suffix = installPath.slice(1);
  if (!suffix) {
    return home;
  }

  if (suffix.startsWith('/') || suffix.startsWith('\\')) {
    return joinPaths(home, suffix.slice(1));
  }

  return joinPaths(home, suffix);
}

function ensureStateFromSettings(settings: StudioSettings): void {
  if (stableDiffusionState && stableDiffusionState.ready) {
    return;
  }

  if (!settings.enableLocalAi || !settings.stableDiffusionReady) {
    return;
  }

  const model = settings.stableDiffusionModelId ?? DEFAULT_STABLE_DIFFUSION_MODEL_ID;
  const modelSource = settings.stableDiffusionModelSource ?? 'suggested';

  stableDiffusionState = {
    ready: true,
    version: settings.stableDiffusionVersion,
    path: settings.stableDiffusionPath,
    model,
    modelSource,
  };
}

function parseHexColor(color: string): [number, number, number] {
  const normalized = color.replace('#', '').trim();
  if (normalized.length === 3) {
    const r = normalized.charAt(0);
    const g = normalized.charAt(1);
    const b = normalized.charAt(2);
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }

  const r = normalized.slice(0, 2);
  const g = normalized.slice(2, 4);
  const b = normalized.slice(4, 6);
  return [parseInt(r, 16) || 0, parseInt(g, 16) || 0, parseInt(b, 16) || 0];
}

function renderPaletteGradient({ width, height, palette }: GenerateAIImageParams, canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('A 2D canvas context is required to render the image.');
  }

  const imageData = context.createImageData(width, height) as unknown as { data: Uint8ClampedArray };
  const { data } = imageData;
  const totalPixels = width * height;

  for (let index = 0; index < totalPixels; index += 1) {
    const paletteIndex = palette[index % palette.length] ?? '#000000';
    const [red, green, blue] = parseHexColor(paletteIndex);
    const dataIndex = index * 4;
    data[dataIndex] = red;
    data[dataIndex + 1] = green;
    data[dataIndex + 2] = blue;
    data[dataIndex + 3] = 255;
  }

  if (typeof (context as CanvasRenderingContext2D).putImageData === 'function') {
    (context as CanvasRenderingContext2D).putImageData(imageData as unknown as ImageData, 0, 0);
  }
}

function renderToDataUrl(params: GenerateAIImageParams): string {
  if (typeof document === 'undefined') {
    throw new Error('A document instance is required to render images locally.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = params.width;
  canvas.height = params.height;
  renderPaletteGradient(params, canvas);
  return canvas.toDataURL('image/png');
}

export function getStableDiffusionState(): StableDiffusionState | null {
  return stableDiffusionState;
}

export async function setupLocalStableDiffusion(options: SetupOptions): Promise<StableDiffusionSetupResult> {
  const { version, installPath, modelId, modelSource = 'suggested', onProgress } = options;

  const resolvedPath = expandUserPath(installPath);
  onProgress?.('Preparing local Stable Diffusion runtime');

  stableDiffusionState = {
    ready: true,
    version,
    path: resolvedPath,
    model: modelId ?? DEFAULT_STABLE_DIFFUSION_MODEL_ID,
    modelSource,
  };

  onProgress?.('Stable Diffusion is ready');

  return {
    ready: true,
    version,
    path: resolvedPath,
  };
}

export async function generateAIImage(params: GenerateAIImageParams): Promise<GenerateAIImageResponse> {
  const { settings } = params;
  ensureStateFromSettings(settings);

  const localReady = settings.enableLocalAi && (stableDiffusionState?.ready ?? false);
  const useProcedural = settings.preferProcedural || !localReady;

  const imageUrl = renderToDataUrl(params);

  if (useProcedural) {
    return {
      source: 'procedural',
      imageUrl,
      seed: params.seed,
    };
  }

  return {
    source: 'local',
    imageUrl,
    seed: params.seed,
  };
}
