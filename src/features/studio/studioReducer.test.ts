import { describe, expect, it } from 'vitest';

import type { FrameAsset } from '../../types';
import {
  DEFAULT_EXPORT,
  DEFAULT_PLAYBACK,
  initialStudioState,
  studioReducer,
  type StudioState,
} from './studioReducer';

const createFrame = (overrides: Partial<FrameAsset> = {}): FrameAsset => ({
  id: 'frame-1',
  name: 'frame.png',
  url: 'blob:frame',
  width: 128,
  height: 128,
  file: {
    name: 'frame.png',
    size: 0,
    type: 'image/png',
  } as File,
  ...overrides,
});

describe('studioReducer', () => {
  it('adds frames and selects the first one', () => {
    const frame = createFrame();
    const state = studioReducer(initialStudioState, { type: 'ADD_FRAMES', frames: [frame] });
    expect(state.frames).toHaveLength(1);
    expect(state.currentFrameId).toBe(frame.id);
    expect(state.exportSettings.width).toBe(frame.width);
    expect(state.exportSettings.height).toBe(frame.height);
  });

  it('clamps export dimensions when updating settings', () => {
    const starting: StudioState = {
      ...initialStudioState,
      frames: [createFrame()],
      currentFrameId: 'frame-1',
    };
    const next = studioReducer(starting, {
      type: 'SET_EXPORT_SETTINGS',
      settings: { width: 9999, height: -50 },
    });
    expect(next.exportSettings.width).toBe(2048);
    expect(next.exportSettings.height).toBe(32);
  });

  it('enforces a minimum playback delay', () => {
    const next = studioReducer(initialStudioState, {
      type: 'SET_PLAYBACK_DELAY',
      delay: 5,
    });
    expect(next.playback.delay).toBe(20);
  });

  it('resets to defaults when clearing frames', () => {
    const populated: StudioState = {
      frames: [createFrame()],
      currentFrameId: 'frame-1',
      playback: { ...DEFAULT_PLAYBACK, delay: 80 },
      exportSettings: { ...DEFAULT_EXPORT, width: 300 },
      isPlaying: true,
    };
    const next = studioReducer(populated, { type: 'CLEAR_FRAMES' });
    expect(next.frames).toHaveLength(0);
    expect(next.currentFrameId).toBeNull();
    expect(next.isPlaying).toBe(false);
  });
});
