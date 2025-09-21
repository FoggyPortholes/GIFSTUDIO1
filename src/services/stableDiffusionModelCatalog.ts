export const DEFAULT_STABLE_DIFFUSION_MODEL_ID = 'stabilityai/stable-diffusion-1-5';

export interface StableDiffusionModelInfo {
  id: string;
  label: string;
  source: 'suggested' | 'community';
}

export const SUGGESTED_MODELS: StableDiffusionModelInfo[] = [
  {
    id: DEFAULT_STABLE_DIFFUSION_MODEL_ID,
    label: 'Stable Diffusion v1.5 (Stability AI)',
    source: 'suggested',
  },
];

export function findModelById(modelId: string): StableDiffusionModelInfo | undefined {
  return SUGGESTED_MODELS.find((model) => model.id === modelId);
}
