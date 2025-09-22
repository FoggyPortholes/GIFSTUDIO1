import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { CharacterAsset, CharacterManifest, CreatorSelection } from '../../state/store';
import { useAppStore } from '../../state/store';

interface LoadState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  message?: string;
}

interface LayerOrder {
  body?: CharacterAsset | null;
  outfit?: CharacterAsset | null;
  head?: CharacterAsset | null;
}

const CANVAS_SIZE = 256;

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load asset: ${src}`));
    image.src = src;
  });
}

function getFrameId(source: string): string {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `${source}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeLayers(manifest: CharacterManifest | null, selection: CreatorSelection): LayerOrder {
  if (!manifest) {
    return {};
  }
  return {
    body: manifest.bodies.find((item) => item.id === selection.bodyId) ?? null,
    outfit: manifest.outfits.find((item) => item.id === selection.outfitId) ?? null,
    head: manifest.heads.find((item) => item.id === selection.headId) ?? null,
  };
}

export function CharacterCreator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const manifest = useAppStore((state) => state.manifest);
  const selection = useAppStore((state) => state.selection);
  const offlineMode = useAppStore((state) => state.offlineMode);
  const setManifest = useAppStore((state) => state.setManifest);
  const setSelection = useAppStore((state) => state.setSelection);
  const addFrame = useAppStore((state) => state.addFrame);

  const [loadState, setLoadState] = useState<LoadState>({ status: manifest ? 'ready' : 'idle' });
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (manifest || loadState.status === 'loading') {
      return;
    }
    let disposed = false;
    const controller = new AbortController();
    const fetchManifest = async () => {
      setLoadState({ status: 'loading' });
      try {
        const response = await fetch('/assets/manifest.json', { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Manifest request failed (${response.status})`);
        }
        const data = (await response.json()) as CharacterManifest;
        if (!disposed) {
          setManifest(data);
          setLoadState({ status: 'ready' });
        }
      } catch (error) {
        if (disposed) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unable to load local asset manifest.';
        setLoadState({ status: 'error', message });
      }
    };

    fetchManifest();
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [manifest, loadState.status, setManifest]);

  const layers = useMemo(() => mergeLayers(manifest, selection), [manifest, selection]);
  const isReady = loadState.status === 'ready' && Boolean(manifest);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const drawLayer = async () => {
      const order: Array<CharacterAsset | null | undefined> = [layers.body, layers.outfit, layers.head];
      for (const layer of order) {
        if (!layer) {
          continue;
        }
        try {
          const image = await loadImage(layer.src);
          ctx.drawImage(image, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        } catch (error) {
          console.warn('[character-creator] Failed to draw layer', layer.id, error);
        }
      }
    };

    drawLayer();
  }, [layers.body, layers.outfit, layers.head]);

  const handleSelectChange = (field: 'bodyId' | 'headId' | 'outfitId') =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      setSelection({ [field]: event.target.value } as Partial<typeof selection>);
      setExportMessage(null);
    };

  const handleExport = async () => {
    if (!layers.body || !layers.head || !layers.outfit) {
      setExportMessage('Select a body, head, and outfit before exporting.');
      return;
    }
    try {
      const [bodyImage, outfitImage, headImage] = await Promise.all([
        loadImage(layers.body.src),
        loadImage(layers.outfit.src),
        loadImage(layers.head.src),
      ]);

      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas rendering is unavailable in this browser.');
      }
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(bodyImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(outfitImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(headImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const dataUrl = canvas.toDataURL('image/png');
      const frameId = getFrameId('character');
      const name = `${layers.body.label} + ${layers.outfit.label}`;
      addFrame({
        id: frameId,
        name,
        url: dataUrl,
        source: 'character',
        placeholder: false,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
      });

      setExportMessage('Character exported to GIF builder.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Character export failed.';
      setExportMessage(message);
    }
  };

  return (
    <section className="panel" aria-labelledby="character-creator-heading">
      <div className="panel__header">
        <div>
          <h2 id="character-creator-heading">Character Creator</h2>
          <p>Select local assets and export a layered render directly into the GIF builder.</p>
        </div>
        <div className="creator-status">
          <span className="badge">Offline assets</span>
          {offlineMode && <span className="badge badge--accent">Offline mode</span>}
        </div>
      </div>

      {loadState.status === 'loading' && <p className="panel__info">Loading local manifest…</p>}
      {loadState.status === 'error' && <p className="panel__error">{loadState.message}</p>}

      <div className="creator-layout">
        <div className="creator-controls">
          <label className="form-field">
            <span>Body</span>
            <select value={selection.bodyId ?? ''} onChange={handleSelectChange('bodyId')} disabled={!isReady}>
              {(manifest?.bodies ?? []).map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Head</span>
            <select value={selection.headId ?? ''} onChange={handleSelectChange('headId')} disabled={!isReady}>
              {(manifest?.heads ?? []).map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Outfit</span>
            <select value={selection.outfitId ?? ''} onChange={handleSelectChange('outfitId')} disabled={!isReady}>
              {(manifest?.outfits ?? []).map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button button--primary" onClick={handleExport} disabled={!isReady}>
            Export Character
          </button>
          {exportMessage && <p className="panel__info">{exportMessage}</p>}
        </div>

        <div className="creator-preview">
          <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} aria-label="Character preview" />
        </div>
      </div>
    </section>
  );
}
