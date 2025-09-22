import { beforeAll } from 'vitest';

if (!process.env.OFFLINE_MODE) {
  process.env.OFFLINE_MODE = 'true';
}

const originalFetch = globalThis.fetch;

if (typeof originalFetch === 'function') {
  globalThis.fetch = async (...args) => {
    const [input] = args;
    const url = typeof input === 'string'
      ? input
      : input && typeof input === 'object' && 'url' in input
      ? String((input as { url: string }).url)
      : '';

    if (/^https?:/i.test(url)) {
      throw new Error(`Network request blocked during tests: ${url}`);
    }

    return originalFetch(...args);
  };
}

beforeAll(() => {
  if (typeof globalThis.window !== 'undefined') {
    (globalThis.window as typeof window & { OFFLINE_MODE?: string }).OFFLINE_MODE = process.env.OFFLINE_MODE;
  }
});
