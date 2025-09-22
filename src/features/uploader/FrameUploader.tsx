import { useCallback, useState, type ChangeEvent, type DragEvent } from 'react';

import type { FrameAsset } from '../../types';
import { SpriteSheetImporter } from './SpriteSheetImporter';

interface FrameUploaderProps {
  onFiles: (files: File[]) => void;
  onFrames?: (frames: FrameAsset[], meta?: { sourceName?: string }) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

const filterAcceptedFiles = (fileList: FileList | null) => {
  if (!fileList?.length) {
    return [];
  }
  return Array.from(fileList).filter((file) => {
    if (ACCEPTED_TYPES.includes(file.type)) {
      return true;
    }
    if (!file.type && file.name) {
      const name = file.name.toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some((ending) => name.endsWith(ending));
    }
    return false;
  });
};

export const FrameUploader = ({ onFiles, onFrames, disabled = false }: FrameUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isSpriteSheetOpen, setSpriteSheetOpen] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const accepted = filterAcceptedFiles(files);
      if (accepted.length) {
        onFiles(accepted);
      }
    },
    [onFiles]
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files);
      event.target.value = '';
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLLabelElement>) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Frames</h2>
        <p>Upload still images, then arrange and preview them before exporting your animation.</p>
      </div>
      <label
        className={`uploader${disabled ? ' is-disabled' : ''}${isDragging ? ' is-dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          onChange={handleInputChange}
          disabled={disabled}
          aria-disabled={disabled}
        />
        <div className="uploader-icon" aria-hidden>
          <span>⬆</span>
        </div>
        <div className="uploader-text">
          <strong>Drop images here</strong>
          <span>or click to browse PNG, JPG, WEBP, or GIF files</span>
        </div>
      </label>
      <div className="uploader-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => setSpriteSheetOpen(true)}
          disabled={disabled}
        >
          Import Sprite Sheet
        </button>
      </div>
      {isSpriteSheetOpen ? (
        <SpriteSheetImporter
          disabled={disabled}
          onCancel={() => setSpriteSheetOpen(false)}
          onImport={(frames, meta) => {
            onFrames?.(frames, meta);
            setSpriteSheetOpen(false);
          }}
        />
      ) : null}
    </div>
  );
};
