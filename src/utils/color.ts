export function hexToRgba(hex: string): [number, number, number, number] {
  let normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (normalized.length === 6) {
    normalized += 'ff';
  }
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 24) & 255;
  const g = (bigint >> 16) & 255;
  const b = (bigint >> 8) & 255;
  const a = bigint & 255;
  return [r, g, b, a];
}

export function rgbaToCss([r, g, b, a]: [number, number, number, number]) {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}
