import { useCallback, useEffect, useState } from 'react';
import { useStudio } from '../studio/StudioContext';

const createDownloadName = () => `gif-studio-${new Date().toISOString().replace(/[:.]/g, '-')}.gif`;

export const ExportPanel = () => {
  const { frames, exportSettings, setExportSettings, playback, encode } = useStudio();
  const [isEncoding, setIsEncoding] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
  }, [downloadUrl]);

  const triggerDownload = useCallback((blob: Blob) => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = createDownloadName();
    anchor.click();
  }, [downloadUrl]);

  const onExport = useCallback(async () => {
    setError(null);
    setIsEncoding(true);
    try {
      const blob = await encode();
      triggerDownload(blob);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to export GIF.');
    } finally {
      setIsEncoding(false);
    }
  }, [encode, triggerDownload]);

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Export</p>
          <h2>Render a shareable GIF</h2>
        </div>
        <button
          type="button"
          className="button"
          onClick={onExport}
          disabled={!frames.length || isEncoding}
        >
          {isEncoding ? 'Encoding…' : `Export ${frames.length || ''} frame GIF`}
        </button>
      </header>

      <form className="export__grid" onSubmit={(event) => event.preventDefault()}>
        <label className="control">
          <span>Width (px)</span>
          <input
            type="number"
            min={32}
            max={2048}
            value={exportSettings.width}
            onChange={(event) => setExportSettings({ width: Number(event.target.value) })}
          />
        </label>
        <label className="control">
          <span>Height (px)</span>
          <input
            type="number"
            min={32}
            max={2048}
            value={exportSettings.height}
            onChange={(event) => setExportSettings({ height: Number(event.target.value) })}
          />
        </label>
        <label className="control">
          <span>Background</span>
          <input
            type="color"
            value={exportSettings.background}
            onChange={(event) => setExportSettings({ background: event.target.value })}
          />
        </label>
        <label className="control">
          <span>Fit mode</span>
          <select
            value={exportSettings.fitMode}
            onChange={(event) => setExportSettings({ fitMode: event.target.value as typeof exportSettings.fitMode })}
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
            <option value="stretch">Stretch</option>
          </select>
        </label>
        <label className="control control--span">
          <span>Playback delay</span>
          <div className="control__row">
            <p>{playback.delay}ms</p>
            <p>{playback.loop ? 'Looping' : 'Play once'}</p>
          </div>
        </label>
      </form>

      {error && <p className="export__error">{error}</p>}
      {downloadUrl && !error && (
        <p className="export__hint">
          GIF exported! If the download did not start automatically,{' '}
          <a href={downloadUrl} download={createDownloadName()}>
            click here to save it manually
          </a>
          .
        </p>
      )}
    </section>
  );
};
