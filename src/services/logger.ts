export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const ring: string[] = [];
const MAX = 2000;

let lastGif: Uint8Array | null = null;

export function setLastGif(buf: Uint8Array | null) {
  lastGif = buf;
}
export function hasLastGif() {
  return !!lastGif;
}
export function getLastGif() {
  return lastGif;
}

function normalizeData(data: unknown): unknown {
  if (data instanceof Error) {
    const { name, message, stack } = data;
    const result: Record<string, unknown> = { name, message };
    if (stack) {
      result.stack = stack;
    }
    const anyError = data as unknown as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(anyError)) {
      if (!(key in result)) {
        result[key] = anyError[key];
      }
    }
    return result;
  }
  if (typeof data === 'bigint') {
    return data.toString();
  }
  if (data instanceof Uint8Array) {
    return {
      type: 'Uint8Array',
      byteLength: data.byteLength,
      preview: Array.from(data.slice(0, 16)),
    };
  }
  if (ArrayBuffer.isView(data)) {
    return {
      type: data.constructor.name,
      byteLength: (data as ArrayBufferView).byteLength,
    };
  }
  return data;
}

function safeStringify(data: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      data,
      (_key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        if (value instanceof Error) {
          return normalizeData(value);
        }
        if (value instanceof Uint8Array) {
          return normalizeData(value);
        }
        if (value && typeof value === 'object') {
          if (seen.has(value as object)) {
            return '[Circular]';
          }
          seen.add(value as object);
        }
        return value;
      },
      2
    );
  } catch {
    return '[unserializable]';
  }
}

export function log(level: LogLevel, message: string, data?: unknown) {
  const ts = new Date().toISOString();
  let extra = '';
  if (data !== undefined) {
    const normalized = normalizeData(data);
    if (typeof normalized === 'string') {
      extra = ` ${normalized}`;
    } else {
      extra = ` ${safeStringify(normalized)}`;
    }
  }
  const line = `[${ts}] ${level} ${message}${extra}`;
  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
  ring.push(line);
  if (ring.length > MAX) {
    ring.shift();
  }
}

export function logDebug(message: string, data?: unknown) {
  log('DEBUG', message, data);
}

export function logInfo(message: string, data?: unknown) {
  log('INFO', message, data);
}

export function logWarn(message: string, data?: unknown) {
  log('WARN', message, data);
}

export function logError(message: string, data?: unknown) {
  log('ERROR', message, data);
}

export function getLogs(): string {
  return ring.join('\n');
}
export function clearLogs() {
  ring.length = 0;
}

export function downloadLogs() {
  const blob = new Blob([getLogs()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'gif_studio_debug.log'; a.click();
  URL.revokeObjectURL(url);
}

export function downloadLastGif() {
  if (!lastGif) return;
  const copy = lastGif.slice();
  const blob = new Blob([copy.buffer], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'last_raw.gif'; a.click();
  URL.revokeObjectURL(url);
}
