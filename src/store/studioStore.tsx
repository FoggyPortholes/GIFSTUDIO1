import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { createBlankAnimationFrame, createDerivedFrame, createId, createNormalizedCharacter } from '../utils/characterTemplate';
import { blankPixels } from '../utils/frame';
import { DEFAULT_STABLE_DIFFUSION_MODEL_ID } from '../services/stableDiffusionModelCatalog';
import type {
  BrushMode,
  CharacterModel,
  Frame,
  Layer,
  MirrorMode,
  OnionSkinSettings,
  PixelColor,
  StudioSettings,
  StudioState,
} from '../types';

export const STORAGE_KEY = 'pixel-persona-studio-state-v1';

type StudioAction =
  | { type: 'SET_ACTIVE_CHARACTER'; id: string }
  | { type: 'ADD_CHARACTER'; character?: CharacterModel }
  | { type: 'DELETE_CHARACTER'; id: string }
  | { type: 'RENAME_CHARACTER'; id: string; name: string }
  | { type: 'SET_ACTIVE_FRAME'; id: string }
  | { type: 'ADD_FRAME'; mode: 'blank' | 'duplicate' }
  | { type: 'DELETE_FRAME'; id: string }
  | { type: 'RENAME_FRAME'; id: string; name: string }
  | { type: 'SET_FRAME_DURATION'; id: string; duration: number }
  | { type: 'SET_ACTIVE_LAYER'; id: string }
  | { type: 'ADD_LAYER'; name?: string }
  | { type: 'DELETE_LAYER'; id: string }
  | { type: 'RENAME_LAYER'; id: string; name: string }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; id: string }
  | { type: 'PAINT_PIXEL'; x: number; y: number; color: PixelColor }
  | { type: 'SET_BRUSH_COLOR'; color: string }
  | { type: 'SET_BRUSH_MODE'; mode: BrushMode }
  | { type: 'SET_MIRROR_MODE'; mode: MirrorMode }
  | { type: 'SET_PIXEL_SCALE'; scale: number }
  | { type: 'SET_SETTINGS'; settings: Partial<StudioSettings> }
  | { type: 'ADD_PALETTE_COLOR'; color: string }
  | { type: 'UPDATE_PALETTE_COLOR'; index: number; color: string }
  | { type: 'REMOVE_PALETTE_COLOR'; index: number }
  | { type: 'SET_LAYER_PIXELS'; layerId: string; pixels: PixelColor[] }
  | { type: 'SET_ONION_ENABLED'; enabled: boolean }
  | { type: 'SET_ONION_RANGE'; direction: 'previous' | 'next'; count: number }
  | { type: 'SET_ONION_OPACITY'; opacity: number }
  | { type: 'HYDRATE'; state: StudioState };

type StudioContextType = {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
};

const StudioContext = createContext<StudioContextType | undefined>(undefined);

function ensureLayer(state: StudioState, character: CharacterModel, layerId: string) {
  const frame = character.frames.find((f) => f.id === state.activeFrameId) ?? character.frames[0];
  const layer = frame.layers.find((l) => l.id === layerId);
  if (!layer) {
    return frame.layers.find((l) => !l.locked) ?? frame.layers[0];
  }
  return layer;
}

function ensureFrame(character: CharacterModel, frameId: string) {
  return character.frames.find((f) => f.id === frameId) ?? character.frames[0];
}

function updateCharacter(state: StudioState, characterId: string, updater: (character: CharacterModel) => CharacterModel): StudioState {
  const characters = state.characters.map((character) =>
    character.id === characterId ? updater(character) : character
  );
  return { ...state, characters };
}

function reducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'HYDRATE':
      return normalizeState(action.state);
    case 'SET_ACTIVE_CHARACTER': {
      const character = state.characters.find((c) => c.id === action.id) ?? state.characters[0];
      const frame = ensureFrame(character, character.frames[0]?.id);
      const layer = frame.layers.find((l) => !l.locked) ?? frame.layers[0];
      return {
        ...state,
        activeCharacterId: character.id,
        activeFrameId: frame.id,
        activeLayerId: layer?.id ?? state.activeLayerId,
      };
    }
    case 'ADD_CHARACTER': {
      const character = action.character ?? createNormalizedCharacter();
      const characters = [...state.characters, character];
      const frame = character.frames[0];
      const layer = frame.layers.find((l) => !l.locked) ?? frame.layers[0];
      return {
        ...state,
        characters,
        activeCharacterId: character.id,
        activeFrameId: frame.id,
        activeLayerId: layer?.id ?? state.activeLayerId,
      };
    }
    case 'DELETE_CHARACTER': {
      const characters = state.characters.filter((c) => c.id !== action.id);
      if (characters.length === 0) {
        const fallback = createNormalizedCharacter();
        return {
          ...state,
          characters: [fallback],
          activeCharacterId: fallback.id,
          activeFrameId: fallback.frames[0].id,
          activeLayerId: fallback.frames[0].layers[0].id,
        };
      }
      const activeCharacterId = state.activeCharacterId === action.id ? characters[0].id : state.activeCharacterId;
      const activeCharacter = characters.find((c) => c.id === activeCharacterId)!;
      const frame = ensureFrame(activeCharacter, state.activeFrameId);
      const layer = ensureLayer(state, activeCharacter, state.activeLayerId);
      return {
        ...state,
        characters,
        activeCharacterId,
        activeFrameId: frame.id,
        activeLayerId: layer.id,
      };
    }
    case 'RENAME_CHARACTER':
      return updateCharacter(state, action.id, (character) => ({ ...character, name: action.name }));
    case 'SET_ACTIVE_FRAME': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const frame = ensureFrame(character, action.id);
      const activeLayer = frame.layers.find((layer) => layer.id === state.activeLayerId);
      const fallbackLayer = frame.layers.find((layer) => !layer.locked) ?? frame.layers[0];
      return {
        ...state,
        activeFrameId: frame.id,
        activeLayerId: activeLayer?.id ?? fallbackLayer?.id ?? state.activeLayerId,
      };
    }
    case 'ADD_FRAME': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const activeFrame = ensureFrame(character, state.activeFrameId);
      const newFrame =
        action.mode === 'duplicate'
          ? createDerivedFrame(activeFrame)
          : createBlankAnimationFrame(activeFrame);
      const frames = [...character.frames, newFrame];
      return {
        ...updateCharacter(state, character.id, (c) => ({ ...c, frames })),
        activeFrameId: newFrame.id,
        activeLayerId: newFrame.layers.find((layer) => !layer.locked)?.id ?? newFrame.layers[0].id,
      };
    }
    case 'DELETE_FRAME': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      if (character.frames.length <= 1) return state;
      const frames = character.frames.filter((f) => f.id !== action.id);
      const activeFrameId = state.activeFrameId === action.id ? frames[0].id : state.activeFrameId;
      return {
        ...updateCharacter(state, character.id, (c) => ({ ...c, frames })),
        activeFrameId,
      };
    }
    case 'RENAME_FRAME': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const frames = character.frames.map((frame) =>
        frame.id === action.id ? { ...frame, name: action.name } : frame
      );
      return updateCharacter(state, character.id, (c) => ({ ...c, frames }));
    }
    case 'SET_FRAME_DURATION': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const frames = character.frames.map((frame) =>
        frame.id === action.id ? { ...frame, duration: Math.max(40, action.duration) } : frame
      );
      return updateCharacter(state, character.id, (c) => ({ ...c, frames }));
    }
    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.id };
    case 'ADD_LAYER': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const frame = ensureFrame(character, state.activeFrameId);
      const newLayer: Layer = {
        id: createId('layer'),
        name: action.name ?? `Layer ${frame.layers.length + 1}`,
        visible: true,
        pixels: blankPixels(character.width, character.height),
      };
      const frames = character.frames.map((f) =>
        f.id === frame.id ? { ...f, layers: [...f.layers, newLayer] } : f
      );
      return {
        ...updateCharacter(state, character.id, (c) => ({ ...c, frames })),
        activeLayerId: newLayer.id,
      };
    }
    case 'DELETE_LAYER': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const frame = ensureFrame(character, state.activeFrameId);
      if (frame.layers.length <= 1) return state;
      const layers = frame.layers.filter((l) => l.id !== action.id || l.locked);
      if (layers.length === frame.layers.length) return state;
      const frames = character.frames.map((f) =>
        f.id === frame.id ? { ...f, layers } : f
      );
      const activeLayerId = state.activeLayerId === action.id ? layers[0].id : state.activeLayerId;
      return {
        ...updateCharacter(state, character.id, (c) => ({ ...c, frames })),
        activeLayerId,
      };
    }
    case 'RENAME_LAYER': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const frames = character.frames.map((frame) =>
        frame.id === state.activeFrameId
          ? {
              ...frame,
              layers: frame.layers.map((layer) =>
                layer.id === action.id ? { ...layer, name: action.name } : layer
              ),
            }
          : frame
      );
      return updateCharacter(state, character.id, (c) => ({ ...c, frames }));
    }
    case 'TOGGLE_LAYER_VISIBILITY': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const frames = character.frames.map((frame) =>
        frame.id === state.activeFrameId
          ? {
              ...frame,
              layers: frame.layers.map((layer) =>
                layer.id === action.id ? { ...layer, visible: !layer.visible } : layer
              ),
            }
          : frame
      );
      return updateCharacter(state, character.id, (c) => ({ ...c, frames }));
    }
    case 'PAINT_PIXEL': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const frame = ensureFrame(character, state.activeFrameId);
      const layer = frame.layers.find((l) => l.id === state.activeLayerId);
      if (!layer || layer.locked) return state;
      if (action.x < 0 || action.y < 0 || action.x >= character.width || action.y >= character.height) {
        return state;
      }
      const index = action.y * character.width + action.x;
      const frames = character.frames.map((f) => {
        if (f.id !== frame.id) return f;
        return {
          ...f,
          layers: f.layers.map((l) => {
            if (l.id !== layer.id) return l;
            if (l.pixels[index] === action.color) return l;
            const pixels = l.pixels.slice();
            pixels[index] = action.color ?? null;
            return { ...l, pixels };
          }),
        };
      });
      return updateCharacter(state, character.id, (c) => ({ ...c, frames }));
    }
    case 'SET_LAYER_PIXELS': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const frame = ensureFrame(character, state.activeFrameId);
      const layer = frame.layers.find((l) => l.id === action.layerId);
      if (!layer || layer.locked) return state;
      if (action.pixels.length !== layer.pixels.length) return state;
      const frames = character.frames.map((f) =>
        f.id === frame.id
          ? {
              ...f,
              layers: f.layers.map((l) => (l.id === layer.id ? { ...l, pixels: action.pixels.slice() } : l)),
            }
          : f
      );
      return updateCharacter(state, character.id, (c) => ({ ...c, frames }));
    }
    case 'SET_BRUSH_COLOR':
      return { ...state, brushColor: action.color };
    case 'SET_BRUSH_MODE':
      return { ...state, brushMode: action.mode };
    case 'SET_MIRROR_MODE':
      return { ...state, mirrorMode: action.mode };
    case 'SET_PIXEL_SCALE':
      return { ...state, pixelScale: Math.max(4, Math.min(48, Math.round(action.scale))) };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'ADD_PALETTE_COLOR': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      const palette = [...character.palette, action.color];
      return updateCharacter(state, character.id, (c) => ({ ...c, palette }));
    }
    case 'UPDATE_PALETTE_COLOR': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      if (action.index < 0 || action.index >= character.palette.length) return state;
      const palette = character.palette.map((color, idx) => (idx === action.index ? action.color : color));
      return updateCharacter(state, character.id, (c) => ({ ...c, palette }));
    }
    case 'REMOVE_PALETTE_COLOR': {
      const character = state.characters.find((c) => c.id === state.activeCharacterId);
      if (!character) return state;
      if (character.palette.length <= 1) return state;
      const palette = character.palette.filter((_, idx) => idx !== action.index);
      const brushColor = palette.includes(state.brushColor) ? state.brushColor : palette[0];
      return {
        ...updateCharacter(state, character.id, (c) => ({ ...c, palette })),
        brushColor,
      };
    }
    case 'SET_ONION_ENABLED':
      return {
        ...state,
        onionSkin: { ...state.onionSkin, enabled: action.enabled },
      };
    case 'SET_ONION_RANGE': {
      const value = clamp(action.count, 0, 4);
      if (action.direction === 'previous') {
        return {
          ...state,
          onionSkin: { ...state.onionSkin, previous: value },
        };
      }
      return {
        ...state,
        onionSkin: { ...state.onionSkin, next: value },
      };
    }
    case 'SET_ONION_OPACITY':
      return {
        ...state,
        onionSkin: { ...state.onionSkin, opacity: clamp(action.opacity, 0.1, 1) },
      };
    default:
      return state;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createDefaultSettings(): StudioSettings {
  return {
    preferProcedural: true,
    enableLocalAi: false,
    stableDiffusionAutoDownload: true,
    stableDiffusionReady: false,
    stableDiffusionPath: undefined,
    stableDiffusionVersion: undefined,
    aiEndpoint: undefined,
    aiApiKey: undefined,
    aiModel: undefined,
    stableDiffusionModel: DEFAULT_STABLE_DIFFUSION_MODEL_ID,
    stableDiffusionModelSource: 'suggested',
  };
}

