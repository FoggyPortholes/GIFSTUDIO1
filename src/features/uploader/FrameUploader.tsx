import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useStudio } from '../studio/StudioContext';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const describeFiles = (count: number) => {
  if (!count) {
    return 'No frames yet';
  }
  if (count === 1) {
    return '1 frame ready';
  }
  return `${count} frames ready`;
};

export const FrameUploader = () => {
  const { addFiles, frames, isImporting } = useStudio();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) {
        return;
      }
      const files = Array.from(fileList);
      const accepted = files.filter((file) => {
        if (!file.type) {
          return true;
        }
        return ACCEPTED_TYPES.includes(file.type.toLowerCase());
      });
      const rejected = files.length - accepted.length;
      if (!accepted.length) {
        setError('Unsupported file type. Please drop PNG, JPG, WEBP, or GIF images.');
        return;
      }
      setError(rejected ? `${rejected} file(s) were skipped due to unsupported formats.` : null);
      await addFiles(accepted);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [addFiles],
  );

  const onInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      try {
        await handleFiles(event.target.files);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to import frames.');
      }
    },
    [handleFiles],
  );

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      try {
        await handleFiles(event.dataTransfer?.files ?? null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to import frames.');
      }
    },
    [handleFiles],
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const onBrowse = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Import</p>
          <h2>Bring in your frames</h2>
        </div>
        <button className="button" type="button" onClick={onBrowse} disabled={isImporting}>
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          className="uploader__input"
          onChange={onInputChange}
        />
      </header>

      <div
        className={`uploader__dropzone${isDragActive ? ' uploader__dropzone--active' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <p className="uploader__title">Drop PNG, JPG, WEBP, or GIF files here</p>
        <p className="uploader__subtitle">{describeFiles(frames.length)}</p>
      </div>

      {error && <p className="uploader__error">{error}</p>}
      {isImporting && <p className="uploader__status">Loading frames…</p>}
    </section>
  );
};
