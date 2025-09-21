export type StableDiffusionModelSource = 'suggested' | 'custom';

export interface StableDiffusionModelSuggestion {
  id: string;
  name: string;
  rating: number;
  description: string;
  tags: string[];
  author: string;
  styleTuning: {
    highlightBoost: number;
    shadowDepth: number;
    saturationShift: number;
    capeBias: number;
    detailBias: number;
  };
}

export const POPULAR_STABLE_DIFFUSION_MODELS: StableDiffusionModelSuggestion[] = [
  {
    id: 'sprite-diffusion-v2',
    name: 'Sprite Diffusion v2',
    rating: 4.8,
    description:
      'Crisp pixel-perfect renders tuned for heroic fantasy sprites with energetic lighting and bold silhouettes.',
    tags: ['fantasy', 'pixel-art', 'heroic'],
    author: 'Mythic Foundry',
    styleTuning: {
      highlightBoost: 0.08,
      shadowDepth: 0.05,
      saturationShift: 0.06,
      capeBias: 0.12,
      detailBias: 0.08,
    },
  },
  {
    id: 'arcane-illustration-xl',
    name: 'Arcane Illustration XL',
    rating: 4.7,
    description:
      'Painterly shading with luminous magical accents inspired by high-fantasy trading card artwork.',
    tags: ['illustrative', 'magic', 'luminous'],
    author: 'Studio Astral',
    styleTuning: {
      highlightBoost: 0.12,
      shadowDepth: 0.02,
      saturationShift: 0.1,
      capeBias: 0.05,
      detailBias: 0.04,
    },
  },
  {
    id: 'retro-rpg-pro',
    name: 'Retro RPG Pro',
    rating: 4.6,
    description:
      'Authentic 16-bit era proportions with deliberate dithering and earth-toned palettes for classic RPG vibes.',
    tags: ['retro', 'dither', 'rpg'],
    author: 'Pixel Forge Collective',
    styleTuning: {
      highlightBoost: -0.02,
      shadowDepth: 0.08,
      saturationShift: -0.05,
      capeBias: 0.18,
      detailBias: 0.02,
    },
  },
  {
    id: 'mecha-sketch-hd',
    name: 'Mecha Sketch HD',
    rating: 4.5,
    description:
      'Dynamic cel-shaded metal rendering with high-frequency panel detail perfect for mechanized heroes.',
    tags: ['mecha', 'cel-shaded', 'sci-fi'],
    author: 'Astra Mechanics',
    styleTuning: {
      highlightBoost: 0.04,
      shadowDepth: 0.12,
      saturationShift: 0.02,
      capeBias: -0.08,
      detailBias: 0.14,
    },
  },
];

export const DEFAULT_STABLE_DIFFUSION_MODEL_ID = POPULAR_STABLE_DIFFUSION_MODELS[0]?.id ?? 'sprite-diffusion-v2';

export function getModelSuggestionById(id?: string | null) {
  if (!id) return undefined;
  return POPULAR_STABLE_DIFFUSION_MODELS.find((model) => model.id === id);
}

export function getModelStyleTuning(modelId?: string | null) {
  const suggestion = getModelSuggestionById(modelId ?? undefined);
  return suggestion?.styleTuning;
}