function createDefaultOnionSkin(): OnionSkinSettings {
  return {
    enabled: false,
    previous: 1,
    next: 1,
    opacity: 0.45,
  };
}

function normalizeState(state: StudioState): StudioState {
  const defaults = createDefaultSettings();
  const onionDefaults = createDefaultOnionSkin();
  const onion = { ...onionDefaults, ...(state.onionSkin ?? {}) };
  const normalizedPrevious = clamp(Math.round(onion.previous), 0, 4);
  const normalizedNext = clamp(Math.round(onion.next), 0, 4);
  const normalizedOpacity = clamp(onion.opacity, 0.1, 1);
  return {
    ...state,
    brushMode: state.brushMode ?? 'paint',
    mirrorMode: state.mirrorMode ?? 'none',
    pixelScale: clamp(Math.round(state.pixelScale ?? 16), 4, 48),
    settings: { ...defaults, ...state.settings },
    onionSkin: {
      ...onion,
      previous: normalizedPrevious,
      next: normalizedNext,
      opacity: normalizedOpacity,
    },
  };
}

export function createInitialState(): StudioState {
  const defaults = createDefaultSettings();
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StudioState;
        if (parsed && parsed.characters?.length) {
          return normalizeState(parsed);
        }
      } catch (error) {
        console.warn('Failed to parse saved studio state', error);
      }
    }
  }
  const character = createNormalizedCharacter();
  const frame = character.frames[0];
  const layer = frame.layers.find((l) => !l.locked) ?? frame.layers[0];
  return normalizeState({
    characters: [character],
    activeCharacterId: character.id,
    activeFrameId: frame.id,
    activeLayerId: layer.id,
    brushColor: character.palette[0],
    brushMode: 'paint',
    mirrorMode: 'none',
    pixelScale: 16,
    settings: defaults,
    onionSkin: createDefaultOnionSkin(),
  });
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as StudioState, createInitialState);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <StudioContext.Provider value={{ state, dispatch }}>{children}</StudioContext.Provider>;
}

export function useStudioStore() {
  const context = useContext(StudioContext);
  if (!context) throw new Error('useStudioStore must be used within StudioProvider');
  return context;
}

export function useActiveCharacter(): CharacterModel {
  const { state } = useStudioStore();
  const character = state.characters.find((c) => c.id === state.activeCharacterId) ?? state.characters[0];
  if (!character) throw new Error('No character available');
  return character;
}

export function useActiveFrame(): Frame {
  const { state } = useStudioStore();
  const character = state.characters.find((c) => c.id === state.activeCharacterId) ?? state.characters[0];
  if (!character) throw new Error('No character available');
  const frame = character.frames.find((f) => f.id === state.activeFrameId) ?? character.frames[0];
  if (!frame) throw new Error('No frame available');
  return frame;
}

export function useActiveLayer(): Layer {
  const { state } = useStudioStore();
  const frame = useActiveFrame();
  const layer = frame.layers.find((l) => l.id === state.activeLayerId) ?? frame.layers.find((l) => !l.locked) ?? frame.layers[0];
  if (!layer) throw new Error('No layer available');
  return layer;
}
