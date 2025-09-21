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

export function rgbaToHex([r, g, b, a]: [number, number, number, number]) {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const toHex = (value: number) => clamp(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
}

export function adjustHexLightness(hex: string, amount: number) {
  const [r, g, b, a] = hexToRgba(hex);
  const adjust = (value: number) => value + amount * 255;
  return rgbaToHex([adjust(r), adjust(g), adjust(b), a]);
}

export function blendHexColors(base: string, overlay: string, ratio: number) {
  const [br, bg, bb, ba] = hexToRgba(base);
  const [or, og, ob, oa] = hexToRgba(overlay);
  const mix = (b: number, o: number) => b * (1 - ratio) + o * ratio;
  return rgbaToHex([mix(br, or), mix(bg, og), mix(bb, ob), mix(ba, oa)]);
}
