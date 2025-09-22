import type { GeneratedImage } from './index';

interface StubAsset {
  id: string;
  src: string;
  label: string;
}

const STUB_ASSETS: StubAsset[] = [
  { id: 'stub-frame-1', src: '/stubs/frame-1.png', label: 'Nebula Halo' },
  { id: 'stub-frame-2', src: '/stubs/frame-2.png', label: 'Aurora Wave' },
  { id: 'stub-frame-3', src: '/stubs/frame-3.png', label: 'Starfield' },
];

function nextId(prefix: string, index: number): string {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  const random = Math.random().toString(16).slice(2);
  return `${prefix}-${random}-${index}`;
}

export async function generateStubCharacter(prompt: string): Promise<GeneratedImage[]> {
  const sanitized = prompt.trim() || 'Untitled character';
  return STUB_ASSETS.map((asset, index) => ({
    id: nextId(asset.id, index),
    provider: 'stub',
    url: asset.src,
    description: `${asset.label} - ${sanitized}`,
    placeholder: false,
  }));
}
