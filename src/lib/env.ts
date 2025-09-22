function getMetaEnv(): Record<string, unknown> | undefined {
  if (typeof import.meta === 'undefined') {
    return undefined;
  }
  const candidate = (import.meta as unknown as { env?: unknown }).env;
  if (candidate && typeof candidate === 'object') {
    return candidate as Record<string, unknown>;
  }
  return undefined;
}

export function readEnv(key: string): string | undefined {
  const meta = getMetaEnv();
  const metaValue = typeof meta?.[key] === 'string' ? (meta[key] as string) : undefined;
  if (metaValue && metaValue.length > 0) {
    return metaValue;
  }

  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
    const value = process.env[key] as string;
    if (value.length > 0) {
      return value;
    }
  }

  return undefined;
}

export function isFlagEnabled(key: string): boolean {
  const raw = readEnv(key) ?? '';
  const normalized = raw.toString().trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
