import { useState } from 'react';
import type { ExportSettings, FrameAsset } from '../types';

interface ExportPanelProps {
  frames: FrameAsset[];
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  onExport: () => Promise<void>;
}

export const ExportPanel = ({ frames, settings, onSettingsChange, onExport }: ExportPanelProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSetting = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleExport = async () => {
    if (!frames.length || isExporting) {
      return;
    }

    try {
      setError(null);
      setIsExporting(true);
      await onExport();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="panel export-panel">
      <h2>Export</h2>
      <div className="field-group">
        <label htmlFor="width">Canvas width</label>
        <input
          id="width"
          type="number"
          min={32}
          value={settings.width}
          onChange={(event) => updateSetting('width', Number(event.target.value))}
        />
      </div>
      <div className="field-group">
        <label htmlFor="height">Canvas height</label>
        <input
          id="height"
          type="number"
          min={32}
          value={settings.height}
          onChange={(event) => updateSetting('height', Number(event.target.value))}
        />
      </div>
      <div className="field-group">
        <label htmlFor="background">Background color</label>
        <input
          id="background"
          type="color"
          value={settings.background}
          onChange={(event) => updateSetting('background', event.target.value)}
        />
      </div>
      <div className="field-group">
        <label htmlFor="fit-mode">Frame fit</label>
        <select
          id="fit-mode"
          value={settings.fitMode}
          onChange={(event) => updateSetting('fitMode', event.target.value as ExportSettings['fitMode'])}
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="stretch">Stretch</option>
        </select>
      </div>
      <button type="button" onClick={handleExport} disabled={!frames.length || isExporting}>
        {isExporting ? 'Rendering…' : 'Download GIF'}
      </button>
      {error && (
        <div className="export-error" role="alert">
          <strong>Export error</strong>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
