import React, { useState } from 'react';
import { useStudioStore, useActiveCharacter } from '../../store/studioStore';
import { generateAIImage, generateAIGif } from '../../services/aiService';

export function AIGeneratorPanel() {
  const { state, dispatch } = useStudioStore();
  const character = useActiveCharacter();
  const [prompt, setPrompt] = useState('heroic explorer with emerald cloak');
  const [seed, setSeed] = useState<number>(42);
  const [preview, setPreview] = useState<string | null>(null);
  const [gifPreview, setGifPreview] = useState<string | null>(null);
  const [gifFrames, setGifFrames] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');

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
      setStatus('Sprite generated');
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
      setStatus('Animated GIF ready');
    } catch (error) {
      console.error(error);
      setStatus('Failed to generate GIF');
    }
  };

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
