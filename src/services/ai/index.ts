import { isFlagEnabled, readEnv } from '../../lib/env';
import { generateStubCharacter } from './stub';

export type AiProviderName = 'stub' | 'openai' | 'stability' | 'automatic1111';

export interface AiProviderConfig {
  openAiKey?: string;
  stabilityKey?: string;
  automaticUrl?: string;
  automaticAuthToken?: string;
}

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  count: number;
  size: {
    width: number;
    height: number;
  };
}

export interface GeneratedImage {
  id: string;
  provider: AiProviderName;
  url: string;
  description: string;
  placeholder: boolean;
}

interface GenerateOptionsInternal {
  provider: AiProviderName;
  prompt: string;
  negativePrompt?: string;
  count: number;
  size: {
    width: number;
    height: number;
  };
  config: AiProviderConfig;
}

function resolveConfig(overrides: AiProviderConfig = {}): AiProviderConfig {
  const base: AiProviderConfig = {
    openAiKey: readEnv('VITE_OPENAI_API_KEY') ?? readEnv('OPENAI_API_KEY'),
    stabilityKey: readEnv('VITE_STABILITY_API_KEY') ?? readEnv('STABILITY_API_KEY'),
    automaticUrl: readEnv('VITE_AUTOMATIC1111_URL') ?? readEnv('AUTOMATIC1111_URL'),
    automaticAuthToken:
      readEnv('VITE_AUTOMATIC1111_TOKEN') ?? readEnv('AUTOMATIC1111_TOKEN') ?? readEnv('AUTOMATIC1111_AUTH_TOKEN'),
  };
  return { ...base, ...overrides };
}

function isOfflineMode(): boolean {
  return isFlagEnabled('OFFLINE_MODE') || isFlagEnabled('VITE_OFFLINE_MODE');
}

function hasCredentials(provider: AiProviderName, config: AiProviderConfig): boolean {
  switch (provider) {
    case 'openai':
      return Boolean(config.openAiKey);
    case 'stability':
      return Boolean(config.stabilityKey);
    case 'automatic1111':
      return Boolean(config.automaticUrl);
    default:
      return false;
  }
}

function shouldRouteToStub(options: GenerateOptionsInternal): boolean {
  if (options.provider === 'stub') {
    return true;
  }
  if (isOfflineMode()) {
    return true;
  }
  return !hasCredentials(options.provider, options.config);
}

function mergePrompt(prompt: string, negative?: string): string {
  if (negative && negative.trim().length > 0) {
    return `${prompt.trim()} — avoid: ${negative.trim()}`;
  }
  return prompt.trim();
}

async function runStubGenerator(options: GenerateOptionsInternal): Promise<GeneratedImage[]> {
  const requestPrompt = mergePrompt(options.prompt, options.negativePrompt);
  const stubImages = await generateStubCharacter(requestPrompt);
  return stubImages.slice(0, Math.max(1, Math.min(options.count, stubImages.length)));
}

export interface GenerateOptions {
  provider: AiProviderName;
  prompt: string;
  negativePrompt?: string;
  count?: number;
  size?: {
    width: number;
    height: number;
  };
  config?: AiProviderConfig;
}

export async function generateCharacterImages(options: GenerateOptions): Promise<GeneratedImage[]> {
  const normalized: GenerateOptionsInternal = {
    provider: options.provider,
    prompt: options.prompt,
    negativePrompt: options.negativePrompt,
    count: Math.max(1, Math.min(options.count ?? 4, 8)),
    size: options.size ?? { width: 512, height: 512 },
    config: resolveConfig(options.config),
  };

  if (shouldRouteToStub(normalized)) {
    return runStubGenerator(normalized);
  }

  const message = `Real provider '${normalized.provider}' is disabled in offline mode.`;
  console.warn('[ai] ' + message);
  return runStubGenerator(normalized);
}
