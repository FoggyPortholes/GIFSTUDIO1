declare const process: { exit(code?: number): never };

import type { StudioSettings, GenerateAIImageParams } from '../src/types';
import { DEFAULT_STABLE_DIFFUSION_MODEL_ID } from '../src/services/stableDiffusionModelCatalog';
import { generateAIImage } from '../src/services/aiService';

function expectOk(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

(async () => {
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: () => undefined,
    }),
    toDataURL: () => 'data:image/png;base64,mock',
  };

  const mockDocument = {
    createElement: (tag: string) => {
      if (tag !== 'canvas') {
        throw new Error('Only canvas elements are supported in tests');
      }
      return mockCanvas;
    },
  } as Document;

  (globalThis as Record<string, unknown>).document = mockDocument;

  const settings: StudioSettings = {
    preferProcedural: true, // force procedural path
    enableLocalAi: false,
    stableDiffusionReady: false,
    stableDiffusionVersion: '0.0.0',
    stableDiffusionPath: '',
    stableDiffusionModelId: DEFAULT_STABLE_DIFFUSION_MODEL_ID,
    stableDiffusionModelSource: 'suggested',
  };

  const params: GenerateAIImageParams = {
    prompt: 'test',
    width: 96,
    height: 64,
    palette: ['#000000', '#ffffff'],
    settings,
    seed: 1234,
  };

  const res = await generateAIImage(params);
  expectOk(res.source === 'procedural', 'Expected procedural generation when preferProcedural=true');
  expectOk(
    typeof res.imageUrl === 'string' && res.imageUrl.startsWith('data:image/png;base64,'),
    'Expected data URL image',
  );
  console.log('Stable Diffusion test (procedural fallback): OK');

  delete (globalThis as Record<string, unknown>).document;
})().catch((e) => {
  console.error('Stable Diffusion test FAILED', e);
  process.exit(1);
});
