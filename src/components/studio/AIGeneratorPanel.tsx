import React, { useEffect, useState } from 'react';
import { useStudioStore, useActiveCharacter } from '../../store/studioStore';
import {
  generateAIImage,
  generateAIGif,
  setupLocalStableDiffusion,
  getStableDiffusionState,
  StableDiffusionSetupProgress,
  StableDiffusionState,
} from '../../services/aiService';

export function AIGeneratorPanel() {
  const { state, dispatch } = useStudioStore();
  const character = useActiveCharacter();
  const [prompt, setPrompt] = useState('heroic explorer with emerald cloak');
  const [seed, setSeed] = useState<number>(42);
  const [preview, setPreview] = useState<string | null>(null);
  const [gifPreview, setGifPreview] = useState<string | null>(null);
  const [gifFrames, setGifFrames] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');
  const [setupPhase, setSetupPhase] = useState<StableDiffusionSetupProgress['phase']>('checking');
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupMessage, setSetupMessage] = useState('');
  const [setupLogs, setSetupLogs] = useState<string[]>([]);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [localRuntime, setLocalRuntime] = useState<StableDiffusionState | null>(() => getStableDiffusionState());

  useEffect(() => {
    const runtime = getStableDiffusionState();
    if (runtime?.ready) {
      setLocalRuntime(runtime);
      const shouldUpdatePath = state.settings.stableDiffusionPath !== runtime.path;
      const shouldUpdateVersion = state.settings.stableDiffusionVersion !== runtime.version;
      if (!state.settings.stableDiffusionReady || shouldUpdatePath || shouldUpdateVersion) {
        dispatch({
          type: 'SET_SETTINGS',
          settings: {
            stableDiffusionReady: true,
            stableDiffusionPath: runtime.path,
            stableDiffusionVersion: runtime.version,
          },
        });
      }
    } else if (state.settings.stableDiffusionReady) {
      dispatch({
        type: 'SET_SETTINGS',
        settings: { stableDiffusionReady: false },
      });
    }
  }, [dispatch, state.settings.stableDiffusionPath, state.settings.stableDiffusionReady, state.settings.stableDiffusionVersion]);

  useEffect(() => {
    if (localRuntime?.logs?.length) {
      setSetupLogs(localRuntime.logs);
      setSetupMessage('Stable Diffusion runtime ready.');
      setSetupProgress(100);
      setSetupPhase('ready');
    }
  }, [localRuntime]);

  const handleGenerateSprite = async () => {
    setStatus('Generating sprite...');
    try {
      const result = await generateAIImage({
        prompt,
        width: character.width,
        height: character.height,
        palette: character.palette,
        seed,
        settings: state.settings,
      });
      setPreview(result.imageUrl);
      setStatus(
        `Sprite generated via ${
          result.source === 'local'
            ? 'local Stable Diffusion pipeline'
            : result.source === 'remote'
              ? 'remote endpoint'
              : 'procedural synthesizer'
        }.`
      );
      if (result.pixels) {
        dispatch({ type: 'SET_LAYER_PIXELS', layerId: state.activeLayerId, pixels: result.pixels });
      }
    } catch (error) {
      console.error(error);
      setStatus('Failed to generate sprite');
    }
  };

  const handleGenerateGif = async () => {
    setStatus('Synthesizing animated GIF...');
    try {
      const result = await generateAIGif({
        prompt,
        width: character.width,
        height: character.height,
        palette: character.palette,
        seed,
        settings: state.settings,
      });
      setGifPreview(result.gifUrl);
      setGifFrames(result.frames);
      setStatus(
        `Animated GIF ready via ${
          result.source === 'local' ? 'local Stable Diffusion timeline' : 'procedural animator'
        }.`
      );
    } catch (error) {
      console.error(error);
      setStatus('Failed to generate GIF');
    }
  };

  const handleSetupStableDiffusion = async () => {
    setIsSettingUp(true);
    setSetupLogs([]);
    setSetupProgress(10);
    setSetupPhase('checking');
    setSetupMessage('Preparing local runtime...');
    try {
      const result = await setupLocalStableDiffusion({
        version: state.settings.stableDiffusionVersion ?? '1.5',
        installPath: state.settings.stableDiffusionPath,
        autoDownload: state.settings.stableDiffusionAutoDownload,
        onProgress: (progress) => {
          setSetupPhase(progress.phase);
          setSetupProgress(progress.percent);
          setSetupMessage(progress.message);
        },
      });
      setSetupLogs(result.logs);
      setLocalRuntime(getStableDiffusionState());
      dispatch({
        type: 'SET_SETTINGS',
        settings: {
          stableDiffusionReady: result.ready,
          stableDiffusionPath: result.path,
          stableDiffusionVersion: result.version,
          enableLocalAi: result.ready ? true : state.settings.enableLocalAi,
        },
      });
      setSetupMessage(result.ready ? 'Stable Diffusion runtime ready.' : 'Setup incomplete. Check logs.');
      setSetupProgress(100);
      setSetupPhase('ready');
    } catch (error) {
      console.error(error);
      setSetupMessage('Failed to configure Stable Diffusion');
      setSetupLogs((logs) => [...logs, 'Setup failed. Please verify your configuration.']);
      setSetupPhase('ready');
    } finally {
      setIsSettingUp(false);
    }
  };

  const runtimeStatus = state.settings.stableDiffusionReady
    ? `Ready (v${state.settings.stableDiffusionVersion ?? localRuntime?.version ?? 'unknown'}) at ${
        state.settings.stableDiffusionPath ?? localRuntime?.path ?? 'configured location'
      }`
    : 'Not installed';

  return (
    <div className="ai-panel">
      <div className="panel">
        <div className="panel-header">AI Prompting</div>
        <label className="field">
          Prompt
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        </label>
        <label className="field inline">
          Seed
          <input
            type="number"
            value={seed}
            onChange={(event) => setSeed(Number(event.target.value))}
          />
        </label>
        <label className="field inline">
          Preferred model
          <input
            type="text"
            value={state.settings.aiModel ?? ''}
            placeholder="e.g. sprite-diffusion-v2"
            onChange={(event) => dispatch({ type: 'SET_SETTINGS', settings: { aiModel: event.target.value } })}
          />
        </label>
        <label className="field">
          Remote endpoint
          <input
            type="text"
            placeholder="https://api.example.com/generate"
            value={state.settings.aiEndpoint ?? ''}
            onChange={(event) => dispatch({ type: 'SET_SETTINGS', settings: { aiEndpoint: event.target.value } })}
          />
        </label>
        <label className="field">
          API key (stored locally)
          <input
            type="password"
            value={state.settings.aiApiKey ?? ''}
            onChange={(event) => dispatch({ type: 'SET_SETTINGS', settings: { aiApiKey: event.target.value } })}
          />
        </label>
        <label className="field inline">
          Prefer procedural fallback
          <input
            type="checkbox"
            checked={state.settings.preferProcedural}
            onChange={(event) =>
              dispatch({ type: 'SET_SETTINGS', settings: { preferProcedural: event.target.checked } })
            }
          />
        </label>
        <div className="panel-subheader">Local Stable Diffusion Runtime</div>
        <label className="field inline">
          Use local Stable Diffusion
          <input
            type="checkbox"
            checked={state.settings.enableLocalAi}
            onChange={(event) =>
              dispatch({ type: 'SET_SETTINGS', settings: { enableLocalAi: event.target.checked } })
            }
          />
        </label>
        <label className="field inline">
          Auto download assets
          <input
            type="checkbox"
            checked={state.settings.stableDiffusionAutoDownload}
            onChange={(event) =>
              dispatch({
                type: 'SET_SETTINGS',
                settings: { stableDiffusionAutoDownload: event.target.checked },
              })
            }
          />
        </label>
        <label className="field inline">
          Stable Diffusion version
          <input
            type="text"
            value={state.settings.stableDiffusionVersion ?? '1.5'}
            onChange={(event) =>
              dispatch({ type: 'SET_SETTINGS', settings: { stableDiffusionVersion: event.target.value } })
            }
          />
        </label>
        <label className="field">
          Install location
          <input
            type="text"
            placeholder="~/stable-diffusion/1.5"
            value={state.settings.stableDiffusionPath ?? ''}
            onChange={(event) =>
              dispatch({ type: 'SET_SETTINGS', settings: { stableDiffusionPath: event.target.value } })
            }
          />
        </label>
        <div className="runtime-status">
          <strong>Status:</strong> {runtimeStatus}
        </div>
        <div className="runtime-actions">
          <button onClick={handleSetupStableDiffusion} disabled={isSettingUp}>
            {isSettingUp ? 'Configuring...' : 'Download & Configure Stable Diffusion'}
          </button>
        </div>
        {(isSettingUp || setupProgress > 0) && (
          <div className="setup-progress">
            <div className="progress-bar" style={{ width: `${setupProgress}%` }} />
            <span className="progress-message">{setupMessage}</span>
            <span className="progress-phase">Phase: {setupPhase}</span>
          </div>
        )}
        {setupLogs.length > 0 && (
          <ul className="setup-log">
            {setupLogs.map((log, index) => (
              <li key={index}>{log}</li>
            ))}
          </ul>
        )}
        <div className="ai-actions">
          <button onClick={handleGenerateSprite}>Generate Sprite</button>
          <button onClick={handleGenerateGif}>Generate GIF</button>
        </div>
        <div className="status">{status}</div>
      </div>
      <div className="panel">
        <div className="panel-header">Preview</div>
        {preview ? <img src={preview} alt="AI sprite" className="preview-image" /> : <p>No sprite yet.</p>}
        {gifPreview ? <img src={gifPreview} alt="AI gif" className="preview-gif" /> : <p>No GIF yet.</p>}
        {gifFrames.length > 0 && (
          <div className="frame-strip">
            {gifFrames.map((frameUrl, index) => (
              <img key={index} src={frameUrl} alt={`Frame ${index + 1}`} className="frame-thumb" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
