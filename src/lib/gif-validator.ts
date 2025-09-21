export function isValidGif(bytes: Uint8Array): boolean {
  if (bytes.length < 7) return false;
  const hdr = String.fromCharCode(...bytes.slice(0, 6));
  const trailer = bytes[bytes.length - 1];
  return (hdr === 'GIF87a' || hdr === 'GIF89a') && trailer === 0x3B;
}
