import { useState } from 'react';
import { CharacterCreator } from '../components/CharacterCreator';
import { GifBuilder } from '../components/GifBuilder';
import { APP_INTENT } from '../intent';
import { generateCharacterImages } from '../services/ai';
import { useAppStore } from '../state/store';

export default function Home() {
  const offlineMode = useAppStore((state) => state.offlineMode);
  const addFrames = useAppStore((state) => state.addFrames);

  const [stubPrompt, setStubPrompt] = useState('Offline hero concept');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  const handleGenerateStub = async () => {
    setIsGenerating(true);
    setGenerationMessage(null);
    try {
      const images = await generateCharacterImages({
        provider: 'stub',
        prompt: stubPrompt,
        negativePrompt: '',
        count: 3,
      });
      addFrames(
        images.map((image, index) => ({
          id: image.id,
          name: image.description || `Stub frame #${index + 1}`,
          url: image.url,
          source: 'stub',
          placeholder: image.placeholder,
        })),
      );
      setGenerationMessage('Stub frames added to GIF builder.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate stub frames.';
      setGenerationMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="page__intent">{APP_INTENT}</p>
          <h1>Gif Studio</h1>
          <p className="page__summary">
            Stay offline and keep creating. Layer local character parts, drop in any PNGs, and export a polished GIF.
          </p>
        </div>
      </header>

      {offlineMode && (
        <div className="offline-banner" role="status">
          <strong>Offline Mode Enabled</strong>
          <span>Using local assets and stub providers. No network calls will be made.</span>
        </div>
      )}

      <main className="page__body">
        <section className="panel" aria-labelledby="stub-provider-heading">
          <div className="panel__header">
            <div>
              <h2 id="stub-provider-heading">Stub Frame Library</h2>
              <p>Generate placeholder frames bundled with the app, handy for quick animations.</p>
            </div>
          </div>
          <div className="stub-controls">
            <label className="form-field form-field--wide">
              <span>Prompt</span>
              <input
                type="text"
                value={stubPrompt}
                onChange={(event) => setStubPrompt(event.target.value)}
                placeholder="Describe your offline hero"
              />
            </label>
            <button type="button" className="button button--primary" onClick={handleGenerateStub} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Add Stub Frames'}
            </button>
          </div>
          {generationMessage && <p className="panel__info">{generationMessage}</p>}
        </section>

        <CharacterCreator />
        <GifBuilder />
      </main>
    </div>
  );
}
