import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { makeGif, type GifFrame } from '../services/gif/makeGif';
import { useAppStore } from '../state/store';

interface BuilderState {
  isBuilding: boolean;
  error: string | null;
  gifUrl: string | null;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

function toFrame(image: HTMLImageElement, delayMs: number): GifFrame {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2d context is not available.');
  }
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return {
    rgba: new Uint8ClampedArray(imageData.data),
    width,
    height,
    delayMs,
  };
}

export function GifBuilder() {
  const generatedImages = useAppStore((state) => state.generatedImages);
  const selectedImageIds = useAppStore((state) => state.selectedImageIds);
  const loop = useAppStore((state) => state.loopGif);
  const setLoop = useAppStore((state) => state.setLoopGif);
  const clearSelected = useAppStore((state) => state.clearSelectedImages);

  const [delayMs, setDelayMs] = useState(160);
  const [state, setState] = useState<BuilderState>({ isBuilding: false, error: null, gifUrl: null });

  const selectedImages = useMemo(
    () => generatedImages.filter((image) => selectedImageIds.includes(image.id)),
    [generatedImages, selectedImageIds],
  );

  useEffect(() => {
    return () => {
      if (state.gifUrl) {
        URL.revokeObjectURL(state.gifUrl);
      }
    };
  }, [state.gifUrl]);

  const hasSelection = selectedImages.length > 0;

  const handleDelayChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDelayMs(Number.parseInt(event.target.value, 10));
  };

  const handleLoopToggle = () => {
    setLoop(!loop);
  };

  const handleBuild = async () => {
    setState((prev) => ({ ...prev, isBuilding: true, error: null }));
    try {
      const frames: GifFrame[] = [];
      for (const image of selectedImages) {
        const htmlImage = await loadImage(image.url);
        frames.push(toFrame(htmlImage, delayMs));
      }

      const first = frames[0];
      for (const frame of frames) {
        if (frame.width !== first.width || frame.height !== first.height) {
          throw new Error('All frames must share identical dimensions.');
        }
      }

      const bytes = makeGif(frames, { loop });
      const payload = new Uint8Array(bytes.length);
      payload.set(bytes);
      const blob = new Blob([payload], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      if (state.gifUrl) {
        URL.revokeObjectURL(state.gifUrl);
      }
      setState({ isBuilding: false, error: null, gifUrl: url });
    } catch (error) {
      setState({ isBuilding: false, gifUrl: null, error: (error as Error).message });
    }
  };

  const handleDownload = () => {
    if (!state.gifUrl) {
      return;
    }
    const link = document.createElement('a');
    link.href = state.gifUrl;
    link.download = 'character.gif';
    link.click();
  };

  return (
    <section className="panel" aria-labelledby="gif-builder-heading">
      <div className="panel__header">
        <div>
          <h2 id="gif-builder-heading">GIF Builder</h2>
          <p>Export selected frames into an animation. Adjust delay and loop preferences.</p>
        </div>
        <button type="button" className="button button--ghost" onClick={clearSelected}>
          Clear selection
        </button>
      </div>

      <div className="builder-controls">
        <label className="form-field">
          <span>Frame delay (ms)</span>
          <input type="number" min={40} max={1000} step={10} value={delayMs} onChange={handleDelayChange} />
        </label>
        <label className="toggle">
          <input type="checkbox" checked={loop} onChange={handleLoopToggle} />
          <span>Loop forever</span>
        </label>
        <button type="button" className="button button--primary" onClick={handleBuild} disabled={!hasSelection || state.isBuilding}>
          {state.isBuilding ? 'Building...' : 'Build GIF'}
        </button>
      </div>

      {!hasSelection && <p className="panel__empty">Select at least one frame to enable exporting.</p>}

      {state.error && <p className="panel__error">{state.error}</p>}

      {state.gifUrl && (
        <div className="builder-preview">
          <img src={state.gifUrl} alt="Generated GIF preview" />
          <button type="button" className="button button--secondary" onClick={handleDownload}>
            Download GIF
          </button>
        </div>
      )}
    </section>
  );
}