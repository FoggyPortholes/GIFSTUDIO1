export type AiProviderName = 'openai' | 'stability' | 'automatic1111';

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

interface AiProvider {
  name: AiProviderName;
  generate(request: GenerationRequest): Promise<GeneratedImage[]>;
}

interface ProviderDefinition {
  name: AiProviderName;
  accent: string;
  hasCredential(config: AiProviderConfig): boolean;
}

const PROVIDERS: ProviderDefinition[] = [
  {
    name: 'openai',
    accent: '#38bdf8',
    hasCredential: (config) => Boolean(config.openAiKey),
  },
  {
    name: 'stability',
    accent: '#f97316',
    hasCredential: (config) => Boolean(config.stabilityKey),
  },
  {
    name: 'automatic1111',
    accent: '#a855f7',
    hasCredential: (config) => Boolean(config.automaticUrl),
  },
];

function findProviderDefinition(name: AiProviderName): ProviderDefinition {
  const definition = PROVIDERS.find((provider) => provider.name === name);
  if (!definition) {
    throw new Error(`Unknown AI provider: ${name}`);
  }
  return definition;
}

function encodeBase64(content: string): string {
  const nodeBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (typeof nodeBuffer === 'function') {
    return nodeBuffer.from(content, 'utf8').toString('base64');
  }
  if (typeof TextEncoder !== 'undefined' && typeof btoa === 'function') {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  throw new Error('No base64 encoder available in this environment.');
}

function truncate(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length - 3)}...`;
}

function sanitize(value: string): string {
  return value.replace(/[<>`]/g, '');
}

function createPlaceholderSvg({
  provider,
  prompt,
  negative,
  accent,
}: {
  provider: AiProviderName;
  prompt: string;
  negative?: string;
  accent: string;
}): string {
  const width = 512;
  const height = 512;
  const sanitizedPrompt = truncate(sanitize(prompt), 120);
  const sanitizedNegative = truncate(sanitize(negative ?? 'none'), 90);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" style="background:#0f172a;font-family:Inter,Segoe UI,sans-serif;">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)" />
    <text x="32" y="80" font-size="48" fill="#e0f2fe" font-weight="700">${provider.toUpperCase()}</text>
    <text x="32" y="140" font-size="20" fill="#bae6fd">Placeholder preview</text>
    <text x="32" y="220" font-size="18" fill="#f8fafc" opacity="0.9">Prompt:</text>
    <text x="32" y="252" font-size="16" fill="#f8fafc" opacity="0.85">${sanitizedPrompt}</text>
    <text x="32" y="320" font-size="18" fill="#f8fafc" opacity="0.9">Negative:</text>
    <text x="32" y="352" font-size="16" fill="#f8fafc" opacity="0.8">${sanitizedNegative}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
}

function createStubbedProvider(definition: ProviderDefinition, config: AiProviderConfig): AiProvider {
  const credentialed = definition.hasCredential(config);
  const reason = credentialed
    ? 'Stubbed provider invocation (network disabled in dev sandbox).'
    : 'Missing credentials - returning placeholder imagery.';

  return {
    name: definition.name,
    async generate(request) {
      const count = Math.max(1, Math.min(8, request.count));
      return Array.from({ length: count }).map((_, index) => ({
        id: `${definition.name}-${Date.now()}-${index}`,
        provider: definition.name,
        url: createPlaceholderSvg({
          provider: definition.name,
          prompt: request.prompt,
          negative: request.negativePrompt,
          accent: definition.accent,
        }),
        description: `${definition.name} placeholder (#${index + 1}). ${reason}`,
        placeholder: true,
      }));
    },
  };
}

export function createAiProvider(
  name: AiProviderName,
  config: AiProviderConfig = {},
): AiProvider {
  const definition = findProviderDefinition(name);
  return createStubbedProvider(definition, config);
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
  const { provider, prompt, negativePrompt, count = 4, size = { width: 512, height: 512 }, config } = options;
  const aiProvider = createAiProvider(provider, config);
  return aiProvider.generate({
    prompt,
    negativePrompt,
    count,
    size,
  });
}