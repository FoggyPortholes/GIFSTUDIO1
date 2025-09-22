import { create } from 'zustand';
import { isFlagEnabled } from '../lib/env';

export interface CharacterAsset {
  id: string;
  label: string;
  src: string;
}

export interface CharacterManifest {
  version: number;
  bodies: CharacterAsset[];
  heads: CharacterAsset[];
  outfits: CharacterAsset[];
}

export interface CreatorSelection {
  bodyId: string | null;
  headId: string | null;
  outfitId: string | null;
}

export type FrameSource = 'stub' | 'character' | 'upload';

export interface FrameItem {
  id: string;
  name: string;
  url: string;
  source: FrameSource;
  placeholder?: boolean;
  width?: number;
  height?: number;
}

interface AppState {
  offlineMode: boolean;
  manifest: CharacterManifest | null;
  selection: CreatorSelection;
  frames: FrameItem[];
  frameDelay: number;
  loopGif: boolean;
  setManifest: (manifest: CharacterManifest) => void;
  setSelection: (selection: Partial<CreatorSelection>) => void;
  addFrame: (frame: FrameItem) => void;
  addFrames: (frames: FrameItem[]) => void;
  updateFrame: (id: string, updates: Partial<FrameItem>) => void;
  moveFrame: (sourceId: string, targetId: string) => void;
  removeFrame: (id: string) => void;
  clearFrames: () => void;
  setFrameDelay: (delay: number) => void;
  setLoopGif: (loop: boolean) => void;
}

function initialSelection(): CreatorSelection {
  return { bodyId: null, headId: null, outfitId: null };
}

function assetExists(list: CharacterAsset[], id: string | null): boolean {
  if (!id) {
    return false;
  }
  return list.some((asset) => asset.id === id);
}

function ensureSelection(manifest: CharacterManifest, current: CreatorSelection): CreatorSelection {
  const next = { ...current };
  if (!assetExists(manifest.bodies, next.bodyId)) {
    next.bodyId = manifest.bodies[0]?.id ?? null;
  }
  if (!assetExists(manifest.heads, next.headId)) {
    next.headId = manifest.heads[0]?.id ?? null;
  }
  if (!assetExists(manifest.outfits, next.outfitId)) {
    next.outfitId = manifest.outfits[0]?.id ?? null;
  }
  return next;
}

function sanitizeDelay(delay: number): number {
  if (!Number.isFinite(delay)) {
    return 160;
  }
  return Math.max(40, Math.min(1000, Math.round(delay)));
}

const offlineMode = isFlagEnabled('OFFLINE_MODE') || isFlagEnabled('VITE_OFFLINE_MODE');

export const useAppStore = create<AppState>((set, get) => ({
  offlineMode,
  manifest: null,
  selection: initialSelection(),
  frames: [],
  frameDelay: 160,
  loopGif: true,
  setManifest: (manifest) => {
    set((state) => ({
      manifest,
      selection: ensureSelection(manifest, state.selection),
    }));
  },
  setSelection: (partial) => {
    set((state) => {
      const manifest = state.manifest;
      if (!manifest) {
        return {};
      }
      const next: CreatorSelection = { ...state.selection };
      if (partial.bodyId === null || partial.bodyId === undefined) {
        // ignore missing
      } else if (assetExists(manifest.bodies, partial.bodyId)) {
        next.bodyId = partial.bodyId;
      }
      if (partial.headId === null || partial.headId === undefined) {
        // ignore missing
      } else if (assetExists(manifest.heads, partial.headId)) {
        next.headId = partial.headId;
      }
      if (partial.outfitId === null || partial.outfitId === undefined) {
        // ignore missing
      } else if (assetExists(manifest.outfits, partial.outfitId)) {
        next.outfitId = partial.outfitId;
      }
      return { selection: next };
    });
  },
  addFrame: (frame) => {
    set((state) => ({ frames: [...state.frames, frame] }));
  },
  addFrames: (frames) => {
    set((state) => ({ frames: [...state.frames, ...frames] }));
  },
  updateFrame: (id, updates) => {
    set((state) => ({
      frames: state.frames.map((frame) => (frame.id === id ? { ...frame, ...updates } : frame)),
    }));
  },
  moveFrame: (sourceId, targetId) => {
    set((state) => {
      const frames = [...state.frames];
      const sourceIndex = frames.findIndex((frame) => frame.id === sourceId);
      const targetIndex = frames.findIndex((frame) => frame.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
        return {};
      }
      const [removed] = frames.splice(sourceIndex, 1);
      frames.splice(targetIndex, 0, removed);
      return { frames };
    });
  },
  removeFrame: (id) => {
    set((state) => ({ frames: state.frames.filter((frame) => frame.id !== id) }));
  },
  clearFrames: () => set({ frames: [] }),
  setFrameDelay: (delay) => set({ frameDelay: sanitizeDelay(delay) }),
  setLoopGif: (loop) => set({ loopGif: loop }),
}));
