export interface StudioSettings {
  /** When true, prefer deterministic procedural generation over AI. */
  preferProcedural: boolean;
  /** Enables the local Stable Diffusion pipeline when available. */
  enableLocalAi: boolean;
  /** Indicates whether the Stable Diffusion runtime is ready to serve requests. */
  stableDiffusionReady: boolean;
  /** Version string for the Stable Diffusion runtime. */
  stableDiffusionVersion: string;
  /** Filesystem path to the Stable Diffusion installation. */
  stableDiffusionPath: string;
  /** Optional identifier of the preferred Stable Diffusion model. */
  stableDiffusionModelId?: string;
  /** Indicates whether the model was provided by the user or suggested by the app. */
  stableDiffusionModelSource?: 'suggested' | 'user';
}

export type StableDiffusionModelSource = 'suggested' | 'user';

export interface StableDiffusionState {
  ready: boolean;
  version: string;
  path: string;
  model: string;
  modelSource: StableDiffusionModelSource;
}

export interface StableDiffusionSetupResult {
  ready: boolean;
  version: string;
  path: string;
}

export interface GenerateAIImageParams {
  prompt: string;
  width: number;
  height: number;
  palette: string[];
  seed?: number;
  settings: StudioSettings;
}

export interface GenerateAIImageResponse {
  source: 'local' | 'remote' | 'procedural';
  imageUrl: string;
  seed?: number;
}
