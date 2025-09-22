import { useRef, useState } from 'react';

interface FrameUploaderProps {
  onFiles: (files: File[]) => void;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const filterSupportedFiles = (files: File[]) =>
  files.filter((file) => ACCEPTED_TYPES.includes(file.type));

export const FrameUploader = ({ onFiles }: FrameUploaderProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const emitFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const supported = filterSupportedFiles(Array.from(files));
    if (supported.length) {
      onFiles(supported);
    }
  };

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleBrowse();
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    emitFiles(event.target.files);
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    emitFiles(event.dataTransfer.files);
  };

  return (
    <div className="panel">
      <h2>Frames</h2>
      <div
        className={`dropzone${dragActive ? ' drag-active' : ''}`}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>
          Drag &amp; drop still images or GIF files here, or{' '}
          <strong role="button" tabIndex={0} onClick={handleBrowse} onKeyDown={handleKeyDown}>
            browse
          </strong>
          .
        </p>
        <p>PNG, JPG, WEBP, and GIF files are supported.</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          hidden
          onChange={handleChange}
        />
      </div>
    </div>
  );
};
