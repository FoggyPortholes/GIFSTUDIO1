export type PixelColor = string | null;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked?: boolean;
  pixels: PixelColor[];
}

export interface Frame {
  id: string;
  name: string;
  duration: number; // ms
  layers: Layer[];
}

export interface CharacterMetadata {
  description?: string;
  tags?: string[];
  author?: string;
}

export interface CharacterModel {
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[];
  frames: Frame[];
  metadata?: CharacterMetadata;
}

export type BrushMode = 'paint' | 'erase' | 'eyedrop';

export interface StudioSettings {
  aiEndpoint?: string;
  aiApiKey?: string;
  aiModel?: string;
  stableDiffusionModel?: string;
  stableDiffusionModelSource?: 'suggested' | 'custom';
  preferProcedural: boolean;
  enableLocalAi: boolean;
  stableDiffusionAutoDownload: boolean;
  stableDiffusionReady: boolean;
  stableDiffusionVersion?: string;
  stableDiffusionPath?: string;
}

export interface StudioState {
  characters: CharacterModel[];
  activeCharacterId: string;
  activeFrameId: string;
  activeLayerId: string;
  brushColor: string;
  brushMode: BrushMode;
  pixelScale: number;
  settings: StudioSettings;
}
