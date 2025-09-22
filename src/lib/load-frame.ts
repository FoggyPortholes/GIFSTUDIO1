import type { FrameAsset } from '../types';
import { createId } from './id';

export const loadFrame = (file: File): Promise<FrameAsset> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        id: createId(),
        name: file.name,
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
        file,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to load frame: ${file.name}`));
    };

    image.src = url;
  });
};

export const revokeFrame = (frame: FrameAsset) => {
  URL.revokeObjectURL(frame.url);
};
