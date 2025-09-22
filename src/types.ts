export type FitMode = 'contain' | 'cover' | 'stretch';

export interface FrameAsset {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  file: File;
}

export interface PlaybackSettings {
  delay: number;
  loop: boolean;
}

export interface ExportSettings {
  width: number;
  height: number;
  background: string;
  fitMode: FitMode;
}
