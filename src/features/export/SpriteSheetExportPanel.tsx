import { useCallback, useMemo, useState, type ChangeEvent } from 'react';

import type { FrameAsset } from '../../types';
import {
  computeSpriteSheetSize,
  createSpriteSheet,
  loadSpriteTemplateFile,
  type LoadedSpriteTemplate,
} from '../../lib/sprite-template';

interface SpriteSheetExportPanelProps {
  frames: FrameAsset[];
  disabled?: boolean;
  onToast: (message: string, tone?: 'success' | 'error') => void;
}

export const SpriteSheetExportPanel = ({
  frames,
  disabled = false,
  onToast,
}: SpriteSheetExportPanelProps) => {
  const [template, setTemplate] = useState<LoadedSpriteTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const templateStats = useMemo(() => {
    if (!template) {
      return null;
    }
    return computeSpriteSheetSize(template);
  }, [template]);

  const capacityStatus = useMemo(() => {
    if (!templateStats) {
      return null;
    }
    const remaining = templateStats.capacity - frames.length;
    if (frames.length === 0) {
      return {
        tone: 'info' as const,
        message: 'Add frames to your timeline to populate this template.',
        remaining,
      };
    }
    if (remaining < 0) {
      const overflow = Math.abs(remaining);
      return {
        tone: 'error' as const,
        message: `Remove ${overflow} frame${overflow === 1 ? '' : 's'} or choose a larger template.`,
        remaining,
      };
    }
    if (remaining === 0) {
      return {
        tone: 'success' as const,
        message: 'All template slots will be filled.',
        remaining,
      };
    }
    return {
      tone: 'info' as const,
      message: `${remaining} empty slot${remaining === 1 ? '' : 's'} will remain after export.`,
      remaining,
    };
  }, [templateStats, frames.length]);

  const handleTemplateChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      setError(null);
      try {
        const loaded = await loadSpriteTemplateFile(file);
        setTemplate(loaded);
      } catch (templateError) {
        const message =
          templateError instanceof Error
            ? templateError.message
            : 'Unable to read the selected sprite template.';
        setTemplate(null);
        setError(message);
        onToast(message, 'error');
      } finally {
        event.target.value = '';
      }
    },
    [onToast]
  );

  const handleClearTemplate = useCallback(() => {
    setTemplate(null);
    setError(null);
  }, []);

  const canExport = useMemo(() => {
    if (!template || !templateStats) {
      return false;
    }
    if (frames.length === 0) {
      return false;
    }
    if (capacityStatus && capacityStatus.tone === 'error') {
      return false;
    }
    return true;
  }, [template, templateStats, frames.length, capacityStatus]);

  const handleExport = useCallback(async () => {
    if (!template) {
      setError('Upload a sprite template before creating a sprite sheet.');
      return;
    }

    if (!frames.length) {
      setError('Add frames to your timeline before creating a sprite sheet.');
      return;
    }

    if (capacityStatus && capacityStatus.tone === 'error') {
      setError(capacityStatus.message);
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const blob = await createSpriteSheet(frames, template);
      const baseName =
        template.name?.trim() || template.sourceName.replace(/\.[^./]+$/, '') || 'sprite-sheet';
      const fileName = `${baseName}.png`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onToast('Sprite sheet export complete.');
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : 'Unable to create sprite sheet. Please try again.';
      setError(message);
      onToast(message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [template, frames, capacityStatus, onToast]);

  const templateName = template?.name ?? template?.sourceName ?? 'Template';

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Sprite Sheet</h2>
        <p>Upload a JSON template to assemble your frames into a sprite sheet image.</p>
      </div>
      <div className="sprite-export">
        <label className="sprite-template-upload">
          <span>Sprite template JSON</span>
          <input
            type="file"
            accept="application/json"
            onChange={handleTemplateChange}
            disabled={disabled || isProcessing}
            aria-disabled={disabled || isProcessing}
          />
        </label>
        {template ? (
          <>
            <dl className="sprite-template-summary">
              <div>
                <dt>Template</dt>
                <dd>{templateName}</dd>
              </div>
              <div>
                <dt>Grid</dt>
                <dd>
                  {template.columns} × {template.rows}
                </dd>
              </div>
              <div>
                <dt>Frame size</dt>
                <dd>
                  {template.frameWidth} × {template.frameHeight}
                </dd>
              </div>
              <div>
                <dt>Canvas size</dt>
                <dd>
                  {templateStats?.width} × {templateStats?.height}
                </dd>
              </div>
              <div>
                <dt>Capacity</dt>
                <dd>{templateStats?.capacity}</dd>
              </div>
              <div>
                <dt>Frames in timeline</dt>
                <dd>{frames.length}</dd>
              </div>
            </dl>
            {capacityStatus ? (
              <p className={`sprite-template-note${capacityStatus.tone === 'error' ? ' is-error' : ''}`}>
                {capacityStatus.message}
              </p>
            ) : null}
            <div className="sprite-template-actions">
              <button
                type="button"
                className="ghost"
                onClick={handleClearTemplate}
                disabled={disabled || isProcessing}
              >
                Remove template
              </button>
              <button
                type="button"
                className="primary-action"
                onClick={handleExport}
                disabled={!canExport || disabled || isProcessing}
              >
                {isProcessing ? 'Creating sprite sheet…' : 'Create sprite sheet'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="sprite-template-placeholder" role="status">
              JSON must include frameWidth, frameHeight, columns, and rows. Optional keys: spacing,
              margin, background, and fitMode.
            </p>
            <div className="sprite-template-actions">
              <button type="button" className="ghost" onClick={handleClearTemplate} disabled>
                Remove template
              </button>
              <button type="button" className="primary-action" disabled>
                Create sprite sheet
              </button>
            </div>
          </>
        )}
        {error ? (
          <p className="sprite-template-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
};
