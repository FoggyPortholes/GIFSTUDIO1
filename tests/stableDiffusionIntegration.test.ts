import type { StudioSettings } from '../src/types';
import { DEFAULT_STABLE_DIFFUSION_MODEL_ID } from '../src/services/stableDiffusionModelCatalog';

declare const require: any;
declare const process: any;

function expect(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${expected} but received ${actual})`);
  }
}

function setGlobal(key: string, value: unknown) {
  (globalThis as Record<string, unknown>)[key] = value as unknown;
}

function deleteGlobal(key: string) {
  delete (globalThis as Record<string, unknown>)[key];
}

type AiServiceModule = typeof import('../src/services/aiService');

function createMockCanvas() {
  return {
    width: 0,
    height: 0,
    getContext: (type: string) => {
      if (type !== '2d') return null;
      return {
        createImageData: (width: number, height: number) => ({
          data: new Uint8ClampedArray(width * height * 4),
        }),
        putImageData: () => undefined,
      };
    },
    toDataURL: () => 'data:image/png;base64,mock',
  };
}

function createMockDocument() {
  return {
    createElement: (tag: string) => {
      if (tag !== 'canvas') {
        throw new Error('Only canvas elements are supported in tests');
      }
      return createMockCanvas();
    },
  } as Document;
}

function loadAiService(): AiServiceModule {
  const modulePath = require.resolve('../src/services/aiService');
  delete require.cache[modulePath];
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  return require('../src/services/aiService') as AiServiceModule;
}

async function testLocalGenerationWithoutPersistentStorage() {
  const aiService = loadAiService();
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = ((fn: (...args: unknown[]) => void) => {
    fn();
    return 0 as unknown as ReturnType<typeof originalSetTimeout>;
  }) as typeof setTimeout;
  globalThis.clearTimeout = (() => undefined) as typeof clearTimeout;

  setGlobal('window', undefined);
  setGlobal('document', createMockDocument());

  const palette = ['#0f0f0f', '#ffffff', '#f4d7b4', '#16a34a'];
  const settings: StudioSettings = {
    preferProcedural: false,
    enableLocalAi: true,
    stableDiffusionAutoDownload: true,
    stableDiffusionReady: true,
    stableDiffusionVersion: '1.5',
    stableDiffusionPath: '/mock/path',
  };

  const response = await aiService.generateAIImage({
    prompt: 'emerald mage',
    width: 4,
    height: 4,
    palette,
    seed: 123,
    settings,
  });

  expectEqual(response.source, 'local', 'Expected the local Stable Diffusion pipeline to be used');
  expectEqual(response.imageUrl, 'data:image/png;base64,mock', 'Expected mocked canvas output to be returned');

  deleteGlobal('document');
  deleteGlobal('window');
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
}

async function testSetupPersistsStateInMemory() {
  const aiService = loadAiService();
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = ((fn: (...args: unknown[]) => void) => {
    fn();
    return 0 as unknown as ReturnType<typeof originalSetTimeout>;
  }) as typeof setTimeout;
  globalThis.clearTimeout = (() => undefined) as typeof clearTimeout;

  setGlobal('window', undefined);
  setGlobal('document', createMockDocument());

  const result = await aiService.setupLocalStableDiffusion({
    version: '2.0',
    autoDownload: true,
    onProgress: () => undefined,
  });

  expectEqual(result.ready, true, 'Expected setup to report ready state');
  const state = aiService.getStableDiffusionState();
  expect(state, 'Expected Stable Diffusion state to be available in memory');
  expectEqual(state?.ready ?? false, true, 'Expected Stable Diffusion runtime to be marked ready');
  expectEqual(state?.version ?? '', '2.0', 'Expected stored version to match the requested one');
  expectEqual(
    state?.model ?? '',
    DEFAULT_STABLE_DIFFUSION_MODEL_ID,
    'Expected default Stable Diffusion model to be stored when not specified'
  );
  expectEqual(
    state?.modelSource ?? 'suggested',
    'suggested',
    'Expected default model to be flagged as suggested'
  );

  deleteGlobal('document');
  deleteGlobal('window');
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
}

async function testProceduralFallbackWhenDisabled() {
  const aiService = loadAiService();
  setGlobal('window', undefined);
  setGlobal('document', createMockDocument());

  const palette = ['#0f0f0f', '#ffffff', '#f4d7b4', '#16a34a'];
  const settings: StudioSettings = {
    preferProcedural: false,
    enableLocalAi: true,
    stableDiffusionAutoDownload: true,
    stableDiffusionReady: false,
    stableDiffusionVersion: '1.5',
    stableDiffusionPath: '/mock/path',
  };

  const response = await aiService.generateAIImage({
    prompt: 'emerald mage',
    width: 4,
    height: 4,
    palette,
    seed: 456,
    settings,
  });

  expectEqual(response.source, 'procedural', 'Expected procedural generation when Stable Diffusion is not ready');

  deleteGlobal('document');
  deleteGlobal('window');
}

async function run() {
  await testLocalGenerationWithoutPersistentStorage();
  await testSetupPersistsStateInMemory();
  await testProceduralFallbackWhenDisabled();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
