import React, { useRef } from 'react';
import { STORAGE_KEY, createInitialState, useStudioStore } from '../../store/studioStore';
import { StudioState } from '../../types';
import { logError, logInfo, logWarn } from '../../services/logger';

export function SettingsPanel() {
  const { state, dispatch } = useStudioStore();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pixel-persona-project.json';
    link.click();
    URL.revokeObjectURL(url);
    logInfo('Project exported', {
      characters: state.characters.length,
      frames: state.characters.reduce((count, character) => count + character.frames.length, 0),
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    logInfo('Project import requested', {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as StudioState;
      if (!parsed.characters?.length) throw new Error('Invalid project file');
      dispatch({ type: 'HYDRATE', state: parsed });
      logInfo('Project import completed', {
        name: file.name,
        characters: parsed.characters.length,
      });
    } catch (error) {
      logError('Failed to import project file', { error, name: file.name });
      alert('Failed to import project file.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset studio to default state? This will clear local data.')) return;
    const fresh = createInitialState();
    dispatch({ type: 'HYDRATE', state: fresh });
    window.localStorage.removeItem(STORAGE_KEY);
    logWarn('Studio reset to initial state');
  };

  return (
    <div className="panel">
      <div className="panel-header">Project Settings</div>
      <div className="settings-actions">
        <button onClick={handleExport}>Export project</button>
        <button onClick={() => fileInput.current?.click()}>Import project</button>
        <button onClick={handleReset}>Reset studio</button>
      </div>
      <input
        type="file"
        accept="application/json"
        ref={fileInput}
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      <p className="hint">Project files include characters, frames, palette choices and studio preferences.</p>
    </div>
  );
}
