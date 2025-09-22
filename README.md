# GIF Studio (Offline Edition)

GIF Studio ships fully offline. Local character layers, stub AI frames, and the GIF builder all work without
network access or API keys. Real AI providers remain optional enhancements for connected environments.

## Launching

```bash
node scripts/launch.js
```

The launcher detects the bundled `node-portable/` runtime when present, installs dependencies if needed, and starts
Vite. To ensure the client stays offline, either keep `.env` set to `OFFLINE_MODE=true` (default) or prefix the command:

```bash
OFFLINE_MODE=true npm run dev
```

On Windows PowerShell you can run `Set-Content .env 'OFFLINE_MODE=true'` once and reuse it.

## Offline Character Creator

- Local assets live under `public/assets/characters/` with a manifest describing bodies, heads, and outfits.
- The **Character Creator** (see `src/components/CharacterCreator/`) lets you mix parts, preview the layered canvas,
  and export the composite directly to the GIF builder.
- Stub AI frames reside in `public/stubs/` for quick filler or testing and are used automatically when the app detects
  offline mode or missing credentials.

## GIF Builder

The updated builder accepts:

- Exports from the Character Creator
- Drag-and-drop PNG/JPG uploads
- Generated stub frames

You can reorder frames, tweak the delay slider, toggle looping, and export either the animated GIF or a PNG sequence.
All encoding happens client-side/offline using `gifenc`.

## Testing & Tooling

```bash
npm install
npm run typecheck
npm run test           # Vitest (offline guard enabled)
npm run test:gif       # Rebuilds public/animation.gif from stub assets
npm run build
```

`tests/setup.ts` blocks accidental outbound HTTP(S) calls so suites fail fast if code tries to hit the network.
`synth-gif-runner.cjs` generates `public/animation.gif` from the stub PNGs and asserts consistent metadata.

## Optional AI Providers

When credentials are supplied (`VITE_OPENAI_API_KEY`, `VITE_STABILITY_API_KEY`, `VITE_AUTOMATIC1111_URL`, etc.), the
provider hooks can be re-enabled by turning `OFFLINE_MODE` off. Without keys—or with `OFFLINE_MODE=true`—the app stays
strictly local and uses stubbed imagery.

## Repository Layout

- `public/assets/` – Local character parts and manifest
- `public/stubs/` – Sample frames used by stub provider + tests
- `src/components/CharacterCreator/` – Offline character builder
- `src/components/GifBuilder.tsx` – Enhanced drag/drop GIF pipeline
- `scripts/launch.js` – Cross-platform launcher (replaces platform-specific scripts)
- `tests/` – Offline-aware unit tests + synthetic GIF generator

Happy offline animating!
