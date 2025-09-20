export type LogLevel = 'INFO'|'WARN'|'ERROR'|'DEBUG';

const ring: string[] = [];
const MAX = 2000;

let lastGif: Uint8Array | null = null;

export function setLastGif(buf: Uint8Array | null) { lastGif = buf; }
export function hasLastGif() { return !!lastGif; }
export function getLastGif() { return lastGif; }

export function log(level: LogLevel, message: string, data?: any) {
  const ts = new Date().toISOString();
  let extra = '';
  try {
    if (data !== undefined) {
      extra = ' ' + JSON.stringify(data);
    }
  } catch {
    extra = ' [unserializable]';
  }
  const line = `[${ts}] ${level} ${message}${extra}`;
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.log(line);
  ring.push(line);
  if (ring.length > MAX) ring.shift();
}

export function getLogs(): string { return ring.join('\n'); }
export function clearLogs() { ring.length = 0; }

export function downloadLogs() {
  const blob = new Blob([getLogs()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'gif_studio_debug.log'; a.click();
  URL.revokeObjectURL(url);
}

export function downloadLastGif() {
  if (!lastGif) return;
  const blob = new Blob([lastGif], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'last_raw.gif'; a.click();
  URL.revokeObjectURL(url);
}
