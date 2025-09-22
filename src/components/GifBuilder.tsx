import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from 'react';
import { makeGif, type GifFrame } from '../services/gif/makeGif';
import { useAppStore, type FrameItem } from '../state/store';

interface BuilderState {
  isBuilding: boolean;
  error: string | null;
  gifUrl: string | null;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

function imageToFrame(image: HTMLImageElement, delayMs: number): GifFrame {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D context unavailable.');
  }
  context.drawImage(image, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height);
  return {
    rgba: new Uint8ClampedArray(data.data),
    width,
    height,
    delayMs,
  };
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function nextUploadId(name: string): string {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
  const base = name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase() || 'upload';
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${base}-${cryptoApi.randomUUID()}`;
  }
  return `${base}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function triggerDownload(name: string, url: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function GifBuilder() {
  const frames = useAppStore((state) => state.frames);
  const frameDelay = useAppStore((state) => state.frameDelay);
  const loop = useAppStore((state) => state.loopGif);
  const setFrameDelay = useAppStore((state) => state.setFrameDelay);
  const setLoop = useAppStore((state) => state.setLoopGif);
  const addFrames = useAppStore((state) => state.addFrames);
  const removeFrame = useAppStore((state) => state.removeFrame);
  const moveFrame = useAppStore((state) => state.moveFrame);

  const [builderState, setBuilderState] = useState<BuilderState>({ isBuilding: false, error: null, gifUrl: null });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (builderState.gifUrl) {
        URL.revokeObjectURL(builderState.gifUrl);
      }
    };
  }, [builderState.gifUrl]);

  const hasFrames = frames.length > 0;

  const handleDelayChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(event.target.value, 10);
    setFrameDelay(value);
  };

  const handleLoopToggle = () => {
    setLoop(!loop);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const { files } = event.dataTransfer;
    if (!files || files.length === 0) {
      return;
    }
    const accepted: FrameItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        accepted.push({
          id: nextUploadId(file.name),
          name: file.name,
          url: dataUrl,
          source: 'upload',
          placeholder: false,
        });
      } catch (error) {
        console.warn('[gif-builder] Unable to import file', file.name, error);
      }
    }
    if (accepted.length) {
      addFrames(accepted);
      setBuilderState((prev) => ({ ...prev, error: null }));
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDropOnFrame = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggedId;
    if (!sourceId) {
      return;
    }
    moveFrame(sourceId, targetId);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const buildGif = async () => {
    if (!hasFrames) {
      setBuilderState({ isBuilding: false, error: 'Add at least one frame.', gifUrl: builderState.gifUrl });
      return;
    }
    setBuilderState((prev) => ({ ...prev, isBuilding: true, error: null }));
    try {
      const images = await Promise.all(frames.map((frame) => loadImage(frame.url)));
      const gifFrames = images.map((image) => imageToFrame(image, frameDelay));
      const first = gifFrames[0];
      gifFrames.forEach((frame) => {
        if (frame.width !== first.width || frame.height !== first.height) {
          throw new Error('All frames must share identical dimensions before encoding.');
        }
      });
      const bytes = makeGif(gifFrames, { loop });
      const payload = new Uint8Array(bytes.length);
      payload.set(bytes);
      const blob = new Blob([payload], { type: 'image/gif' });
      if (builderState.gifUrl) {
        URL.revokeObjectURL(builderState.gifUrl);
      }
      const url = URL.createObjectURL(blob);
      setBuilderState({ isBuilding: false, error: null, gifUrl: url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to build GIF.';
      setBuilderState({ isBuilding: false, error: message, gifUrl: null });
    }
  };

  const downloadGif = () => {
    if (!builderState.gifUrl) {
      return;
    }
    triggerDownload('character.gif', builderState.gifUrl);
  };

  const downloadPngSequence = async () => {
    if (!hasFrames) {
      return;
    }
    const images = await Promise.all(frames.map((frame) => loadImage(frame.url)));
    images.forEach((image, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          return;
        }
        const url = URL.createObjectURL(blob);
        triggerDownload(`frame-${index + 1}.png`, url);
        URL.revokeObjectURL(url);
      }, 'image/png');
    });
  };

  const frameSummary = useMemo(
    () => `${frames.length} frame${frames.length === 1 ? '' : 's'}`,
    [frames.length],
  );

  return (
    <section className="panel" aria-labelledby="gif-builder-heading">
      <div className="panel__header">
        <div>
          <h2 id="gif-builder-heading">GIF Builder</h2>
          <p>Drop local images or export characters, then encode a looping animation without network access.</p>
        </div>
        <span className="badge">{frameSummary}</span>
      </div>

      <div className="builder-dropzone" onDragOver={handleDragOver} onDrop={handleDrop}>
        <p>Drag and drop PNG or JPG files here to add frames.</p>
        <p>Tip: Export characters above to populate this queue.</p>
      </div>

      <div className="builder-controls">
        <label className="form-field">
          <span>Frame delay (ms)</span>
          <input type="range" min={40} max={1000} step={10} value={frameDelay} onChange={handleDelayChange} />
          <input type="number" min={40} max={1000} step={10} value={frameDelay} onChange={handleDelayChange} />
        </label>
        <label className="toggle">
          <input type="checkbox" checked={loop} onChange={handleLoopToggle} />
          <span>Loop forever</span>
        </label>
        <button
          type="button"
          className="button button--primary"
          onClick={buildGif}
          disabled={!hasFrames || builderState.isBuilding}
        >
          {builderState.isBuilding ? 'Building...' : 'Build GIF'}
        </button>
      </div>

      {builderState.error && <p className="panel__error">{builderState.error}</p>}

      <div className="builder-frame-list">
        {frames.map((frame) => (
          <div
            key={frame.id}
            className="builder-frame"
            draggable
            onDragStart={(event) => handleDragStart(event, frame.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDropOnFrame(event, frame.id)}
          >
            <img src={frame.url} alt={frame.name} />
            <div className="builder-frame__meta">
              <span>{frame.name}</span>
              <button type="button" className="button button--ghost" onClick={() => removeFrame(frame.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {builderState.gifUrl && (
        <div className="builder-preview">
          <img src={builderState.gifUrl} alt="Animated GIF preview" />
          <div className="builder-preview__actions">
            <button type="button" className="button button--secondary" onClick={downloadGif}>
              Download GIF
            </button>
            <button type="button" className="button button--ghost" onClick={downloadPngSequence}>
              Download PNG sequence
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
