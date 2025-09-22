# GIF Studio

A fresh, from-scratch rebuild of GIF Studio focused on a streamlined, entirely client-side animation workflow. Upload stills,
organise their order, preview timing, and export polished GIFs without any backend services.

## Features

- **Drag & drop uploads** for PNG, JPG, WEBP, and GIF assets (first frame rendered for GIFs).
- **Timeline management** with thumbnail previews, quick reordering, and one-click removal.
- **Live playback preview** with adjustable frame delay and loop control.
- **Configurable export** canvas (size, background colour, and fit mode) powered by [`gifenc`](https://github.com/mattdesl/gifenc).
- **Offline-first** – all processing happens locally in the browser.

## Getting Started

Install dependencies once and launch the Vite dev server:

```bash
npm install
npm run dev
```

> **Note:** The `npm run dev` helper checks your local Node.js version. If it is older than 18 it
> automatically falls back to the bundled `node-portable` runtime (Node 20) so Windows users can
> start the app without adjusting their global installation. If you would rather opt-in manually,
> run `node scripts/launch.js dev:vite`.

Build production assets with:

```bash
npm run build
```

## Quality Checks

Run the lint and TypeScript suites to keep the project healthy:

```bash
npm run lint
npm run typecheck
```

## Project Structure

- `src/App.tsx` – application shell, state management, and feature orchestration.
- `src/components/` – reusable UI components for uploading, timeline management, preview, and exporting.
- `src/lib/` – helper utilities for ID generation, frame loading, geometry calculations, and GIF encoding.
- `src/types/` – shared TypeScript types and lightweight ambient declarations.
- `public/` – static assets served by Vite.

Happy animating!
