# GIF Studio 2.0

A rebuilt-from-scratch, client-only GIF workshop. Import still images, curate a timeline, tweak
playback, and export a polished looping GIF without touching a backend.

## Highlights

- **Resilient ingestion** – drag & drop PNG, JPG, WEBP, or GIF files with friendly error handling.
- **Context-first timeline** – reorder frames inline, inspect dimensions, and clear sequences in one tap.
- **Deterministic preview** – live playback controls with loop toggles and duration insights.
- **Powerful export** – configure canvas size, fit mode, and background before encoding with
  [`gifenc`](https://github.com/mattdesl/gifenc).
- **Lessons captured** – baked-in reflection panel summarising improvements and takeaways.

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
```

Run `npm run simulate` locally before shipping large changes to execute the full toolchain.

## Project structure

- `src/features/` – feature-scoped UI and state (studio provider, uploader, timeline, preview, export,
  review).
- `src/lib/` – utilities for IDs, frame ingestion, geometry helpers, and GIF encoding.
- `src/types/` – shared TypeScript models and ambient declarations.
- `public/` – static assets served directly by Vite.

Happy animating!
