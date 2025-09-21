export function downloadBytes(filename: string, bytes: Uint8Array, mime = 'application/octet-stream') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
