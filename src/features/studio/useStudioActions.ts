import { useCallback } from 'react';

import type { ExportSettings, FrameAsset } from '../../types';
import { useStudioDispatch } from './StudioProvider';

export const useStudioActions = () => {
  const dispatch = useStudioDispatch();

  const addFrames = useCallback(
    (frames: FrameAsset[]) => dispatch({ type: 'ADD_FRAMES', frames }),
    [dispatch]
  );

  const selectFrame = useCallback(
    (id: string | null) => dispatch({ type: 'SELECT_FRAME', id }),
    [dispatch]
  );

  const moveFrame = useCallback(
    (id: string, targetIndex: number) => dispatch({ type: 'MOVE_FRAME', id, targetIndex }),
    [dispatch]
  );

  const removeFrame = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_FRAME', id }),
    [dispatch]
  );

  const clearFrames = useCallback(() => dispatch({ type: 'CLEAR_FRAMES' }), [dispatch]);

  const setPlaybackDelay = useCallback(
    (delay: number) => dispatch({ type: 'SET_PLAYBACK_DELAY', delay }),
    [dispatch]
  );

  const setPlaybackLoop = useCallback(
    (loop: boolean) => dispatch({ type: 'SET_PLAYBACK_LOOP', loop }),
    [dispatch]
  );

  const setPlaying = useCallback(
    (isPlaying: boolean) => dispatch({ type: 'SET_PLAYING', isPlaying }),
    [dispatch]
  );

  const updateExportSettings = useCallback(
    (settings: Partial<ExportSettings>) =>
      dispatch({ type: 'SET_EXPORT_SETTINGS', settings }),
    [dispatch]
  );

  return {
    addFrames,
    selectFrame,
    moveFrame,
    removeFrame,
    clearFrames,
    setPlaybackDelay,
    setPlaybackLoop,
    setPlaying,
    updateExportSettings,
  };
};
