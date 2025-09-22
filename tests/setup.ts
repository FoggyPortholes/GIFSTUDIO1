import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  if (typeof globalThis.fetch === 'function') {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('Network access is disabled during tests');
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});
