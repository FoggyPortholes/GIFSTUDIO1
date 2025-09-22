import type { ExportSettings, FrameAsset, PlaybackSettings } from '../../types';

export interface StudioState {
  frames: FrameAsset[];
  currentFrameId: string | null;
  playback: PlaybackSettings;
  exportSettings: ExportSettings;
  isPlaying: boolean;
}

export type StudioAction =
  | { type: 'ADD_FRAMES'; frames: FrameAsset[] }
  | { type: 'SELECT_FRAME'; id: string | null }
  | { type: 'MOVE_FRAME'; id: string; targetIndex: number }
  | { type: 'REMOVE_FRAME'; id: string }
  | { type: 'CLEAR_FRAMES' }
  | { type: 'SET_PLAYBACK_DELAY'; delay: number }
  | { type: 'SET_PLAYBACK_LOOP'; loop: boolean }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_EXPORT_SETTINGS'; settings: Partial<ExportSettings> };

export const DEFAULT_PLAYBACK: PlaybackSettings = {
  delay: 120,
  loop: true,
};

export const DEFAULT_EXPORT: ExportSettings = {
  width: 512,
  height: 512,
  background: '#0f172a',
  fitMode: 'contain',
};

export const initialStudioState: StudioState = {
  frames: [],
  currentFrameId: null,
  playback: DEFAULT_PLAYBACK,
  exportSettings: DEFAULT_EXPORT,
  isPlaying: false,
};

const clampDimension = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 32;
  }
  return Math.min(2048, Math.round(value));
};

const sanitizeExportSettings = (settings: ExportSettings): ExportSettings => ({
  ...settings,
  width: clampDimension(settings.width),
  height: clampDimension(settings.height),
});

const moveFrame = (frames: FrameAsset[], id: string, targetIndex: number) => {
  const index = frames.findIndex((frame) => frame.id === id);
  if (index === -1 || targetIndex < 0 || targetIndex >= frames.length) {
    return frames;
  }

  if (index === targetIndex) {
    return frames;
  }

  const updated = [...frames];
  const [frame] = updated.splice(index, 1);
  updated.splice(targetIndex, 0, frame);
  return updated;
};

export const studioReducer = (state: StudioState, action: StudioAction): StudioState => {
  switch (action.type) {
    case 'ADD_FRAMES': {
      if (!action.frames.length) {
        return state;
      }
      const frames = [...state.frames, ...action.frames];
      const firstNew = action.frames[0];
      const exportSettings = state.frames.length
        ? state.exportSettings
        : sanitizeExportSettings({
            ...state.exportSettings,
            width: firstNew.width,
            height: firstNew.height,
          });
      const currentFrameId = state.currentFrameId ?? firstNew.id;
      return {
        ...state,
        frames,
        currentFrameId,
        exportSettings,
      };
    }
    case 'SELECT_FRAME': {
      if (!action.id) {
        return {
          ...state,
          currentFrameId: state.frames[0]?.id ?? null,
        };
      }
      const exists = state.frames.some((frame) => frame.id === action.id);
      return {
        ...state,
        currentFrameId: exists ? action.id : state.frames[0]?.id ?? null,
      };
    }
    case 'MOVE_FRAME': {
      const frames = moveFrame(state.frames, action.id, action.targetIndex);
      return frames === state.frames ? state : { ...state, frames };
    }
    case 'REMOVE_FRAME': {
      if (!state.frames.some((frame) => frame.id === action.id)) {
        return state;
      }
      const frames = state.frames.filter((frame) => frame.id !== action.id);
      const currentFrameId =
        state.currentFrameId === action.id ? frames[0]?.id ?? null : state.currentFrameId;
      const isPlaying = frames.length > 1 ? state.isPlaying : false;
      return {
        ...state,
        frames,
        currentFrameId,
        isPlaying,
      };
    }
    case 'CLEAR_FRAMES': {
      return {
        ...state,
        frames: [],
        currentFrameId: null,
        isPlaying: false,
      };
    }
    case 'SET_PLAYBACK_DELAY': {
      const delay = Math.max(20, Math.round(action.delay));
      if (delay === state.playback.delay) {
        return state;
      }
      return {
        ...state,
        playback: { ...state.playback, delay },
      };
    }
    case 'SET_PLAYBACK_LOOP': {
      if (action.loop === state.playback.loop) {
        return state;
      }
      return {
        ...state,
        playback: { ...state.playback, loop: action.loop },
      };
    }
    case 'SET_PLAYING': {
      if (action.isPlaying === state.isPlaying) {
        return state;
      }
      if (action.isPlaying && state.frames.length <= 1) {
        return state;
      }
      return {
        ...state,
        isPlaying: action.isPlaying,
      };
    }
    case 'SET_EXPORT_SETTINGS': {
      const next = sanitizeExportSettings({
        ...state.exportSettings,
        ...action.settings,
      });
      return {
        ...state,
        exportSettings: next,
      };
    }
    default:
      return state;
  }
};
