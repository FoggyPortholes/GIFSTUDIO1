import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { log, setLastGif } from './logger';

function ascii(bytes: Uint8Array, count = 6) {
  return Array.from(bytes.slice(0, count)).map(b => String.fromCharCode(b)).join('');
}
function validateGif(buf: Uint8Array) {
  if (buf.byteLength < 8) return { ok: false, reason: 'buffer too small' };
  const head = ascii(buf, 6);
  const last = buf[buf.byteLength - 1];
  const okHeader = head === 'GIF89a' || head === 'GIF87a';
  const okTrailer = last === 0x3B; // ';'
  return { ok: okHeader && okTrailer, reason: `head=${head} trailer=${last}` };
}

async function filesToBitmaps(files: File[]): Promise<ImageBitmap[]> {
  const results: ImageBitmap[] = [];
  for (const f of files) {
    try {
      const bmp = await createImageBitmap(f);
      results.push(bmp);
    } catch (e) {
      log('WARN', 'createImageBitmap failed, trying fallback', { name: f.name });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = URL.createObjectURL(f);
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const bmp = await createImageBitmap(canvas);
      results.push(bmp);
    }
  }
  return results;
}

export async function generateGif(files: File[], delay = 200) {
  log('INFO', 'generateGif start', { count: files.length, delay });
  if (!files || files.length === 0) throw new Error('No files provided');

  const bitmaps = await filesToBitmaps(files);
  const w = bitmaps[0].width;
  const h = bitmaps[0].height;
  log('DEBUG', 'bitmap dims', { width: w, height: h, frames: bitmaps.length });

  const enc = GIFEncoder();
  const { writeFrame, finish } = enc;

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const frames: ImageData[] = bitmaps.map((bmp, idx) => {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h);
    log('DEBUG', 'captured frame', { idx, byteLength: id.data.byteLength });
    return id;
  });

  const palette = quantize(frames[0].data, 256);
  log('DEBUG', 'palette created', { length: palette.length });

  const idx0 = applyPalette(frames[0].data, palette);
  writeFrame(w, h, idx0, { palette, delay });
  log('DEBUG', 'wrote first frame', { indices: idx0.length });

  for (let i = 1; i < frames.length; i++) {
    const idx = applyPalette(frames[i].data, palette);
    writeFrame(w, h, idx, { delay });
    log('DEBUG', 'wrote frame', { i, indices: idx.length });
  }

  const buffer = finish();
  const u8 = new Uint8Array(buffer);
  setLastGif(u8);
  const val = validateGif(u8);
  log('INFO', 'finished GIF', { bytes: u8.byteLength, head: ascii(u8, 6), last: u8[u8.byteLength - 1], valid: val.ok });

  if (!val.ok) throw new Error('Invalid GIF: ' + val.reason);

  const blob = new Blob([u8], { type: 'image/gif' });
  return URL.createObjectURL(blob);
}

export async function testGif() {
  log('INFO', 'testGif start');
  const w = 64, h = 64, delay = 400;
  const enc = GIFEncoder();
  const { writeFrame, finish } = enc;

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, w, h);
  const f1 = ctx.getImageData(0, 0, w, h);

  ctx.fillStyle = 'blue';
  ctx.fillRect(0, 0, w, h);
  const f2 = ctx.getImageData(0, 0, w, h);

  const palette = quantize(f1.data, 256);
  const idx1 = applyPalette(f1.data, palette);
  writeFrame(w, h, idx1, { palette, delay });

  const idx2 = applyPalette(f2.data, palette);
  writeFrame(w, h, idx2, { delay });

  const buffer = finish();
  const u8 = new Uint8Array(buffer);
  setLastGif(u8);
  log('INFO', 'testGif finished', { bytes: u8.byteLength });

  const blob = new Blob([u8], { type: 'image/gif' });
  return URL.createObjectURL(blob);
}
