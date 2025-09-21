import { useMemo, useState } from 'react';
import { CharacterForm } from '../components/CharacterForm';
import { GenerationGrid } from '../components/GenerationGrid';
import { GifBuilder } from '../components/GifBuilder';
import { APP_INTENT } from '../intent';
import { characterToPrompt } from '../domain/character';
import { generateCharacterImages, type AiProviderName } from '../services/ai';
import { useAppStore } from '../state/store';

const PROVIDER_LABELS: Record<AiProviderName, string> = {
  openai: 'OpenAI',
  stability: 'Stability AI',
  automatic1111: 'AUTOMATIC1111',
};

export default function Home() {
  const character = useAppStore((state) => state.character);
  const setGeneratedImages = useAppStore((state) => state.setGeneratedImages);
  const addGeneratedImages = useAppStore((state) => state.addGeneratedImages);

  const [provider, setProvider] = useState<AiProviderName>('openai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [append, setAppend] = useState(false);

  const prompt = useMemo(() => characterToPrompt(character), [character]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const images = await generateCharacterImages({
        provider,
        prompt: prompt.positive,
        negativePrompt: prompt.negative,
        count: 4,
      });
      if (append) {
        addGeneratedImages(images);
      } else {
        setGeneratedImages(images);
      }
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : 'Generation failed.';
      setError(message);
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
            Craft characters, generate reference frames with your preferred provider, then export a looping GIF.
          </p>
        </div>
        <div className="provider-picker">
          <label>
            <span>Provider</span>
            <select value={provider} onChange={(event) => setProvider(event.target.value as AiProviderName)}>
              {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={append} onChange={() => setAppend(!append)} />
            <span>Append to existing grid</span>
          </label>
          <button type="button" className="button button--primary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Frames'}
          </button>
        </div>
      </header>

      <main className="page__body">
        <CharacterForm />
        <section className="panel" aria-labelledby="prompt-preview-heading">
          <div className="panel__header">
            <div>
              <h2 id="prompt-preview-heading">Prompt Preview</h2>
              <p>Review the composed prompt before requesting a generation.</p>
            </div>
          </div>
          <dl className="prompt-preview">
            <div>
              <dt>Positive</dt>
              <dd>{prompt.positive}</dd>
            </div>
            <div>
              <dt>Negative</dt>
              <dd>{prompt.negative}</dd>
            </div>
            <div>
              <dt>Summary</dt>
              <dd>{prompt.summary}</dd>
            </div>
          </dl>
          {error && <p className="panel__error">{error}</p>}
        </section>

        <GenerationGrid />
        <GifBuilder />
      </main>
    </div>
  );
}