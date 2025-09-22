import type { ExportSettings, FrameAsset } from '../../types';

interface ExportPanelProps {
  frames: FrameAsset[];
  settings: ExportSettings;
  onSettingsChange: (settings: Partial<ExportSettings>) => void;
  onExport: () => void;
  isExporting: boolean;
}

const FIT_OPTIONS: ExportSettings['fitMode'][] = ['contain', 'cover', 'stretch'];

export const ExportPanel = ({
  frames,
  settings,
  onSettingsChange,
  onExport,
  isExporting,
}: ExportPanelProps) => {
  const disabled = !frames.length || isExporting;
  const exportLabel = frames.length
    ? `Export ${frames.length} frame${frames.length === 1 ? '' : 's'}`
    : 'Export';

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Export</h2>
        <p>Choose output dimensions, background, and fitting before encoding.</p>
      </div>
      <div className="export-grid">
        <label>
          <span>Width</span>
          <input
            type="number"
            min={32}
            max={2048}
            value={settings.width}
            onChange={(event) => onSettingsChange({ width: Number(event.target.value) })}
            disabled={isExporting}
          />
        </label>
        <label>
          <span>Height</span>
          <input
            type="number"
            min={32}
            max={2048}
            value={settings.height}
            onChange={(event) => onSettingsChange({ height: Number(event.target.value) })}
            disabled={isExporting}
          />
        </label>
        <label>
          <span>Background</span>
          <input
            type="color"
            value={settings.background}
            onChange={(event) => onSettingsChange({ background: event.target.value })}
            disabled={isExporting}
          />
        </label>
      </div>
      <fieldset className="export-fit">
        <legend>Fit Mode</legend>
        <div>
          {FIT_OPTIONS.map((mode) => (
            <label key={mode} className="export-fit-option">
              <input
                type="radio"
                name="fit-mode"
                value={mode}
                checked={settings.fitMode === mode}
                onChange={() => onSettingsChange({ fitMode: mode })}
                disabled={isExporting}
              />
              <span>{mode}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="button" className="primary-action" onClick={onExport} disabled={disabled}>
        {isExporting ? 'Exporting…' : exportLabel}
      </button>
    </div>
  );
};
