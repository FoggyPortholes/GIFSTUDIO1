import { describe, expect, it } from 'vitest';

import type { SpriteTemplate } from './sprite-template';
import {
  computeSpriteSheetSize,
  createSpriteSheet,
  loadSpriteTemplateFile,
} from './sprite-template';

describe('sprite template helpers', () => {
  it('loads and normalizes template JSON', async () => {
    const file = new File(
      [
        JSON.stringify({
          name: 'WalkCycle',
          frameWidth: 64,
          frameHeight: 48,
          columns: 5,
          rows: 3,
          spacing: 2.4,
          margin: 4.2,
          background: '#111827',
          fitMode: 'cover',
        }),
      ],
      'walk-cycle.json',
      { type: 'application/json' }
    );

    const template = await loadSpriteTemplateFile(file);

    expect(template.name).toBe('WalkCycle');
    expect(template.frameWidth).toBe(64);
    expect(template.frameHeight).toBe(48);
    expect(template.columns).toBe(5);
    expect(template.rows).toBe(3);
    expect(template.spacing).toBe(2);
    expect(template.margin).toBe(4);
    expect(template.background).toBe('#111827');
    expect(template.fitMode).toBe('cover');
    expect(template.sourceName).toBe('walk-cycle.json');
  });

  it('throws when required fields are missing', async () => {
    const file = new File([JSON.stringify({ frameWidth: 32 })], 'invalid.json', {
      type: 'application/json',
    });

    await expect(loadSpriteTemplateFile(file)).rejects.toThrow('frameHeight');
  });

  it('computes sprite sheet size from template', () => {
    const template: SpriteTemplate = {
      frameWidth: 32,
      frameHeight: 32,
      columns: 4,
      rows: 2,
      spacing: 1,
      margin: 2,
      background: '#000',
      fitMode: 'contain',
    };

    const metrics = computeSpriteSheetSize(template);

    expect(metrics.width).toBe(4 * 32 + 3 * 1 + 4); // columns * width + spacing gaps + margins
    expect(metrics.height).toBe(2 * 32 + 1 * 1 + 4);
    expect(metrics.capacity).toBe(8);
  });

  it('refuses to render when more frames are provided than template capacity', async () => {
    const template: SpriteTemplate = {
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 2,
      spacing: 0,
      margin: 0,
      background: 'transparent',
      fitMode: 'contain',
    };

    const stubFile = new File([], 'frame.png', { type: 'image/png' });
    const frames = Array.from({ length: 5 }, (_, index) => ({
      id: `frame-${index}`,
      name: `Frame ${index}`,
      url: '',
      width: 32,
      height: 32,
      file: stubFile,
    }));

    await expect(createSpriteSheet(frames, template)).rejects.toThrow('fit 4 frame');
  });

  it('requires at least one frame before exporting', async () => {
    const template: SpriteTemplate = {
      frameWidth: 16,
      frameHeight: 16,
      columns: 1,
      rows: 1,
      spacing: 0,
      margin: 0,
      background: 'transparent',
      fitMode: 'contain',
    };

    await expect(createSpriteSheet([], template)).rejects.toThrow('Add frames');
  });
});
